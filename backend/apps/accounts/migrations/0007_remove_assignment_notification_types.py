from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_alter_notification_type'),
    ]

    operations = [
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
                ],
                max_length=30,
            ),
        ),
    ]
