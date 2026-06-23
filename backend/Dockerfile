# backend/Dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


COPY requirements.txt .
RUN pip install --no-cache-dir \
--default-timeout=1000 \
--retries 5 \
-r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]