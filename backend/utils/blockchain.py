import subprocess
import time

FABRIC_PATH = "/home/pc/fabric-samples/test-network"

def record_security_event(log_text, analysis, remediation, criticality):
    event_id = f"event_{int(time.time())}"
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Nettoyage rigoureux : remplacer nouvelles lignes par espace, échapper guillemets, $, `, \
    log_clean = log_text.replace('\n', ' ').replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
    analysis_clean = analysis.replace('\n', ' ').replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
    remediation_clean = remediation.replace('\n', ' ').replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')

    # Commande complète
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
            return {"status": "success", "event_id": event_id}
        else:
            return {"status": "error", "details": result.stderr.strip() or result.stdout.strip()}
    except subprocess.TimeoutExpired:
        return {"status": "error", "details": "Timeout lors de l'appel blockchain"}
    except Exception as e:
        return {"status": "error", "details": str(e)}