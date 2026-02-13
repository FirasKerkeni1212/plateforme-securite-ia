import os
import time
import traceback
import re
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# =========================
# Initialisation Flask
# =========================
app = Flask(__name__)

# =========================
# CORS – adapté à ton frontend
# =========================
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://frontend-service:5173",
            "http://frontend:5173",
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# =========================
# Métriques Prometheus
# =========================
# Compteur de requêtes HTTP
HTTP_REQUESTS_TOTAL = Counter(
    'http_requests_total',
    'Nombre total de requêtes HTTP',
    ['method', 'endpoint', 'status']
)

# Histogramme de durée des requêtes (en secondes)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    'http_request_duration_seconds',
    'Durée des requêtes HTTP en secondes',
    ['method', 'endpoint']
)

# Compteur d'attaques SSH détectées
SSH_LOGIN_ATTEMPTS_TOTAL = Counter(
    'ssh_login_attempts_total',
    'Tentatives de connexion SSH échouées',
    ['status', 'ip_source']
)

# Compteur d'anomalies détectées
ANOMALY_DETECTION_TOTAL = Counter(
    'anomaly_detection_total',
    'Nombre total d\'anomalies détectées',
    ['criticality', 'type']
)

# Compteur d'erreurs API
API_ERRORS_TOTAL = Counter(
    'api_errors_total',
    'Nombre total d\'erreurs API',
    ['endpoint', 'error_type']
)

# Compteur de logs analysés
LOGS_ANALYZED_TOTAL = Counter(
    'logs_analyzed_total',
    'Nombre total de logs analysés',
    ['result']
)


# =========================
# Middleware pour mesurer le temps de réponse
# =========================
@app.before_request
def before_request():
    """Démarre le timer avant chaque requête"""
    request.start_time = time.time()


@app.after_request
def after_request(response):
    """Enregistre les métriques après chaque requête"""
    if hasattr(request, 'start_time'):
        duration = time.time() - request.start_time
        
        # Enregistre la durée de la requête
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            endpoint=request.path
        ).observe(duration)
        
        # Enregistre le compteur de requêtes
        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=request.path,
            status=response.status_code
        ).inc()
    
    return response


# =========================
# Route des métriques Prometheus
# =========================
@app.route('/metrics')
def metrics():
    """Endpoint pour exposer les métriques Prometheus"""
    return Response(
        generate_latest(),
        mimetype=CONTENT_TYPE_LATEST,
        status=200
    )


# =========================
# Routes de base / health
# =========================
@app.route("/")
def home():
    return jsonify({
        "message": "Plateforme Sécurité IA – Backend actif",
        "status": "READY",
        "version": "Phase 3",
        "metrics": "http://localhost:5000/metrics"
    }), 200


@app.route("/health")
@app.route("/ready")
def health():
    return jsonify({
        "status": "healthy",
        "service": "backend",
        "mode": "Avec métriques Prometheus",
        "metrics_endpoint": "/metrics"
    }), 200


# =========================
# Endpoint principal d'analyse
# =========================
@app.route("/api/analyze", methods=["POST", "OPTIONS"])
def analyze():
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    try:
        data = request.get_json(silent=True)

        if not data or "log" not in data:
            API_ERRORS_TOTAL.labels(
                endpoint="/api/analyze",
                error_type="missing_field"
            ).inc()
            return jsonify({"error": "Champ 'log' manquant"}), 400

        if not isinstance(data["log"], str) or len(data["log"].strip()) == 0:
            API_ERRORS_TOTAL.labels(
                endpoint="/api/analyze",
                error_type="invalid_input"
            ).inc()
            return jsonify({"error": "Le champ 'log' doit être une chaîne non vide"}), 400

        log_text = data["log"]
        
        # Analyse simple sans Ollama (test mode)
        result = analyze_log_simple(log_text)
        
        # Enregistre les métriques
        LOGS_ANALYZED_TOTAL.labels(
            result="anomaly" if result["is_anomaly"] else "normal"
        ).inc()
        
        if result["is_anomaly"]:
            ANOMALY_DETECTION_TOTAL.labels(
                criticality=result["criticality"],
                type="log_analysis"
            ).inc()
        
        return jsonify({
            "success": True,
            "result": result
        }), 200

    except Exception as e:
        print("❌ ERREUR dans /api/analyze")
        traceback.print_exc()
        
        API_ERRORS_TOTAL.labels(
            endpoint="/api/analyze",
            error_type="internal_error"
        ).inc()
        
        return jsonify({
            "error": "Erreur lors de l'analyse",
            "details": str(e)
        }), 500


# =========================
# Analyse simple (sans Ollama)
# =========================
def analyze_log_simple(log_text: str) -> dict:
    """
    Analyse basique des logs sans LLM Ollama
    Détecte les patterns d'anomalies connus
    """
    log_lower = log_text.lower()
    
    # Détection simple de patterns malveillants
    suspicious_keywords = [
        "failed password",
        "invalid user",
        "brute force",
        "port scan",
        "sql injection",
        "denied",
        "refused",
        "attack",
        "error",
        "critical"
    ]
    
    is_anomaly = any(keyword in log_lower for keyword in suspicious_keywords)
    
    # Détermine la criticité
    if "critical" in log_lower or "attack" in log_lower:
        criticality = "critique"
    elif "failed password" in log_lower or "invalid user" in log_lower:
        criticality = "haute"
        
        # Enregistre les tentatives SSH échouées
        SSH_LOGIN_ATTEMPTS_TOTAL.labels(
            status="failed",
            ip_source=extract_ip_from_log(log_text)
        ).inc()
        
    elif "error" in log_lower or "denied" in log_lower:
        criticality = "moyenne"
    else:
        criticality = "basse"
    
    # Actions suggérées
    actions = []
    if "failed password" in log_lower or "invalid user" in log_lower:
        actions.append("Bloquer l'IP source")
        actions.append("Activer fail2ban")
        actions.append("Augmenter le délai SSH")
    elif "port scan" in log_lower:
        actions.append("Bloquer l'IP source")
        actions.append("Alerter le SOC")
    
    return {
        "log": log_text[:200],
        "is_anomaly": is_anomaly,
        "confidence": 0.85,
        "criticality": criticality,
        "actions": actions,
        "summary": f"Log {'anomalique' if is_anomaly else 'normal'} avec criticité {criticality}",
        "blockchain_recorded": False,
        "mode": "Simple detection (no LLM)"
    }


# =========================
# Fonction utilitaire pour extraire l'IP
# =========================
def extract_ip_from_log(log_text: str) -> str:
    """
    Extrait l'adresse IP source d'un log SSH
    Ex: "from 91.200.12.74" → "91.200.12.74"
    """
    match = re.search(r'from\s+([\d\.]+)', log_text)
    if match:
        return match.group(1)
    return "unknown"


# =========================
# Lancement serveur
# =========================
if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    
    print(f"🚀 Démarrage Flask – debug = {debug_mode}")
    print(f"📊 Mode: Analyse simple avec métriques Prometheus")
    print(f"🌐 Port: 5000")
    print(f"📈 Métriques: http://localhost:5000/metrics")
    
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=debug_mode,
        use_reloader=False
    )