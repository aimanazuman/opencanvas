from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.serializers import sanitize_text
from apps.boards.access import can_edit_board
from .models import File
from .security import (
    KIND_FILE, KIND_FILE_THUMB, safe_display_name, sniff_upload, signed_media_url,
)

MEDIA_REF_PREFIX = 'ocmedia:'


def media_ref(field_file):
    """The stable reference that is stored inside board content (it never expires; the browser exchanges it for a
    short-lived signed URL through POST /api/files/resolve/)."""
    if field_file and field_file.name:
        return MEDIA_REF_PREFIX + field_file.name
    return None


class FileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    url = serializers.SerializerMethodField()
    ref = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    size_mb = serializers.SerializerMethodField()
    name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    class Meta:
        model = File
        fields = ['id', 'name', 'file', 'url', 'ref', 'file_type', 'file_size', 'size_mb', 'mime_type',
                  'thumbnail', 'uploaded_by', 'uploaded_by_name', 'board', 'is_deleted', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'file_type', 'file_size', 'mime_type', 'thumbnail', 'is_deleted',
                            'created_at']
        extra_kwargs = {'file': {'write_only': True}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # After upload only the display name can change: the stored file and the board it belongs to are fixed.
        if self.instance is not None and not isinstance(self.instance, (list, tuple)) and hasattr(self.instance, 'pk'):
            for field_name in ('file', 'board'):
                if field_name in self.fields:
                    self.fields[field_name].read_only = True

    def _signed(self, obj, kind, field_file):
        if not field_file:
            return None
        request = self.context.get('request')
        user_id = request.user.id if request is not None and request.user.is_authenticated else None
        return signed_media_url(request, kind, obj.id, user_id)

    def get_url(self, obj):
        return self._signed(obj, KIND_FILE, obj.file)

    def get_ref(self, obj):
        return media_ref(obj.file)

    def get_thumbnail(self, obj):
        return self._signed(obj, KIND_FILE_THUMB, obj.thumbnail)

    def get_size_mb(self, obj):
        return obj.size_mb

    def validate_name(self, value):
        value = safe_display_name(sanitize_text(value))
        return value

    def validate_file(self, value):
        if value.size > settings.MAX_UPLOAD_SIZE:
            limit_mb = settings.MAX_UPLOAD_SIZE // (1024 * 1024)
            raise serializers.ValidationError(
                f"File size cannot exceed {limit_mb}MB. Your file is {round(value.size / (1024 * 1024), 2)}MB.")
        try:
            self._sniffed = sniff_upload(value, value.name)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_board(self, value):
        if value is None:
            return value
        request = self.context.get('request')
        if request is None or not can_edit_board(request.user, value):
            raise serializers.ValidationError('You cannot attach files to that board.')
        if value.is_archived:
            raise serializers.ValidationError('You cannot attach files to an archived board.')
        return value

    def create(self, validated_data):
        file_obj = validated_data.get('file')
        ext, mime, file_type = self._sniffed

        # Auto-populate the display name from the uploaded file if not provided
        if not validated_data.get('name') and file_obj:
            validated_data['name'] = safe_display_name(sanitize_text(file_obj.name))

        # The server decides size, MIME type and category; the client's content type is never used.
        validated_data['file_size'] = file_obj.size
        validated_data['mime_type'] = mime
        validated_data['file_type'] = file_type

        # NOTE: user.storage_used is charged in FileViewSet.perform_create() inside the same transaction.
        return super().create(validated_data)
