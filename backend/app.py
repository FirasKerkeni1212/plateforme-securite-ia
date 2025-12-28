from flask import Flask, request, jsonify
from flask_cors import CORS
from utils.nlp import analyze_log

app = Flask(__name__)
CORS(app)  # Important pour que React puisse appeler l'API plus tard

@app.route('/')
def home():
    return jsonify({
        "message": "Plateforme Hybride Cloud-Réseaux Sécurisée avec IA",
        "status": "Backend + IA prêts !"
    })

# Nouvelle route pour analyser un log
@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    
    if not data or 'log' not in data:
        return jsonify({"error": "Veuillez fournir un champ 'log'"}), 400
    
    log_text = data['log']
    
    # Analyse avec l'IA
    result = analyze_log(log_text)
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)