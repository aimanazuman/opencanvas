from django.db import migrations, models


def set_existing_users_verified(apps, schema_editor):
    """Mark all pre-existing users as email-verified so they aren't locked out."""
    User = apps.get_model('accounts', 'User')
    User.objects.all().update(email_verified=True)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_user_guest_expires_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_verified',
            field=models.BooleanField(default=False, help_text='Whether the user has verified their email address'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_verification_token',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.RunPython(set_existing_users_verified, migrations.RunPython.noop),
    ]
