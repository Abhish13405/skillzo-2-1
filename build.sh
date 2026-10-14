#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

if [ -d "skillzo_backend" ]; then
  cd skillzo_backend
  pip install -r requirements.txt
fi

python manage.py collectstatic --noinput
python manage.py migrate
python manage.py setup_admin || true

