FROM python:3.11-slim

WORKDIR /app

RUN mkdir -p /app/logs

COPY generate_logs.py .

CMD ["python", "generate_logs.py"]
