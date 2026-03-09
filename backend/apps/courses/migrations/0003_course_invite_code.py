import uuid
from django.db import migrations, models


def generate_unique_code():
    return uuid.uuid4().hex[:8].upper()


def generate_invite_codes(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    for course in Course.objects.all():
        course.invite_code = generate_unique_code()
        course.save(update_fields=['invite_code'])


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_course_sections'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='invite_code',
            field=models.CharField(max_length=20, default='TEMP0000', unique=False),
            preserve_default=False,
        ),
        migrations.RunPython(generate_invite_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='course',
            name='invite_code',
            field=models.CharField(max_length=20, unique=True),
        ),
    ]
