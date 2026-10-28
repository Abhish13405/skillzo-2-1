# Generated manually for bonus_credited tracking on InterviewSession

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('interview', '0004_interviewsession_resume'),
    ]

    operations = [
        migrations.AddField(
            model_name='interviewsession',
            name='bonus_credited',
            field=models.BooleanField(default=False),
        ),
    ]
