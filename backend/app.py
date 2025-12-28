from flask import Flask, jsonify

app = Flask(__name__)

# Route de test simple
@app.route('/')
def home():
    return jsonify({
        "message": "Bienvenue sur la Plateforme Hybride Cloud-Réseaux Sécurisée !",
        "status": "Backend Flask fonctionne correctement 🚀"
    })

# Une route API basique pour tester plus tard
@app.route('/api/test')
def test_api():
    return jsonify({
        "data": "Ceci est un test de l'API",
        "success": True
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)