import os

# Bypass pour CrewAI + Ollama local
os.environ["OPENAI_API_KEY"] = "ollama"
os.environ["OPENAI_API_BASE"] = "http://localhost:11434/v1"

from flask import Flask, request, jsonify
from flask_cors import CORS
from utils.crew_agents import analyze_with_crew

app = Flask(__name__)

# Autorise ton frontend React
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

@app.route('/')
def home():
    return jsonify({
        "message": "Plateforme Sécurité IA - Multi-Agents MCP actifs !",
        "status": "Backend prêt – Ollama + CrewAI opérationnels"
    })

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    
    if not data or 'log' not in data:
        return jsonify({"error": "Champ 'log' manquant"}), 400
    
    log_text = data['log']
    
    try:
        print(f"\n=== Analyse du log ===\n{log_text}\n")
        result = analyze_with_crew(log_text)
        
        return jsonify({
            "log": log_text,
            "classification": "Anomalie détectée" if result["is_anomaly"] else "Trafic normal",
            "confidence": result["confidence"],
            "is_anomaly": result["is_anomaly"],
            "suggestion": result["summary"]
        })
    except Exception as e:
        print("\nERREUR CRITIQUE DANS LES MULTI-AGENTS :")
        import traceback
        traceback.print_exc()  # Affiche l'erreur complète dans la console Flask
        return jsonify({
            "error": "Erreur lors de l'analyse multi-agents",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)