#!/usr/bin/env python3
import requests
import json
import time

BACKEND_URL = "http://localhost:5000/api/analyze"
INPUT_FILE = "test_logs_2000.json"
OUTPUT_FILE = "test_results_2000.json"

def test_logs():
    print("📊 DÉBUT DES TESTS (2000 LOGS)...\n")
    
    with open(INPUT_FILE, 'r') as f:
        logs_data = json.load(f)
    
    results = []
    start_time = time.time()
    
    for idx, log_entry in enumerate(logs_data, 1):
        log_text = log_entry['log']
        scenario = log_entry['scenario']
        
        try:
            response = requests.post(BACKEND_URL, json={"log": log_text})
            
            if response.status_code == 200:
                analysis = response.json()
                backend_result = analysis.get('result', {})

                result = {
                    "log_id": idx,
                    "scenario": scenario,
                    "log": log_text,
                    "classification": backend_result.get('is_anomaly'),
                    "confidence": backend_result.get('confidence'),
                    "criticality": backend_result.get('criticality'),
                    "execution_time": response.elapsed.total_seconds(),
                    "status": "success"
                }
                
                results.append(result)
                
                if idx % 30 == 0:
                    print(f"✅ {idx}/2000 logs testés...")
            else:
                print(f"❌ Erreur pour log {idx}: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Erreur pour log {idx}: {str(e)}")
    
    end_time = time.time()
    total_time = end_time - start_time
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ TESTS COMPLÉTÉS!\n")
    print(f"📊 RÉSUMÉ:")
    print(f"   • Logs testés: {len(results)}/2000")
    print(f"   • Temps total: {total_time:.2f}s")
    print(f"   • Temps moyen/log: {total_time/len(results):.4f}s")
    print(f"\n📁 Résultats: {OUTPUT_FILE}")

if __name__ == "__main__":
    test_logs()