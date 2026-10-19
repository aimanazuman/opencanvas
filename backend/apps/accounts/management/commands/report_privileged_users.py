from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'Print every user with the role admin or lecturer (plus Django staff/superuser flags), with date joined and '
        'last login, so the list can be reviewed for accounts nobody recognises. Read-only: it changes nothing.'
    )

    def handle(self, *args, **options):
        User = get_user_model()
        users = (
            User.objects.filter(role__in=['admin', 'lecturer'])
            | User.objects.filter(is_staff=True)
            | User.objects.filter(is_superuser=True)
        ).distinct().order_by('role', 'date_joined')

        header = '%-6s %-10s %-24s %-32s %-5s %-5s %-6s %-20s %-20s' % (
            'ID', 'ROLE', 'USERNAME', 'EMAIL', 'VERIF', 'STAFF', 'ACTIVE', 'DATE JOINED', 'LAST LOGIN')
        self.stdout.write(header)
        self.stdout.write('-' * len(header))
        count = 0
        for user in users.iterator():
            count += 1
            joined = user.date_joined.strftime('%Y-%m-%d %H:%M') if user.date_joined else '-'
            last = user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'never'
            flags = 'yes' if (user.is_staff or user.is_superuser) else 'no'
            self.stdout.write('%-6s %-10s %-24s %-32s %-5s %-5s %-6s %-20s %-20s' % (
                user.id, user.role, user.username[:24], (user.email or '-')[:32],
                'yes' if user.email_verified else 'no', flags, 'yes' if user.is_active else 'no', joined, last))
        self.stdout.write('')
        self.stdout.write('%d privileged user(s). Nothing was modified.' % count)
