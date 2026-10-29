FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.lock .
RUN pip install --no-cache-dir --root-user-action=ignore -r requirements.lock \
    && groupadd -r portcommand && useradd -r -g portcommand portcommand \
    && mkdir -p /var/lib/celery && chown -R portcommand:portcommand /var/lib/celery /app
COPY --chown=portcommand:portcommand . .
USER portcommand
EXPOSE 8000
