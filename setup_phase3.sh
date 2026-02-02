#!/bin/bash

# Phase 3 Setup Script - Environnement Hybride Complet
# Prépare tout pour lancer docker-compose avec monitoring

set -e

echo "=================================="
echo "🚀 PHASE 3 - SETUP COMPLET"
echo "=================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================
# 1. Vérifier les prérequis
# ============================================================
log_info "Vérification des prérequis..."

if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas installé"
    exit 1
fi

log_info "✅ Docker et Docker Compose trouvés"

# ============================================================
# 2. Créer la structure des répertoires
# ============================================================
log_info "Création de la structure des répertoires..."

directories=(
    "logs/cloud"
    "logs/on-premise"
    "logs/generated"
    "logs/attacks"
    "logs/fluentd"
    "logs/backend"
    "logs/aggregated/cloud"
    "logs/aggregated/onpremise"
    "logs/aggregated/generated"
    "logs/aggregated/attacks"
    "logs/aggregated/backend"
    "logs/aggregated/suspicious"
    "config"
    "monitoring/grafana/provisioning/datasources"
    "monitoring/grafana/provisioning/dashboards"
    "fluentd"
    "test_results"
    "backend/blockchain_logs"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done

log_info "✅ Répertoires créés"

# ============================================================
# 3. Créer les fichiers de configuration
# ============================================================
log_info "Création des fichiers de configuration..."

# Nginx config
cat > config/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    server {
        listen 80;
        server_name localhost;

        location / {
            root /usr/share/nginx/html;
            index index.html;
        }

        location /api {
            proxy_pass http://backend:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF

log_info "✅ Config Nginx créée"

# Postgres init script
cat > config/postgres-init.sql << 'EOF'
-- Initialisation base de données PostgreSQL
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50),
    log_text TEXT,
    is_anomaly BOOLEAN,
    criticality VARCHAR(20),
    actions TEXT[]
);

CREATE TABLE IF NOT EXISTS analysis_history (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_hash VARCHAR(64),
    analysis_result JSON
);

CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX idx_security_logs_anomaly ON security_logs(is_anomaly);
EOF

log_info "✅ Script d'initialisation PostgreSQL créé"

# ============================================================
# 4. Créer les Dockerfiles manquants
# ============================================================
log_info "Création des Dockerfiles..."

# Backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    git \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 5000

CMD ["python", "app.py"]
EOF

# Frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/*.config.js ./
COPY frontend/index.html ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
EOF

# Attack scripts Dockerfile
cat > attack-scripts/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install requests

COPY attack-scripts/ .

CMD ["python", "attack_simulator.py"]
EOF

# Log generator Dockerfile
cat > log-generator/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

RUN mkdir -p /app/logs

COPY log-generator/generate_logs.py .

CMD ["python", "generate_logs.py"]
EOF

# Fluentd Dockerfile
cat > fluentd/Dockerfile << 'EOF'
FROM fluent/fluentd:v1.16-1

USER root

RUN fluent-gem install fluent-plugin-rewrite-tag-filter \
    fluent-gem install fluent-plugin-detect-exceptions

COPY fluentd/fluent.conf /fluentd/etc/fluent.conf

USER fluent
EOF

log_info "✅ Dockerfiles créés"

# ============================================================
# 5. Copier la config Fluentd
# ============================================================
log_info "Configuration de Fluentd..."

cat > fluentd/fluent.conf << 'FLUENTD_EOF'
# Fluentd Configuration - Phase 3

<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /fluentd/log/nginx.log.pos
  tag cloud.nginx.access
  <parse>
    @type nginx
  </parse>
</source>

<source>
  @type tail
  path /var/log/nginx/error.log
  pos_file /fluentd/log/nginx-error.log.pos
  tag cloud.nginx.error
  <parse>
    @type multiline
    format_firstline /^\d{4}\/\d{2}\/\d{2}/
    format1 /^(?<time>\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(?<level>\w+)\] (?<message>.*)$/
    time_format %Y/%m/%d %H:%M:%S
  </parse>
</source>

<filter cloud.**>
  @type record_modifier
  <record>
    source cloud
  </record>
</filter>

<match cloud.**>
  @type file
  path /fluentd/aggregated/cloud/%Y%m%d/logs.%H.log
  <buffer time,tag>
    @type file
    timekey 3600
    path /fluentd/log/buffer/cloud
  </buffer>
  <format>
    @type json
  </format>
</match>

<match **>
  @type stdout
</match>
FLUENTD_EOF

log_info "✅ Fluentd configuré"

# ============================================================
# 6. Copier docker-compose.yml
# ============================================================
log_info "Installation de docker-compose.yml..."

if [ ! -f "docker-compose.yml" ]; then
    cp docker-compose-phase3.yml docker-compose.yml 2>/dev/null || \
    log_warn "docker-compose-phase3.yml non trouvé, veuillez le copier manuellement"
fi

log_info "✅ docker-compose.yml prêt"

# ============================================================
# 7. Vérifier les fichiers essentiels
# ============================================================
log_info "Vérification des fichiers essentiels..."

essential_files=(
    "docker-compose.yml"
    "backend/app.py"
    "frontend/src/App.jsx"
    "log-generator/generate_logs.py"
    "attack-scripts/attack_simulator.py"
)

for file in "${essential_files[@]}"; do
    if [ ! -f "$file" ]; then
        log_warn "⚠️  Fichier manquant: $file"
    else
        log_info "✅ $file trouvé"
    fi
done

# ============================================================
# 8. Pré-création des images (optionnel)
# ============================================================
log_info "Construction des images Docker..."

docker-compose build --no-cache 2>/dev/null || \
log_warn "Certaines images ne peuvent pas être construites hors ligne"

# ============================================================
# 9. Afficher les instructions finales
# ============================================================
echo ""
echo "=================================="
echo "✅ SETUP COMPLET!"
echo "=================================="
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Lancer l'environnement hybride:"
echo "   ${GREEN}docker-compose up -d${NC}"
echo ""
echo "2. Vérifier que tous les services sont actifs:"
echo "   ${GREEN}docker-compose ps${NC}"
echo ""
echo "3. Accéder aux services:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend API: http://localhost:5000"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3000 (admin/admin2026)"
echo ""
echo "4. Lancer les tests (une fois les services actifs):"
echo "   ${GREEN}python3 test_scenarios.py${NC}"
echo ""
echo "5. Afficher les logs:"
echo "   ${GREEN}docker-compose logs -f backend${NC}"
echo ""
echo "6. Arrêter l'environnement:"
echo "   ${GREEN}docker-compose down -v${NC}"
echo ""
echo "=================================="
