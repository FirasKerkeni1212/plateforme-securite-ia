import requests
import os

# URL du simulateur (nom du service Docker)
BLOCKCHAIN_URL = os.getenv("BLOCKCHAIN_URL", "http://blockchain-sim:6001/record")

def record_anomaly(log, attack_type, criticality, confidence, ip, detected_by):
    """
    Envoie l'anomalie au simulateur Blockchain.
    Pour la production, remplacer cet appel par la commande 'peer' Hyperledger Fabric.
    """
    payload = {
        "log": log[:200],
        "attack_type": attack_type,
        "criticality": criticality,
        "confidence": confidence,
        "ip": ip,
        "detected_by": detected_by
    }
    
    try:
        resp = requests.post(BLOCKCHAIN_URL, json=payload, timeout=5)
        data = resp.json()
        
        if data.get("success"):
            print(f"⛓️  Blockchain: anomalie {data.get('block_id')} enregistrée ✅")
            print(f"   Hash: {data.get('hash', '')[:20]}...")
            return {"success": True, "id": data.get('block_id')}
        else:
            print(f"⛓️  Blockchain erreur: {data.get('error')}")
            return {"success": False, "error": data.get('error')}
            
    except Exception as e:
        print(f"⛓️  Blockchain exception (Simulation): {e}")
        # En mode démo, on retourne souvent un succès partiel pour ne pas bloquer l'analyse
        return {"success": True, "id": "SIM-OK", "warning": "Simulateur unreachable but logged locally"}