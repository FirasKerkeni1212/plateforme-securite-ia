import subprocess
import time
import os
import json

FABRIC_PATH = "/home/pc/fabric-samples/test-network"

def is_fabric_available():
    """Vérifie si Fabric est accessible et en ligne"""
    try:
        # Test simple : vérifier si le chemin existe dans WSL
        cmd = ["wsl", "-d", "Ubuntu", "bash", "-c", f"test -d {FABRIC_PATH} && echo 'OK'"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except Exception as e:
        print(f"[FABRIC CHECK] Erreur : {str(e)}")
        return False

def record_security_event_fabric(log_text, analysis, remediation, criticality):
    """Enregistre l'événement sur Hyperledger Fabric"""
    event_id = f"event_{int(time.time())}"
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Nettoyage rigoureux
    log_clean = log_text.replace('\n', ' ').replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
    analysis_clean = analysis.replace('\n', ' ').replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
    remediation_clean = remediation.replace('\n', ' ').replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')

    inner_cmd = (
        f"cd {FABRIC_PATH} && "
        f"export PATH=$PATH:/home/pc/fabric-samples/bin && "
        f"peer chaincode invoke -o localhost:7050 "
        f"--ordererTLSHostnameOverride orderer.example.com "
        f"--tls "
        f"--cafile {FABRIC_PATH}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem "
        f"-C mychannel -n security_logs "
        f"--peerAddresses localhost:7051 --tlsRootCertFiles {FABRIC_PATH}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt "
        f"--peerAddresses localhost:9051 --tlsRootCertFiles {FABRIC_PATH}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt "
        f"-c '{{\"function\":\"RecordEvent\",\"Args\":[\"{event_id}\",\"{log_clean}\",\"{analysis_clean}\",\"{remediation_clean}\",\"{criticality}\",\"{timestamp}\"]}}'"
    )

    cmd = ["wsl", "-d", "Ubuntu", "bash", "-c", inner_cmd]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and "status:200" in result.stdout:
            print(f"[FABRIC] ✅ Événement enregistré : {event_id}")
            return {"status": "success", "event_id": event_id}
        else:
            error_msg = result.stderr.strip() or result.stdout.strip()
            print(f"[FABRIC] ❌ Erreur : {error_msg}")
            return {"status": "error", "details": error_msg}
    except subprocess.TimeoutExpired:
        print("[FABRIC] ⏱️  Timeout – Fabric n'a pas répondu à temps")
        return {"status": "error", "details": "Timeout lors de l'appel blockchain"}
    except Exception as e:
        print(f"[FABRIC] 🔥 Exception : {str(e)}")
        return {"status": "error", "details": str(e)}

def record_security_event_json(log_text, analysis, remediation, criticality):
    """Fallback : enregistre l'événement en JSON local (mode développement)"""
    event_id = f"event_{int(time.time())}"
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    event_data = {
        "event_id": event_id,
        "timestamp": timestamp,
        "log": log_text[:500],  # Limiter la taille
        "analysis": analysis[:500],
        "remediation": remediation[:500],
        "criticality": criticality
    }

    # Crée le dossier s'il n'existe pas
    log_dir = "blockchain_logs"
    os.makedirs(log_dir, exist_ok=True)

    # Sauvegarde en JSON
    filepath = os.path.join(log_dir, f"{event_id}.json")
    try:
        with open(filepath, 'w') as f:
            json.dump(event_data, f, indent=2)
        print(f"[JSON FALLBACK] ✅ Événement enregistré : {filepath}")
        return {"status": "success", "event_id": event_id, "mode": "json"}
    except Exception as e:
        print(f"[JSON FALLBACK] ❌ Erreur : {str(e)}")
        return {"status": "error", "details": str(e)}

def record_security_event(log_text, analysis, remediation, criticality):
    """
    Interface principale : essaie Fabric, fallback sur JSON
    """
    print("\n[BLOCKCHAIN] Enregistrement de l'événement de sécurité...")

    # Vérifier disponibilité Fabric
    if is_fabric_available():
        print("[BLOCKCHAIN] ✅ Fabric disponible, tentative d'enregistrement...")
        result = record_security_event_fabric(log_text, analysis, remediation, criticality)
        if result["status"] == "success":
            return result
        else:
            print("[BLOCKCHAIN] ⚠️  Fabric a échoué, fallback sur JSON...")
    else:
        print("[BLOCKCHAIN] ⚠️  Fabric non disponible, utilisation du mode JSON...")

    # Fallback sur JSON
    return record_security_event_json(log_text, analysis, remediation, criticality)