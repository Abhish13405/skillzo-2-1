#!/usr/bin/env bash
# exit on error
set -o errexit

if [ -d "skillzo_backend" ]; then
  cd skillzo_backend
fi

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py setup_admin
