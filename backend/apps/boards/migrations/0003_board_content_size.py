from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('boards', '0002_board_board_type_boardinvitelink'),
    ]

    operations = [
        migrations.AddField(
            model_name='board',
            name='content_size',
            field=models.BigIntegerField(default=0),
        ),
    ]
