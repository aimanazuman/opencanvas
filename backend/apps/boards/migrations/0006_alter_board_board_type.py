from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('boards', '0005_board_section'),
    ]

    operations = [
        migrations.AlterField(
            model_name='board',
            name='board_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('course-material', 'Course Material'),
                    ('student-notes', 'Student Notes'),
                    ('study-planner', 'Study Planner'),
                    ('kanban', 'Kanban'),
                    ('quiz', 'Quiz'),
                ],
                default='course-material',
                max_length=20,
            ),
        ),
    ]
