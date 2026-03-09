from rest_framework import serializers
from .models import File
import os
import mimetypes


class FileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    url = serializers.SerializerMethodField()
    size_mb = serializers.SerializerMethodField()
    name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = File
        fields = ['id', 'name', 'file', 'url', 'file_type', 'file_size', 'size_mb', 'mime_type',
                  'thumbnail', 'uploaded_by', 'uploaded_by_name', 'board', 'is_deleted', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'file_type', 'file_size', 'mime_type', 'created_at']

    def get_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

    def get_size_mb(self, obj):
        return obj.size_mb

    def validate_file(self, value):
        # Validate file size (50MB max)
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError(f"File size cannot exceed 50MB. Your file is {round(value.size / (1024*1024), 2)}MB.")

        # Check user's storage quota (respects system-wide limit)
        request = self.context.get('request')
        if request and request.user:
            from apps.files.storage import check_quota
            ok, _ = check_quota(request.user, value.size)
            if not ok:
                raise serializers.ValidationError("Storage quota exceeded. Please delete some files or contact admin.")

        return value

    def create(self, validated_data):
        file_obj = validated_data.get('file')

        # Auto-populate name from uploaded file if not provided
        if not validated_data.get('name') and file_obj:
            validated_data['name'] = file_obj.name

        # Set file metadata
        if file_obj:
            validated_data['file_size'] = file_obj.size
            validated_data['mime_type'] = file_obj.content_type or mimetypes.guess_type(file_obj.name)[0] or 'application/octet-stream'

            # Determine file type
            mime_type = validated_data['mime_type']
            if mime_type.startswith('image/'):
                validated_data['file_type'] = 'image'
            elif mime_type.startswith('video/'):
                validated_data['file_type'] = 'video'
            elif mime_type in ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
                validated_data['file_type'] = 'document'
            else:
                validated_data['file_type'] = 'other'

        file_instance = super().create(validated_data)

        # NOTE: user.storage_used is updated in FileViewSet.perform_create()
        # Do NOT update it here to avoid double-counting

        return file_instance
