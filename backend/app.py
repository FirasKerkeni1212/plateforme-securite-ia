import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS

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
# Routes de base / health
# =========================
@app.route("/")
def home():
    return jsonify({
        "message": "Plateforme Sécurité IA – Backend actif",
        "status": "READY",
        "version": "Phase 3"
    }), 200


@app.route("/health")
@app.route("/ready")
def health():
    return jsonify({
        "status": "healthy",
        "service": "backend",
        "mode": "Sans Ollama (test mode)"
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
            return jsonify({"error": "Champ 'log' manquant"}), 400

        if not isinstance(data["log"], str) or len(data["log"].strip()) == 0:
            return jsonify({"error": "Le champ 'log' doit être une chaîne non vide"}), 400

        log_text = data["log"]
        
        # Analyse simple sans Ollama (test mode)
        result = analyze_log_simple(log_text)
        
        return jsonify({
            "success": True,
            "result": result
        }), 200

    except Exception as e:
        print("❌ ERREUR dans /api/analyze")
        traceback.print_exc()
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
# Lancement serveur
# =========================
if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    
    print(f"🚀 Démarrage Flask – debug = {debug_mode}")
    print(f"📊 Mode: Analyse simple sans Ollama")
    print(f"🌐 Port: 5000")
    
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=debug_mode,
        use_reloader=False
    )