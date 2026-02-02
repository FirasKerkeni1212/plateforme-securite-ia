import random
import time
from datetime import datetime
from pathlib import Path
import logging
import json

# Logging dans un fichier (utile pour Docker et rapport)
logging.basicConfig(
    filename='/app/logs/generator.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

# Dossier logs (monté via Docker)
LOG_DIR = Path("/app/logs")
LOG_DIR.mkdir(exist_ok=True)

# IPs
NORMAL_IPS = ["192.168.1.10", "192.168.1.25", "10.0.0.5", "172.16.0.42"]
ATTACK_IPS = ["91.200.12.74", "176.10.99.200", "185.216.34.99"]

def write_log(content, filename="combined.log"):
    """Écrit dans fichier spécifique + combiné + log"""
    filepath = LOG_DIR / filename
    combined = LOG_DIR / "all_logs.log"
    
    for p in (filepath, combined):
        with open(p, "a", encoding="utf-8") as f:
            f.write(content + "\n")
    
    logging.info(f"[{filename}] {content}")

def generate_normal_log():
    ip = random.choice(NORMAL_IPS)
    user = random.choice(["alice", "bob", "john", "sarah", "admin"])
    pid = random.randint(1000, 9999)
    port = random.randint(30000, 60000)
    timestamp = datetime.now().strftime("%b %d %H:%M:%S")
    log = f"{timestamp} server sshd[{pid}]: Accepted password for {user} from {ip} port {port} ssh2"
    write_log(log, "normal.log")
    return "normal"

def generate_brute_force_log():
    ip = random.choice(ATTACK_IPS)
    user = random.choice(["root", "admin", "oracle", "test"])
    pid = random.randint(1000, 9999)
    port = random.randint(30000, 60000)
    attempts = random.randint(10, 50)
    timestamp = datetime.now().strftime("%b %d %H:%M:%S")
    log = f"{timestamp} server sshd[{pid}]: Failed password for invalid user {user} from {ip} port {port} ssh2 [preauth] (attempt {attempts}/50)"
    write_log(log, "brute_force.log")
    return "brute_force"

def generate_port_scan_log():
    ip = random.choice(ATTACK_IPS)
    port = random.choice([22, 80, 443, 3306, 5432, 8080])
    timestamp = datetime.now().strftime("%b %d %H:%M:%S")
    action = random.choice(["DROP", "REJECT", "BLOCKED"])
    log = f"{timestamp} firewall kernel: PORT SCAN {action} from {ip} to port {port}"
    write_log(log, "port_scan.log")
    return "port_scan"

def main():
    print("🔄 Générateur de logs démarré – Phase 3 Environnement Hybride")
    print(f"📁 Logs écrits dans : {LOG_DIR}")
    print("   - all_logs.log (combiné)")
    print("   - normal.log / brute_force.log / port_scan.log")
    print("⚠️  Boucle infinie – Le générateur tourne continuellement\n")
    logging.info("Générateur démarré")
    
    stats = {"normal": 0, "brute_force": 0, "port_scan": 0}
    total_logs = 0
    
    try:
        while True:  # ✅ Boucle infinie au lieu de MAX_LOGS
            rand = random.random()
            
            if rand < 0.70:
                log_type = generate_normal_log()
            elif rand < 0.90:
                log_type = generate_brute_force_log()
            else:
                log_type = generate_port_scan_log()
            
            stats[log_type] += 1
            total_logs += 1
            
            if total_logs % 50 == 0:
                msg = f"{total_logs} logs | Normal: {stats['normal']} | Brute: {stats['brute_force']} | Scan: {stats['port_scan']}"
                print(f"📊 {msg}")
                logging.info(msg)
            
            # Exporte stats tous les 500 logs
            if total_logs % 500 == 0:
                stats_path = LOG_DIR / "generator_stats.json"
                with open(stats_path, "w") as f:
                    json.dump({"stats": stats, "total": total_logs, "timestamp": datetime.now().isoformat()}, f, indent=4)
            
            time.sleep(random.uniform(0.8, 3.0))
            
    except KeyboardInterrupt:
        print("\n🛑 Arrêt manuel")
    finally:
        print(f"📈 Stats finales : {stats}")
        print(f"Total : {total_logs} logs")
        logging.info(f"Arrêt - Stats finales : {stats} - Total: {total_logs}")

if __name__ == "__main__":
    main()