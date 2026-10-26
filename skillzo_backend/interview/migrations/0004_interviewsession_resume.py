# Generated manually for resume reference on InterviewSession

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('interview', '0003_interviewanswer_cloud_audio_url_and_more'),
        ('resume_analysis', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='interviewsession',
            name='resume',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='interview_sessions',
                to='resume_analysis.resume',
            ),
        ),
    ]
