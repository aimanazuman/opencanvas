import json
import re

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.boards.models import Board, BoardVersion
from apps.files.models import File
from apps.files.storage import storage_truth_for_user

User = get_user_model()

# Board content refers to an upload as "ocmedia:uploads/<name>" or as an old public URL ending in "/media/uploads/<name>".
# Matching the bare "uploads/<name>" text finds both forms and is deliberately loose, so it can only hide an orphan,
# never invent one.
REFERENCE_RE = re.compile(r'uploads/[0-9A-Za-z_\-]+(?:\.[0-9A-Za-z]+)?')
# The names the upload code produces. Anything else is skipped by the orphan report.
STORED_NAME_RE = re.compile(r'uploads/[0-9a-f]{32}(?:\.[0-9a-z]+)?')


class Command(BaseCommand):
    help = (
        'Recalculate every user\'s storage_used from the rows (live files they uploaded plus the content of the boards '
        'they own, archived boards excluded). Dry run by default: it prints the users whose stored value differs, with '
        'old, new and delta. --apply writes the corrected values, one locked transaction per user. '
        '--report-orphans also LISTS board-attached files that no board content or version refers to. Nothing is '
        'ever deleted.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true',
                            help='Write the recalculated values. Without this flag nothing is changed.')
        parser.add_argument('--report-orphans', action='store_true',
                            help='List possible orphan uploads (never deletes them).')

    def handle(self, *args, **options):
        rows = list(User.objects.order_by('id').values_list('id', 'username', 'storage_used'))
        drifted = []
        for user_id, username, stored in rows:
            truth = storage_truth_for_user(user_id)
            if truth != stored:
                drifted.append((user_id, username, stored, truth))

        self._print_table(drifted)
        self.stdout.write('%d of %d user(s) have a stored value that differs from the rows.' % (len(drifted), len(rows)))

        if options['apply']:
            changed = self._apply([user_id for user_id, _, _, _ in drifted])
            self.stdout.write('Applied: %d user(s) updated.' % len(changed))
        elif drifted:
            self.stdout.write('Dry run: nothing was changed. Run again with --apply to write these values.')

        if options['report_orphans']:
            self._report_orphans()

    def _print_table(self, drifted):
        if not drifted:
            self.stdout.write('No differences: every stored storage_used matches the rows.')
            return
        header = '%-8s %-24s %18s %18s %18s' % ('ID', 'USERNAME', 'OLD (stored)', 'NEW (recalc)', 'DELTA')
        self.stdout.write(header)
        self.stdout.write('-' * len(header))
        for user_id, username, old, new in drifted:
            self.stdout.write('%-8s %-24s %18d %18d %+18d' % (user_id, username[:24], old, new, new - old))

    def _apply(self, user_ids):
        """Set each user's storage_used to a value recomputed while that user's row is locked, so a concurrent upload
        cannot be overwritten. Returns [(user_id, old, new)] for the users that changed."""
        changed = []
        for user_id in user_ids:
            with transaction.atomic():
                locked = User.objects.select_for_update().filter(pk=user_id).first()
                if locked is None:  # deleted since the dry run
                    continue
                truth = storage_truth_for_user(user_id)
                if truth != locked.storage_used:
                    User.objects.filter(pk=user_id).update(storage_used=truth)
                    changed.append((user_id, locked.storage_used, truth))
        for user_id, old, new in changed:
            self.stdout.write('  user %s: %d -> %d' % (user_id, old, new))
        return changed

    def _report_orphans(self):
        referenced = set()
        for content in Board.objects.values_list('content', flat=True).iterator():
            referenced.update(REFERENCE_RE.findall(json.dumps(content)))
        for content in BoardVersion.objects.values_list('content', flat=True).iterator():
            referenced.update(REFERENCE_RE.findall(json.dumps(content)))

        # Only files attached to a board are checked. Library files without a board are kept on purpose.
        candidates = File.objects.filter(is_deleted=False, board__isnull=False).select_related(
            'uploaded_by').order_by('id')
        orphans = [f for f in candidates
                   if STORED_NAME_RE.fullmatch(f.file.name or '') and f.file.name not in referenced]

        self.stdout.write('')
        self.stdout.write('Possible orphan uploads (board files that no board content or version refers to): %d'
                          % len(orphans))
        if orphans:
            header = '%-8s %-8s %-24s %14s %-10s %s' % ('FILE ID', 'BOARD', 'UPLOADED BY', 'BYTES', 'CREATED', 'STORED NAME')
            self.stdout.write(header)
            self.stdout.write('-' * len(header))
            for f in orphans:
                self.stdout.write('%-8s %-8s %-24s %14d %-10s %s' % (
                    f.id, f.board_id, f.uploaded_by.username[:24], f.file_size,
                    f.created_at.strftime('%Y-%m-%d'), f.file.name))
        self.stdout.write('Listing only: nothing was deleted. A file counts as referenced when its stored name appears in '
                          'the content or a version of any board. References written in any other form would make a file '
                          'look like an orphan, so check each file before you remove anything.')
