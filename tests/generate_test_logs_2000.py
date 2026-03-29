#!/usr/bin/env python3
import random
import json
from datetime import datetime, timedelta

LOGS_PER_SCENARIO = 500

NORMAL_LOGS = [
    "Accepted password for alice from 192.168.1.10 port 54321 ssh2",
    "Accepted password for bob from 192.168.1.15 port 54322 ssh2",
    "Accepted password for charlie from 192.168.1.20 port 54323 ssh2",
    "Accepted password for david from 10.0.0.5 port 54324 ssh2",
    "Accepted password for eve from 10.0.0.10 port 54325 ssh2",
    "Accepted publickey for alice from 192.168.1.10 port 54321 ssh2",
    "User admin logged in successfully from 172.16.0.5",
    "FTP login successful for user: ftp_user from 192.168.1.25",
    "HTTPS connection established from 192.168.1.30:443",
    "Successful authentication for user: sysadmin",
    "Connection closed by 192.168.1.10 port 54321 ssh2",
    "Received disconnect from 10.0.0.5 port 54324 ssh2",
    "sftp subsystem request from 192.168.1.20 port 54323",
    "User: frank logged in from 10.0.0.15",
    "Successful login for user: grace from 192.168.1.35",
]

BRUTE_FORCE_LOGS = [
    "Failed password for invalid user root from 91.200.12.74 port 45001 ssh2 [preauth] (attempt 1/50)",
    "Failed password for invalid user root from 91.200.12.74 port 45001 ssh2 [preauth] (attempt 2/50)",
    "Failed password for invalid user admin from 91.200.12.74 port 45001 ssh2 [preauth] (attempt 3/50)",
    "Failed password for invalid user test from 91.200.12.75 port 45002 ssh2 [preauth] (attempt 1/50)",
    "Failed password for root from 91.200.12.76 port 45003 ssh2 [preauth] (attempt 5/50)",
    "Failed password for postgres from 91.200.12.77 port 45004 ssh2 [preauth]",
    "Invalid user attempt from 203.0.113.50 - 50 failed attempts",
    "Multiple failed SSH login attempts detected from 198.51.100.89",
    "Brute force attack detected: 100+ failed logins from 192.0.2.100 in 5 minutes",
    "SSH brute force attack from 185.220.101.1 - blocked after 30 attempts",
    "Failed password for invalid user mysql from 91.200.12.80 (attempt 10/50)",
    "Failed password for invalid user oracle from 91.200.12.81 (attempt 15/50)",
    "Failed password for invalid user nginx from 91.200.12.82 (attempt 20/50)",
    "Failed password for invalid user apache from 91.200.12.83 (attempt 25/50)",
    "Failed password for invalid user www-data from 91.200.12.84 (attempt 30/50)",
]

PORT_SCAN_LOGS = [
    "Connection attempt on port 22 from 10.50.100.200",
    "Connection attempt on port 23 from 10.50.100.200",
    "Connection attempt on port 25 from 10.50.100.200",
    "Connection attempt on port 3306 from 10.50.100.200",
    "Connection attempt on port 5432 from 10.50.100.200",
    "SYN scan detected from 203.0.113.45 - ports 1-1000",
    "Port scan activity detected from 198.51.100.75 (Nmap detected)",
    "Multiple port probes from 192.0.2.50 on various services",
    "Suspicious port scanning from 185.220.101.45 - blocked",
    "Port sweep detected from 172.16.50.100 across entire subnet",
    "Connection attempt on port 80 from 10.50.100.201",
    "Connection attempt on port 443 from 10.50.100.202",
    "Connection attempt on port 8080 from 10.50.100.203",
    "Connection attempt on port 3389 from 10.50.100.204",
    "Connection attempt on port 1433 from 10.50.100.205",
]

def generate_logs(count, log_list, scenario_name):
    logs = []
    for i in range(count):
        log = random.choice(log_list)
        timestamp = datetime.now() - timedelta(hours=random.randint(0, 24))
        logs.append({
            "id": i + 1,
            "timestamp": timestamp.isoformat(),
            "scenario": scenario_name,
            "log": log
        })
    return logs

print("🔧 GÉNÉRATION DE 2000 LOGS...\n")

all_logs = []

print("✅ Scénario 1: Logs Normaux (500 logs)...")
normal = generate_logs(LOGS_PER_SCENARIO, NORMAL_LOGS, "normal")
all_logs.extend(normal)

print("✅ Scénario 2: Brute Force SSH (500 logs)...")
brute_force = generate_logs(LOGS_PER_SCENARIO, BRUTE_FORCE_LOGS, "brute_force")
all_logs.extend(brute_force)

print("✅ Scénario 3: Port Scanning (500 logs)...")
port_scan = generate_logs(LOGS_PER_SCENARIO, PORT_SCAN_LOGS, "port_scan")
all_logs.extend(port_scan)

print("✅ Scénario 4: Trafic Mixte (500 logs)...")
mixte = []
for i in range(LOGS_PER_SCENARIO):
    scenario_choice = random.choice(["normal", "brute_force", "port_scan"])
    if scenario_choice == "normal":
        log_text = random.choice(NORMAL_LOGS)
    elif scenario_choice == "brute_force":
        log_text = random.choice(BRUTE_FORCE_LOGS)
    else:
        log_text = random.choice(PORT_SCAN_LOGS)
    
    timestamp = datetime.now() - timedelta(hours=random.randint(0, 24))
    mixte.append({
        "id": i + 1,
        "timestamp": timestamp.isoformat(),
        "scenario": "mixte",
        "log_type": scenario_choice,
        "log": log_text
    })
all_logs.extend(mixte)

output_file = "test_logs_2000.json"
with open(output_file, 'w') as f:
    json.dump(all_logs, f, indent=2)

print(f"\n✅ GÉNÉRATION COMPLÈTE!\n")
print(f"📊 STATISTIQUES:")
print(f"   • Total: {len(all_logs)} logs")
print(f"   • Normaux: {len(normal)}")
print(f"   • Brute Force: {len(brute_force)}")
print(f"   • Port Scan: {len(port_scan)}")
print(f"   • Mixte: {len(mixte)}")
print(f"\n📁 Fichier: {output_file}")
print(f"🚀 Prêt pour les tests!")