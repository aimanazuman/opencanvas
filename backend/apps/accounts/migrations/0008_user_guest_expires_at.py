from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_remove_assignment_notification_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='guest_expires_at',
            field=models.DateTimeField(blank=True, help_text='When this guest account will be auto-deleted', null=True),
        ),
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('board_shared', 'Board Shared'),
                    ('course_enrolled', 'Course Enrolled'),
                    ('system_announcement', 'System Announcement'),
                    ('invite_accepted', 'Invite Accepted'),
                    ('quota_changed', 'Quota Changed'),
                    ('storage_warning', 'Storage Warning'),
                    ('guest_account_expiry', 'Guest Account Expiry'),
                ],
                max_length=30,
            ),
        ),
    ]
