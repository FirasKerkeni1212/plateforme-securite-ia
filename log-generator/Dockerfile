FROM python:3.11-slim

RUN adduser --disabled-password --gecos '' --no-create-home appuser

RUN mkdir -p /app/logs && chown appuser:appuser /app/logs

WORKDIR /app

COPY generate_logs.py .

USER appuser

CMD ["python", "generate_logs.py"]