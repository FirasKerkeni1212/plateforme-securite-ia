import requests
import time
from pathlib import Path

API_URL = "http://localhost:5000/api/analyze"
RESULTS_DIR = Path("test_results")
RESULTS_DIR.mkdir(exist_ok=True)

# Dataset de test
TEST_LOGS = [
    # Normal (attendu: pas anomalie)
    {
        "log": "Jan 03 10:15:23 sshd[1234]: Accepted password for alice from 192.168.1.10 port 50000 ssh2",
        "expected": False,
        "name": "Connexion SSH normale"
    },
    # Brute Force (attendu: anomalie)
    {
        "log": "Jan 03 11:00:00 sshd[5678]: Failed password for invalid user admin from 91.200.12.74 port 40000 ssh2 [attempt 25/50]",
        "expected": True,
        "name": "Brute Force SSH"
    },
    # Port Scan (attendu: anomalie)
    {
        "log": "Jan 03 11:15:00 firewall[9999]: BLOCKED connection from 176.10.99.200 to port 22 (scan detected)",
        "expected": True,
        "name": "Scan de ports"
    },
    # SQL Injection (attendu: anomalie)
    {
        "log": "Jan 03 12:00:00 web-app[5678]: Suspicious query from 45.142.212.61: SELECT * FROM users WHERE username='admin'--'",
        "expected": True,
        "name": "SQL Injection"
    },
    # DDoS (attendu: anomalie)
    {
        "log": "Jan 03 12:30:00 nginx[6789]: WARNING - 1500 requests/sec from 185.220.101.45 (threshold: 100 req/sec)",
        "expected": True,
        "name": "DDoS"
    }
]

def test_log(test_data):
    print(f"\n{'='*60}")
    print(f"🧪 Test: {test_data['name']}")
    print(f"📝 Log: {test_data['log'][:70]}...")
    
    start = time.time()
    
    try:
        response = requests.post(
            API_URL,
            json={"log": test_data["log"]},
            timeout=30
        )
        
        duration = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            detected = result.get("is_anomaly", False)
            expected = test_data["expected"]
            
            if detected == expected:
                print(f"✅ PASS - Détection correcte")
            else:
                print(f"❌ FAIL - Attendu: {expected}, Détecté: {detected}")
            
            print(f"📊 Confiance: {result.get('confidence', 0)}")
            print(f"⏱️  Temps: {duration:.2f}s")
            
            return {
                "success": True,
                "correct": detected == expected,
                "time": duration
            }
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            return {"success": False}
    
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return {"success": False}

def main():
    print("🚀 TESTS AUTOMATISÉS - Plateforme de Détection d'Anomalies")
    print(f"🎯 Nombre de tests: {len(TEST_LOGS)}")
    print(f"📍 API: {API_URL}\n")
    
    # Vérifier que l'API est accessible
    try:
        response = requests.get("http://localhost:5000/", timeout=5)
        print("✅ Backend Flask accessible\n")
    except:
        print("❌ ERREUR: Backend Flask non accessible sur http://localhost:5000")
        print("💡 Lance d'abord: cd backend && python app.py\n")
        return
    
    results = []
    
    for i, test_data in enumerate(TEST_LOGS, 1):
        print(f"\n[{i}/{len(TEST_LOGS)}]", end=" ")
        result = test_log(test_data)
        results.append(result)
        time.sleep(2)
    
    # Statistiques finales
    successful = [r for r in results if r.get("success")]
    correct = [r for r in successful if r.get("correct")]
    
    print(f"\n\n{'='*60}")
    print("📊 RÉSULTATS FINAUX")
    print(f"{'='*60}")
    print(f"✅ Tests réussis: {len(successful)}/{len(TEST_LOGS)}")
    print(f"🎯 Détections correctes: {len(correct)}/{len(successful)}")
    
    if successful:
        accuracy = (len(correct) / len(successful)) * 100
        avg_time = sum(r["time"] for r in successful) / len(successful)
        
        print(f"📈 Précision: {accuracy:.1f}%")
        print(f"⏱️  Temps moyen: {avg_time:.2f}s")
        
        if accuracy >= 80:
            print("\n🏆 EXCELLENT ! Objectif atteint")
        else:
            print("\n⚠️  Besoin d'amélioration")
    
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()