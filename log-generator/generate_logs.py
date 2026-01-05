import random
import time
from datetime import datetime
from pathlib import Path

# Dossier pour les logs (monté via Docker)
LOG_DIR = Path("/app/logs")
LOG_DIR.mkdir(exist_ok=True)

# IPs normales et d'attaque
NORMAL_IPS = ["192.168.1.10", "192.168.1.25", "10.0.0.5", "172.16.0.42"]
ATTACK_IPS = ["91.200.12.74", "176.10.99.200", "185.216.34.99"]

def write_log(content, filename="combined.log"):
    """Écrit un log dans le fichier combiné + fichier spécifique"""
    filepath = LOG_DIR / filename
    combined_path = LOG_DIR / "all_logs.log"
    
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(content + "\n")
    with open(combined_path, "a", encoding="utf-8") as f:
        f.write(content + "\n")

def generate_normal_log():
    ip = random.choice(NORMAL_IPS)
    user = random.choice(["alice", "bob", "john", "sarah", "admin"])
    timestamp = datetime.now().strftime("%b %d %H:%M:%S")
    log = f"{timestamp} server sshd[1234]: Accepted password for {user} from {ip} port {random.randint(30000,60000)} ssh2"
    write_log(log, "normal.log")
    return "normal"

def generate_brute_force_log():
    ip = random.choice(ATTACK_IPS)
    user = random.choice(["root", "admin", "oracle", "test"])
    timestamp = datetime.now().strftime("%b %d %H:%M:%S")
    attempts = random.randint(10, 50)
    log = f"{timestamp} server sshd[5678]: Failed password for invalid user {user} from {ip} port {random.randint(30000,60000)} ssh2 [preauth] (attempt {attempts}/50)"
    write_log(log, "brute_force.log")
    return "brute_force"

def generate_port_scan_log():
    ip = random.choice(ATTACK_IPS)
    port = random.choice([22, 80, 443, 3306, 5432, 8080])
    timestamp = datetime.now().strftime("%b %d %H:%M:%S")
    log = f"{timestamp} firewall kernel: PORT SCAN DETECTED from {ip} to port {port}"
    write_log(log, "port_scan.log")
    return "port_scan"

def main():
    print("🔄 Générateur de logs démarré – Phase 3 Environnement Hybride")
    print(f"📁 Logs écrits dans : {LOG_DIR}")
    print("   - all_logs.log (combiné)")
    print("   - normal.log / brute_force.log / port_scan.log")
    
    stats = {"normal": 0, "brute_force": 0, "port_scan": 0}
    
    try:
        while True:
            rand = random.random()
            
            if rand < 0.70:  # 70% trafic normal
                log_type = generate_normal_log()
            elif rand < 0.90:  # 20% brute force
                log_type = generate_brute_force_log()
            else:  # 10% port scan
                log_type = generate_port_scan_log()
            
            stats[log_type] += 1
            
            total = sum(stats.values())
            if total % 20 == 0:
                print(f"📊 {total} logs générés | Normal: {stats['normal']} | Brute force: {stats['brute_force']} | Port scan: {stats['port_scan']}")
            
            time.sleep(random.uniform(0.8, 3.0))  # Plus réaliste
            
    except KeyboardInterrupt:
        print("\n🛑 Générateur arrêté")
        print(f"📈 Stats finales : {stats}")

if __name__ == "__main__":
    main()