FROM python:3.11-slim

RUN adduser --disabled-password --gecos '' --no-create-home appuser

RUN mkdir -p /app/logs && chown appuser:appuser /app/logs

WORKDIR /app

COPY attack_simulator.py .

RUN pip install --no-cache-dir requests

USER appuser

CMD ["python", "attack_simulator.py"]