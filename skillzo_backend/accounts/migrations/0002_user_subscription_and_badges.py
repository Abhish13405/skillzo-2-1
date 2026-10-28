# Generated manually for subscription, bonus interviews, and badges

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_subscribed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='subscription_plan',
            field=models.CharField(default='free', max_length=50),
        ),
        migrations.AddField(
            model_name='user',
            name='bonus_interviews',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='user',
            name='earned_badges',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
