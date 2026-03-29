from flask import Flask, request, jsonify
import hashlib
import datetime

app = Flask(__name__)
BLOCKCHAIN_LEDGER = []

@app.route('/record', methods=['POST'])
def record_anomaly():
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "No data"}), 400

    # Simulation de la création d'un bloc immuable
    timestamp = datetime.datetime.now().isoformat()
    block_id = f"BLK-{len(BLOCKCHAIN_LEDGER) + 1}"
    
    # Génération d'un hash fictif pour l'effet "Blockchain"
    data_string = f"{data.get('attack_type')}{timestamp}{data.get('ip')}"
    tx_hash = hashlib.sha256(data_string.encode()).hexdigest()
    
    block = {
        "id": block_id,
        "timestamp": timestamp,
        "data": data,
        "hash": tx_hash,
        "previous_hash": BLOCKCHAIN_LEDGER[-1]["hash"] if BLOCKCHAIN_LEDGER else "0"
    }
    BLOCKCHAIN_LEDGER.append(block)
    
    print(f"⛓️ [BLOCKCHAIN SIM] ✅ Anomalie '{data.get('attack_type')}' enregistrée dans le bloc {block_id}")
    print(f"   Hash: {tx_hash[:20]}...")
    
    return jsonify({
        "success": True,
        "block_id": block_id,
        "hash": tx_hash,
        "message": "Immutable record created"
    }), 200

@app.route('/ledger', methods=['GET'])
def get_ledger():
    return jsonify(BLOCKCHAIN_LEDGER), 200

if __name__ == '__main__':
    print("🔗 Démarrage du Simulateur Blockchain sur le port 6000...")
    app.run(host='0.0.0.0', port=6001)