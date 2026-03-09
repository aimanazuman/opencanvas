from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('boards', '0003_board_content_size'),
    ]

    operations = [
        migrations.AlterField(
            model_name='boardshare',
            name='permission',
            field=models.CharField(
                choices=[('view', 'View Only'), ('comment', 'Can Comment'), ('edit', 'Can Edit')],
                default='view',
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name='boardinvitelink',
            name='permission',
            field=models.CharField(
                choices=[('view', 'View Only'), ('comment', 'Can Comment'), ('edit', 'Can Edit')],
                default='view',
                max_length=10,
            ),
        ),
    ]
