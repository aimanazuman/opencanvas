from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('boards', '0004_alter_boardshare_permission_alter_boardinvitelink_permission'),
    ]

    operations = [
        migrations.AddField(
            model_name='board',
            name='section',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
