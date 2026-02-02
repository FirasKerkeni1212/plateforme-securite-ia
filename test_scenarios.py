#!/usr/bin/env python3
"""
Test Scenarios Orchestrator - Phase 3
Exécute des scénarios d'attaque contrôlés et mesure la détection
"""

import requests
import time
import json
import threading
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict

# Configuration
API_BASE = "http://localhost:5000"
RESULTS_DIR = Path("test_results")
RESULTS_DIR.mkdir(exist_ok=True)

@dataclass
class TestResult:
    scenario_name: str
    log_content: str
    timestamp: str
    detection_time: float
    was_detected: bool
    confidence: float
    criticality: str
    actions_suggested: List[str]
    response_time: float
    status: str

class TestScenario:
    def __init__(self, name: str, logs: List[str]):
        self.name = name
        self.logs = logs
        self.results = []
        
    def run(self) -> List[TestResult]:
        """Exécute le scénario et retourne les résultats"""
        print(f"\n{'='*70}")
        print(f"🎯 SCENARIO: {self.name}")
        print(f"{'='*70}")
        print(f"📊 Nombre de logs à analyser: {len(self.logs)}\n")
        
        detected_count = 0
        response_times = []
        
        for i, log in enumerate(self.logs, 1):
            try:
                start = time.time()
                result = self._analyze_log(log)
                response_time = time.time() - start
                response_times.append(response_time)
                
                if result['is_anomaly']:
                    detected_count += 1
                
                test_result = TestResult(
                    scenario_name=self.name,
                    log_content=log[:200],
                    timestamp=datetime.now().isoformat(),
                    detection_time=response_time,
                    was_detected=result['is_anomaly'],
                    confidence=result['confidence'],
                    criticality=result['criticality'],
                    actions_suggested=result['actions'],
                    response_time=response_time,
                    status="success"
                )
                self.results.append(test_result)
                
                # Affichage du progrès
                if result['is_anomaly']:
                    symbol = "🚨"
                else:
                    symbol = "✅"
                
                print(f"{symbol} [{i}/{len(self.logs)}] Temps: {response_time:.2f}s | "
                      f"Détecté: {result['is_anomaly']} | "
                      f"Criticité: {result['criticality']}")
                
                time.sleep(0.5)  # Délai entre les requêtes
                
            except Exception as e:
                print(f"❌ Erreur lors de l'analyse du log {i}: {str(e)}")
                test_result = TestResult(
                    scenario_name=self.name,
                    log_content=log[:200],
                    timestamp=datetime.now().isoformat(),
                    detection_time=0,
                    was_detected=False,
                    confidence=0.0,
                    criticality="unknown",
                    actions_suggested=[],
                    response_time=0,
                    status="error"
                )
                self.results.append(test_result)
        
        # Statistiques du scénario
        print(f"\n📈 Résultats du scénario:")
        print(f"   • Anomalies détectées: {detected_count}/{len(self.logs)} ({detected_count*100/len(self.logs):.1f}%)")
        if response_times:
            avg_response = sum(response_times) / len(response_times)
            print(f"   • Temps de réponse moyen: {avg_response:.2f}s")
            print(f"   • Min: {min(response_times):.2f}s | Max: {max(response_times):.2f}s")
        
        return self.results
    
    def _analyze_log(self, log: str) -> Dict:
        """Envoie le log à l'API d'analyse"""
        response = requests.post(
            f"{API_BASE}/api/analyze",
            json={"log": log},
            timeout=60
        )
        response.raise_for_status()
        return response.json()

def create_test_scenarios() -> List[TestScenario]:
    """Crée les scénarios de test"""
    
    # Scénario 1: Trafic normal
    normal_logs = [
        "Jan 30 10:45:23 server sshd[2345]: Accepted password for alice from 192.168.1.10 port 54321 ssh2",
        "Jan 30 10:46:01 server sshd[2346]: Accepted publickey for bob from 192.168.1.25 port 54322 ssh2",
        "Jan 30 10:47:15 server sshd[2347]: Accepted password for john from 10.0.0.5 port 54323 ssh2",
        "Jan 30 10:48:32 server sshd[2348]: Accepted password for sarah from 172.16.0.42 port 54324 ssh2",
        "Jan 30 10:49:45 server sshd[2349]: Accepted password for admin from 192.168.1.10 port 54325 ssh2",
    ]
    
    # Scénario 2: Brute force SSH
    brute_force_logs = [
        "Jan 30 11:00:01 server sshd[3000]: Failed password for invalid user root from 91.200.12.74 port 45001 ssh2 [preauth] (attempt 1/50)",
        "Jan 30 11:00:02 server sshd[3001]: Failed password for invalid user admin from 91.200.12.74 port 45002 ssh2 [preauth] (attempt 2/50)",
        "Jan 30 11:00:03 server sshd[3002]: Failed password for invalid user oracle from 91.200.12.74 port 45003 ssh2 [preauth] (attempt 3/50)",
        "Jan 30 11:00:04 server sshd[3003]: Failed password for invalid user test from 91.200.12.74 port 45004 ssh2 [preauth] (attempt 4/50)",
        "Jan 30 11:00:05 server sshd[3004]: Failed password for invalid user root from 91.200.12.74 port 45005 ssh2 [preauth] (attempt 5/50)",
    ]
    
    # Scénario 3: Port scanning
    port_scan_logs = [
        "Jan 30 11:15:01 firewall kernel: PORT SCAN DROP from 185.216.34.99 to port 22",
        "Jan 30 11:15:02 firewall kernel: PORT SCAN DROP from 185.216.34.99 to port 80",
        "Jan 30 11:15:03 firewall kernel: PORT SCAN DROP from 185.216.34.99 to port 443",
        "Jan 30 11:15:04 firewall kernel: PORT SCAN DROP from 185.216.34.99 to port 3306",
        "Jan 30 11:15:05 firewall kernel: PORT SCAN DROP from 185.216.34.99 to port 5432",
    ]
    
    # Scénario 4: Mélange normal + attaques
    mixed_logs = normal_logs + brute_force_logs[:2] + normal_logs[1:3] + port_scan_logs[:2]
    
    return [
        TestScenario("Trafic Normal (Baseline)", normal_logs),
        TestScenario("Brute Force SSH", brute_force_logs),
        TestScenario("Port Scanning", port_scan_logs),
        TestScenario("Trafic Mixte (Normal + Attaques)", mixed_logs),
    ]

def run_all_tests():
    """Exécute tous les tests"""
    print("\n" + "="*70)
    print("🚀 PHASE 3 - TEST SCENARIOS - ENVIRONNEMENT HYBRIDE")
    print("="*70)
    print(f"⏰ Début: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔗 API: {API_BASE}\n")
    
    # Vérifier la disponibilité de l'API
    try:
        response = requests.get(f"{API_BASE}/", timeout=5)
        print(f"✅ API disponible: {response.status_code}")
    except:
        print("❌ ERREUR: L'API n'est pas accessible!")
        print(f"   Vérifiez que le backend tourne sur {API_BASE}")
        return
    
    # Créer et exécuter les scénarios
    scenarios = create_test_scenarios()
    all_results = []
    
    for scenario in scenarios:
        results = scenario.run()
        all_results.extend(results)
    
    # Générer le rapport
    generate_report(all_results)

def generate_report(results: List[TestResult]):
    """Génère un rapport détaillé"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_logs_analyzed": len(results),
        "total_anomalies_detected": sum(1 for r in results if r.was_detected),
        "detection_rate": f"{sum(1 for r in results if r.was_detected) * 100 / len(results):.1f}%",
        "average_response_time": f"{sum(r.response_time for r in results) / len(results):.3f}s",
        "success_rate": f"{sum(1 for r in results if r.status == 'success') * 100 / len(results):.1f}%",
        "scenarios": {}
    }
    
    # Grouper par scénario
    scenarios_dict = {}
    for result in results:
        if result.scenario_name not in scenarios_dict:
            scenarios_dict[result.scenario_name] = []
        scenarios_dict[result.scenario_name].append(result)
    
    for scenario_name, scenario_results in scenarios_dict.items():
        report["scenarios"][scenario_name] = {
            "total": len(scenario_results),
            "detected": sum(1 for r in scenario_results if r.was_detected),
            "detection_rate": f"{sum(1 for r in scenario_results if r.was_detected) * 100 / len(scenario_results):.1f}%",
            "avg_response_time": f"{sum(r.response_time for r in scenario_results) / len(scenario_results):.3f}s",
        }
    
    # Sauvegarder le rapport
    report_path = RESULTS_DIR / f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print("\n" + "="*70)
    print("📊 RAPPORT FINAL")
    print("="*70)
    print(json.dumps(report, indent=2))
    print(f"\n✅ Rapport sauvegardé: {report_path}")

if __name__ == "__main__":
    run_all_tests()
