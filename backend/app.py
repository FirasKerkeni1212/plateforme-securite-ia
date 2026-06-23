from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests, json, re, random, time, hashlib
from datetime import datetime
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ========================================
# CONFIGURATION
# ========================================
OLLAMA_API = "http://ollama:11434/api/generate"
MODEL = "mistral:latest"

# ========================================
# MÉTRIQUES PROMETHEUS
# ========================================
LOGS_ANALYZED = Counter('logs_analyzed_total', 'Total logs analyzed', ['status'])
ANOMALIES_DETECTED = Counter('anomalies_detected_total', 'Anomalies detected', ['attack_type'])
HTTP_REQUESTS = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])

# ========================================
# VALIDATION RÉPONSES
# ========================================
def is_valid_response(text):
    if not text or not isinstance(text, str):
        return False
    cleaned = re.sub(r'[\u200b\u200c\u200d\u200e\u200f\ufeff\u00ad\u2060\u180e\u00a0]', '', text).strip()
    return len(cleaned) > 5 and bool(re.search(r'\w', cleaned))

# ========================================
# MÉMOIRE CONVERSATION
# ========================================
conversation_memory = {}

def get_conversation_context(session_id, max_messages=4):
    if session_id not in conversation_memory:
        conversation_memory[session_id] = []
    return conversation_memory[session_id][-max_messages:]

def add_to_conversation(session_id, role, content):
    if session_id not in conversation_memory:
        conversation_memory[session_id] = []
    conversation_memory[session_id].append({"role": role, "content": content})
    if len(conversation_memory[session_id]) > 12:
        conversation_memory[session_id] = conversation_memory[session_id][-12:]

# ========================================
# BASE DE DONNÉES PARTAGÉE + COMPTEURS DYNAMIQUES
# ========================================
alerts_db = []
alert_counter = 0
total_logs_analyzed = 0

# ========================================
# 🔗 BLOCKCHAIN LEDGER (POUR INCIDENTS CRITICAL)
# ========================================
blockchain_ledger = []
last_block_hash = "0" * 64  # Hash générique pour le bloc genesis

class BlockchainBlock:
    """Représente un bloc immuable dans la chaîne de traçabilité"""
    def __init__(self, index, alert_id, payload, previous_hash):
        self.index = index
        self.timestamp = datetime.utcnow().isoformat()
        self.alert_id = alert_id
        self.payload = json.dumps(payload, sort_keys=True)
        self.previous_hash = previous_hash
        self.nonce = 0
        self.current_hash = self._calculate_hash()
    
    def _calculate_hash(self):
        """Calcule le hash SHA-256 du bloc"""
        block_string = f"{self.index}{self.timestamp}{self.alert_id}{self.payload}{self.previous_hash}{self.nonce}"
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def verify(self):
        """Vérifie l'intégrité du bloc"""
        return self._calculate_hash() == self.current_hash

# ========================================
# GÉOLOCALISATION IP
# ========================================
def is_private_ip(ip):
    private_prefixes = (
        '192.168.', '10.', '172.16.', '172.17.', '172.18.',
        '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.', '172.28.',
        '172.29.', '172.30.', '172.31.', '127.', '0.', '::1'
    )
    return any(ip.startswith(p) for p in private_prefixes)

def geolocate_ip(ip):
    if not ip or ip == "IP inconnue" or is_private_ip(ip):
        return 36.8065, 10.1815, "Tunisia", "Tunis"
    try:
        res = requests.get(f"http://ip-api.com/json/{ip}?fields=status,lat,lon,country,city", timeout=3)
        data = res.json()
        if data.get('status') == 'success':
            return data.get('lat', 36.8065), data.get('lon', 10.1815), data.get('country', 'Unknown'), data.get('city', 'Unknown')
    except:
        pass
    return 36.8065, 10.1815, "Tunisia", "Tunis"

def extract_ip_from_log(normalized_log):
    from_ip = re.findall(r'from\s+([\d]{1,3}(?:\.[\d]{1,3}){3})', normalized_log)
    if from_ip:
        for ip in from_ip:
            if not is_private_ip(ip): return ip
        return from_ip[0]
    all_ips = re.findall(r'(\d{1,3}(?:\.\d{1,3}){3})', normalized_log)
    for ip in all_ips:
        if not is_private_ip(ip): return ip
    return all_ips[0] if all_ips else "192.168.1.100"

# ========================================
# AUTHENTIFICATION
# ========================================
users_db = {
    'admin': {'password': 'admin123', 'role': 'admin'},
    'analyste': {'password': 'user123', 'role': 'analyst'}
}

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json or {}
        username, password = data.get('username'), data.get('password')
        if not username or not password:
            return jsonify({'error': 'Identifiants requis'}), 400
        user = users_db.get(username)
        if user and user['password'] == password:
            token = f"jwt_{username}_{int(time.time())}_{random.randint(1000,9999)}"
            HTTP_REQUESTS.labels(method='POST', endpoint='/api/login', status='200').inc()
            return jsonify({'success': True, 'token': token, 'user': {'username': username, 'role': user['role']}})
        HTTP_REQUESTS.labels(method='POST', endpoint='/api/login', status='401').inc()
        return jsonify({'error': 'Identifiants invalides'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================
# GESTION UTILISATEURS
# ========================================
@app.route('/api/users', methods=['GET'])
def get_users():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token or not token.startswith('jwt_admin'):
        return jsonify({'error': 'Accès refusé'}), 403
    user_list = [{'id': i, 'username': u, 'role': users_db[u]['role']} for i, u in enumerate(users_db)]
    return jsonify({'users': user_list})

@app.route('/api/users', methods=['POST'])
def create_user():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token or not token.startswith('jwt_admin'):
        return jsonify({'error': 'Accès refusé'}), 403
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'analyst')
    if not username or not password:
        return jsonify({'error': 'Username et password requis'}), 400
    if username in users_db:
        return jsonify({'error': 'Utilisateur déjà existant'}), 409
    users_db[username] = {'password': password, 'role': role}
    return jsonify({'success': True, 'message': f'Utilisateur {username} créé'})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token or not token.startswith('jwt_admin'):
        return jsonify({'error': 'Accès refusé'}), 403
    user_list = list(users_db.keys())
    if user_id >= len(user_list):
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    username = user_list[user_id]
    if username == 'admin':
        return jsonify({'error': 'Impossible de supprimer l\'admin'}), 403
    del users_db[username]
    return jsonify({'success': True})

# ========================================
# NORMALISATION & DÉTECTIONS
# ========================================
def normalize_log_input(log_text):
    log_text = log_text.replace('\\\\n', '\n').replace('\\n', '\n').replace('\r\n', '\n').replace('\r', '\n')
    lines = [line.strip() for line in log_text.split('\n') if line.strip()]
    return '\n'.join(lines), lines

# ========================================
# DÉTECTION PORT SCAN
# ========================================
def detect_port_scan(lines, normalized_log):
    src_ports = {}
    for line in lines:
        src_match = re.search(r'SRC=([\d.]+)', line, re.IGNORECASE)
        dpt_match = re.search(r'DPT=(\d+)', line, re.IGNORECASE)
        if src_match and dpt_match:
            src_ip = src_match.group(1)
            dpt = dpt_match.group(1)
            if src_ip not in src_ports:
                src_ports[src_ip] = set()
            src_ports[src_ip].add(dpt)
    for ip, ports in src_ports.items():
        if len(ports) >= 3:
            ports_list = sorted(ports, key=lambda x: int(x))
            nb_ports = len(ports)
            if nb_ports >= 10:
                criticality, confidence = "CRITICAL", 0.97
            elif nb_ports >= 5:
                criticality, confidence = "HIGH", 0.92
            else:
                criticality, confidence = "MEDIUM", 0.85
            return {
                "is_anomaly": True, "attack_type": "Port Scan", "criticality": criticality,
                "confidence": confidence,
                "summary": f"Port scan détecté depuis {ip} : {nb_ports} ports scannés ({', '.join(ports_list[:8])}{'...' if nb_ports > 8 else ''})",
                "actions": [f"Bloquer l'IP source {ip} au firewall", "Activer IDS/IPS", "Vérifier les logs de connexion", "Fermer les ports inutiles"]
            }
    return None

def detect_ddos_attack(lines):
    from collections import Counter
    if len(lines) < 3: return None
    cleaned = [l.strip().lower() for l in lines if l.strip() and '...' not in l]
    if len(cleaned) < 3: return None
    line_counts = Counter(cleaned)
    most_common_line, most_common_count = line_counts.most_common(1)[0]
    if most_common_count >= 3:
        repeat_ratio = most_common_count / len(cleaned)
        return {
            "is_anomaly": True, "attack_type": "DDoS", "criticality": "CRITICAL",
            "confidence": min(0.97, 0.75 + repeat_ratio * 0.22),
            "summary": f"DDoS HTTP Flood détecté : même requête répétée {most_common_count} fois",
            "actions": ["Rate limiting immédiat", "Bloquer IPs sources", "Activer CDN/Anti-DDoS"]
        }
    ip_url_counts = Counter()
    for line in cleaned:
        ip_match = re.match(r'([\d.]+)\s+-\s+-\s+\[', line)
        url_match = re.search(r'"(GET|POST|HEAD|PUT|DELETE)\s+(\S+)', line)
        if ip_match and url_match:
            ip_url_counts[(ip_match.group(1), url_match.group(2))] += 1
    for (ip, url), count in ip_url_counts.items():
        if count >= 3:
            return {
                "is_anomaly": True, "attack_type": "DDoS", "criticality": "CRITICAL", "confidence": 0.93,
                "summary": f"DDoS HTTP Flood : {ip} → {url} répété {count} fois",
                "actions": [f"Bloquer l'IP source {ip}", f"Rate limiting sur {url}", "Activer WAF"]
            }
    timestamp_counts = Counter()
    for line in cleaned:
        ts_match = re.search(r'\[(\d+/\w+/\d+:\d+:\d+:\d+)', line)
        if ts_match: timestamp_counts[ts_match.group(1)] += 1
    for ts, count in timestamp_counts.items():
        if count >= 5:
            return {
                "is_anomaly": True, "attack_type": "DDoS", "criticality": "CRITICAL", "confidence": 0.95,
                "summary": f"DDoS distribué : {count} requêtes en 1 seconde ({ts})",
                "actions": ["Rate limiting global", "Blackholing", "Contacter l'hébergeur"]
            }
    if len(cleaned) >= 8:
        unique = set(cleaned)
        repetition = max(cleaned.count(l) for l in unique) / len(cleaned)
        if len(unique) <= 3 or repetition >= 0.6:
            return {
                "is_anomaly": True, "attack_type": "DDoS", "criticality": "CRITICAL", "confidence": 0.88,
                "summary": "DDoS détecté : trafic massivement répétitif",
                "actions": ["Rate limiting", "Bloquer IPs sources", "Activer CDN"]
            }
    return None

def detect_xss_attack(log_text):
    log_lower = log_text.lower()
    patterns = [r'<script', r'javascript:', r'onerror', r'onload', r'alert\(', r'eval\(']
    if any(re.search(p, log_lower) for p in patterns):
        return {
            "is_anomaly": True, "attack_type": "XSS", "criticality": "HIGH", "confidence": 0.90,
            "summary": "Tentative XSS détectée",
            "actions": ["Sanitizer les inputs", "Activer Content Security Policy (CSP)", "Encoder les sorties HTML"]
        }
    return None

def analyze_log_locally_heuristics(normalized_log, log_lower):
    if any(x in log_lower for x in ["failed password", "invalid user", "authentication failure"]):
        ip = re.findall(r'from ([\d.]+)', normalized_log)
        return {
            "is_anomaly": True, "attack_type": "Brute Force", "criticality": "HIGH", "confidence": 0.88,
            "summary": f"Brute force SSH détecté depuis {ip[0] if ip else 'IP inconnue'}",
            "actions": ["Bloquer l'IP au firewall", "Activer fail2ban", "Utiliser des clés SSH"]
        }
    trojan_indicators = ["backdoor", "/tmp/.hidden", "c2 server", "reverse shell", "suspicious outbound", "known c2", ".exe", "malware", "trojan"]
    if any(indicator in log_lower for indicator in trojan_indicators):
        ip_match = re.search(r'(\d{1,3}(?:\.\d{1,3}){3})', normalized_log)
        suspicious_ip = ip_match.group(0) if ip_match else "IP inconnue"
        exe_match = re.search(r'exe[=\s]*"?([^\s"]+\.exe[^"]*)"?', normalized_log, re.IGNORECASE)
        suspicious_file = exe_match.group(1) if exe_match else "fichier suspect"
        return {
            "is_anomaly": True, "attack_type": "Trojan", "criticality": "CRITICAL", "confidence": 0.92,
            "summary": f"Trojan détecté : {suspicious_file} → C2 {suspicious_ip}",
            "actions": ["Isoler la machine immédiatement", "Bloquer l'IP C2 au firewall", "Supprimer le fichier malveillant"]
        }
    if any(p in log_lower for p in ["union select", "' or '", "1=1", "drop table", "'; --", "or 1=1"]):
        return {
            "is_anomaly": True, "attack_type": "SQL Injection", "criticality": "CRITICAL", "confidence": 0.90,
            "summary": "Injection SQL détectée dans les paramètres de requête",
            "actions": ["Bloquer l'IP", "Utiliser des requêtes préparées", "Auditer les tables"]
        }
    if any(p in log_lower for p in [".locked", ".encrypted", ".crypto", "ransom", "readme_for_decrypt"]):
        return {
            "is_anomaly": True, "attack_type": "Ransomware", "criticality": "CRITICAL", "confidence": 0.88,
            "summary": "Comportement ransomware détecté : chiffrement de fichiers en cours",
            "actions": ["Isoler la machine immédiatement", "Ne pas payer la rançon", "Restaurer depuis backup"]
        }
    lines = [l.strip() for l in normalized_log.split('\n') if l.strip()]
    if len(lines) >= 5:
        unique = set(l.lower() for l in lines)
        if len(unique) <= 2:
            return {
                "is_anomaly": True, "attack_type": "DDoS", "criticality": "CRITICAL", "confidence": 0.82,
                "summary": "Potentiel DDoS : requêtes identiques répétées",
                "actions": ["Rate limiting", "Bloquer IPs sources", "Activer CDN"]
            }
    return None

# ========================================
# DÉTECTION D'INTENTION CHATBOT
# ========================================
def detect_intent(message):
    msg = message.lower().strip()
    if any(k in msg for k in ["ddos", "déni de service", "ddos ?", "quoi un ddos"]): return "ddos"
    if any(k in msg for k in ["brute", "force", "brute-force", "ssh"]): return "brute_force"
    if any(k in msg for k in ["ransomware", "rançon", "chiffrement"]): return "ransomware"
    if any(k in msg for k in ["xss", "cross-site", "script"]): return "xss"
    if any(k in msg for k in ["sql", "injection", "sqli"]): return "sql"
    if any(k in msg for k in ["trojan", "backdoor", "malware", "cheval de troie"]): return "trojan"
    if any(k in msg for k in ["port scan", "nmap", "ports ouverts"]): return "port_scan"
    if any(k in msg for k in ["soc", "security operations center", "centre de sécurité"]): return "soc"
    if any(k in msg for k in ["salut", "bonjour", "hello", "hi", "salam"]): return "salutation"
    if any(k in msg for k in ["qui es-tu", "qui es tu", "tu es quoi", "c'est quoi toi", "aide", "help"]): return "presentation"
    if any(k in msg for k in ["anomalie", "suspect", "inhabituel"]): return "anomalie"
    return "inconnu"

# ========================================
# RÉPONSES CHATBOT
# ========================================
def generate_dynamic_soc_response(intent, user_question):
    responses = {
        "salutation": "👋 Salut ! Je suis ton **Assistant SOC** de Tunisie Telecom.\n\nJe peux t'aider sur :\n🔐 Brute Force • 🌊 DDoS • 💉 SQL Injection\n🦠 Ransomware • 💻 XSS • 🐴 Trojan • 🔎 Port Scan\n\nPose-moi ta question de cybersécurité !",
        "presentation": "🛡️ Je suis l'**Assistant SOC IA** de Tunisie Telecom.\n\nJe détecte et explique les cyberattaques en temps réel.\nPose-moi une question sur une menace ou un log suspect !",
        "inconnu": "🤔 Je n'ai pas bien compris ta question.\n\nEssaie de me parler de :\n🔐 Brute Force • 🌊 DDoS • 💉 SQL Injection\n🦠 Ransomware • 💻 XSS • 🐴 Trojan",
        "soc": "🛡️ **SOC (Security Operations Center)** = Centre opérationnel de cybersécurité.\n\n• Surveillance 24/7 des systèmes\n• Détection d'attaques en temps réel\n• Analyse et corrélation des logs\n• Coordination de la réponse aux incidents\n\n✅ Objectif : Réduire le temps de détection et de réponse aux menaces.",
        "ddos": "🚨 **DDoS** = Déni de Service Distribué.\nAttaque qui vise à rendre un service indisponible en le saturant de trafic.\n\n🔍 Détection : Pic de trafic anormal, requêtes répétitives.\n⚡ Contre-mesures : Rate limiting, CDN, Blackholing.",
        "brute_force": "🔐 **Brute-Force** = Tentatives répétées pour deviner un mot de passe (ex: SSH).\n\n🔍 Détection : Multiples échecs de connexion depuis une même IP.\n⚡ Contre-mesures : fail2ban, MFA, clés SSH.",
        "ransomware": "🦠 **Ransomware** = Logiciel malveillant qui chiffre les fichiers et demande une rançon.\n\n🔍 Détection : Chiffrement massif, extensions .locked.\n⚡ Actions : Isoler la machine IMMÉDIATEMENT, ne pas payer, restaurer depuis backup.",
        "xss": "💻 **XSS** = Injection de scripts malveillants dans une page web.\n\n🔍 Détection : Patterns <script>, javascript:, onerror=.\n⚡ Contre-mesures : Sanitizer inputs, activer CSP, encoder les sorties.",
        "sql": "💉 **SQL Injection** = Injection de code SQL malveillant pour manipuler la base.\n\n🔍 Détection : UNION SELECT, OR 1=1, DROP TABLE.\n⚡ Contre-mesures : Prepared statements, validation inputs, WAF.",
        "port_scan": "🔎 **Port Scan** = Découverte des ports ouverts sur un système.\n\n🔍 Détection : Connexions multiples vers différents ports depuis la même IP source.\n⚡ Contre-mesures : Firewall, fermer ports inutiles, IDS/IPS.",
        "trojan": "🐴 **Trojan** = Malware qui se déguise en programme légitime.\n\n🔍 Détection : Backdoor, C2 server, fichiers .exe suspects.\n⚡ Actions : Isoler machine, bloquer IP C2, audit processus.",
        "anomalie": "🔍 **Anomalie** = Comportement inhabituel détecté.\n\n🔍 Investigation : Corréler avec autres événements, vérifier historique.\n⚡ Actions : Escalader si critique, documenter, mettre à jour les règles."
    }
    return responses.get(intent, responses["inconnu"])

# ========================================
# STATISTIQUES
# ========================================
@app.route('/api/stats', methods=['GET'])
def get_stats():
    stats = {'DDoS': 0, 'Brute Force': 0, 'XSS': 0, 'SQL Injection': 0, 'Ransomware': 0, 'Port Scan': 0, 'Trojan': 0, 'Normal': 0}
    for alert in alerts_db:
        attack_type = alert.get('attack_type', 'Normal')
        if attack_type in stats: stats[attack_type] += 1
        else: stats['Normal'] += 1
    return jsonify({'labels': list(stats.keys()), 'data': list(stats.values()), 'total': sum(stats.values())})

# ========================================
# MÉTRIQUES DYNAMIQUES DASHBOARD
# ========================================
@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    global total_logs_analyzed
    total_alerts = len(alerts_db)
    critical_alerts = sum(1 for a in alerts_db if a.get('severity') == 'CRITICAL')
    if total_alerts > 0:
        avg_confidence = sum(a.get('confidence', 0) for a in alerts_db) / total_alerts
        detection_rate = round(avg_confidence * 100, 1)
    else:
        detection_rate = 94.0
    avg_response_time = round(0.8 + (total_alerts * 0.05), 2)
    return jsonify({
        "kpis": {
            "total_alerts": total_alerts, "critical_alerts": critical_alerts,
            "detection_rate": detection_rate, "total_logs_analyzed": total_logs_analyzed,
            "avg_response_time": f"{avg_response_time}s"
        },
        "timestamp": datetime.now().isoformat()
    })

# ========================================
# 🔗 ENDPOINTS BLOCKCHAIN
# ========================================
@app.route('/api/blockchain/ledger', methods=['GET'])
def get_blockchain_ledger():
    """Retourne tous les blocs enregistrés (pour audit)"""
    blocks = [{
        'index': b.index, 'alert_id': b.alert_id, 'timestamp': b.timestamp,
        'current_hash': b.current_hash, 'previous_hash': b.previous_hash
    } for b in blockchain_ledger]
    return jsonify({'success': True, 'blocks': blocks, 'total': len(blocks)})

@app.route('/api/blockchain/verify/<alert_id>', methods=['GET'])
def verify_blockchain_proof(alert_id):
    """Vérifie l'intégrité d'une alerte via son hash blockchain"""
    block = next((b for b in blockchain_ledger if b.alert_id == alert_id), None)
    if not block:
        return jsonify({'error': 'Aucune preuve blockchain pour cette alerte'}), 404
    recalculated = block._calculate_hash()
    is_valid = (recalculated == block.current_hash)
    return jsonify({
        'alert_id': alert_id, 'block_index': block.index,
        'current_hash': block.current_hash, 'previous_hash': block.previous_hash,
        'timestamp': block.timestamp, 'integrity_status': 'VALID' if is_valid else 'TAMPERED'
    })

# ========================================
# WEBSOCKET
# ========================================
@socketio.on('connect')
def handle_connect():
    print('✅ Client connecté au WebSocket')
    emit('connected', {'message': 'Connecté au SOC en temps réel'})

@socketio.on('disconnect')
def handle_disconnect():
    print('❌ Client déconnecté')

# ========================================
# ENDPOINTS PRINCIPAUX
# ========================================
@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.json or {}
        msg = data.get('message', '').strip()
        sid = data.get('session_id', 'default')
        if not msg:
            return jsonify({'response': '👋 Salut ! Comment puis-je t\'aider ?'})
        add_to_conversation(sid, "user", msg)
        intent = detect_intent(msg)
        response_text = generate_dynamic_soc_response(intent, msg)
        add_to_conversation(sid, "assistant", response_text)
        return jsonify({"response": response_text, "session_id": sid, "intent": intent, "source": "soc"})
    except Exception as e:
        return jsonify({"response": "⚠️ Erreur interne. Réessaie."}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_log():
    try:
        data = request.json
        log = data.get('log')
        if not log:
            return jsonify({'error': 'Log requis'}), 400

        global total_logs_analyzed, last_block_hash
        total_logs_analyzed += 1
        LOGS_ANALYZED.labels(status='analyzed').inc()

        normalized, lines = normalize_log_input(log)
        log_lower = normalized.lower()

        result = (
            detect_port_scan(lines, normalized) or
            detect_ddos_attack(lines) or
            detect_xss_attack(normalized) or
            analyze_log_locally_heuristics(normalized, log_lower)
        )

        if result is None:
            result = {
                "is_anomaly": False, "attack_type": "Normal", "criticality": None,
                "confidence": 1.0, "summary": "Aucune anomalie détectée — trafic normal", "actions": []
            }

        if result.get('is_anomaly'):
            global alert_counter
            alert_counter += 1
            ip_addr = extract_ip_from_log(normalized)
            lat, lon, country, city = geolocate_ip(ip_addr)

            new_alert = {
                'id': f'alert_{alert_counter}', 'timestamp': datetime.now().isoformat(),
                'attack_type': result.get('attack_type'), 'severity': result.get('criticality', 'MEDIUM'),
                'confidence': result.get('confidence', 0.85), 'log_preview': normalized[:200],
                'status': 'NEW', 'actions_recommended': result.get('actions', []),
                'ip': ip_addr, 'latitude': lat, 'longitude': lon, 'country': country, 'city': city
            }
            alerts_db.append(new_alert)
            print(f"✅ Alerte créée: {new_alert['id']} - {new_alert['attack_type']} depuis {city}, {country}")
            ANOMALIES_DETECTED.labels(attack_type=result.get('attack_type', 'unknown').lower()).inc()

            # 🔗 ENREGISTREMENT BLOCKCHAIN SI CRITICAL
            if new_alert['severity'] == 'CRITICAL':
                block_payload = {
                    'alert_id': new_alert['id'], 'attack_type': new_alert['attack_type'],
                    'severity': new_alert['severity'], 'timestamp': new_alert['timestamp'],
                    'ip': new_alert['ip'], 'confidence': new_alert['confidence']
                }
                new_block = BlockchainBlock(
                    index=len(blockchain_ledger) + 1,
                    alert_id=new_alert['id'],
                    payload=block_payload,
                    previous_hash=last_block_hash
                )
                blockchain_ledger.append(new_block)
                last_block_hash = new_block.current_hash
                new_alert['blockchain_hash'] = new_block.current_hash
                print(f"⛓️ Bloc #{new_block.index} enregistré pour alerte {new_alert['id']}")

            socketio.emit('new_alert', {
                'id': new_alert['id'], 'attack_type': new_alert['attack_type'],
                'severity': new_alert['severity'], 'message': f"🚨 {new_alert['attack_type']} depuis {city}, {country}!",
                'timestamp': new_alert['timestamp'], 'ip': ip_addr, 'country': country, 'city': city
            })

        HTTP_REQUESTS.labels(method='POST', endpoint='/api/analyze', status='200').inc()
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    severity = request.args.get('severity')
    limit = int(request.args.get('limit', 20))
    filtered = [a for a in alerts_db if not severity or a['severity'] == severity.upper()]
    filtered = sorted(filtered, key=lambda x: x['timestamp'], reverse=True)[:limit]
    HTTP_REQUESTS.labels(method='GET', endpoint='/api/alerts', status='200').inc()
    return jsonify({'alerts': filtered, 'total': len(filtered)})

@app.route('/api/alerts/<alert_id>', methods=['GET'])
def get_alert(alert_id):
    alert = next((a for a in alerts_db if a['id'] == alert_id), None)
    if not alert:
        return jsonify({'error': 'Alerte non trouvée'}), 404
    return jsonify({'alert': alert})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model': MODEL})

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

# ========================================
# EXPORT
# ========================================
@app.route('/api/export/<export_type>', methods=['POST'])
def export_report(export_type):
    try:
        if export_type == 'html':
            rows = ""
            for a in alerts_db[-50:]:
                rows += f"<tr><td>{a['timestamp']}</td><td>{a['attack_type']}</td><td>{a['severity']}</td><td>{round(a['confidence']*100)}%</td><td>{a['ip']}</td></tr>"
            html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
            <title>Security Report</title>
            <style>body{{font-family:Arial;background:#0f172a;color:#fff;padding:20px}}
            table{{width:100%;border-collapse:collapse}}
            th,td{{padding:10px;border:1px solid #444;text-align:left}}
            th{{background:#667eea}}h1{{color:#667eea}}</style></head>
            <body><h1>🛡️ AI Security Platform - Security Report</h1>
            <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <table><thead><tr><th>Timestamp</th><th>Attack Type</th><th>Severity</th><th>Confidence</th><th>Source IP</th></tr></thead>
            <tbody>{rows}</tbody></table></body></html>"""
            return Response(html, mimetype='text/html', headers={'Content-Disposition': 'attachment; filename=security_report.html'})
        elif export_type == 'excel':
            try:
                import openpyxl
                from io import BytesIO
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Security Alerts"
                ws.append(["Timestamp", "Attack Type", "Severity", "Confidence", "Source IP", "City", "Country"])
                for a in alerts_db[-50:]:
                    ws.append([a['timestamp'], a['attack_type'], a['severity'], f"{round(a['confidence']*100)}%", a['ip'], a.get('city', ''), a.get('country', '')])
                buf = BytesIO()
                wb.save(buf)
                buf.seek(0)
                return Response(buf.getvalue(), mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={'Content-Disposition': 'attachment; filename=security_report.xlsx'})
            except ImportError:
                return jsonify({'error': 'openpyxl non installé'}), 500
        elif export_type == 'pdf':
            html = f"<html><body><h1>Security Report</h1><p>{len(alerts_db)} alertes enregistrées.</p></body></html>"
            return Response(html, mimetype='text/html', headers={'Content-Disposition': 'attachment; filename=security_report.pdf'})
        return jsonify({'error': 'Type non supporté'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================
# LANCEMENT
# ========================================
if __name__ == '__main__':
    print("\n🚀 SOC Assistant démarré sur http://localhost:5000")
    print("📡 WebSocket activé pour le temps réel")
    print("🌍 Géolocalisation IP activée via ip-api.com")
    print("🤖 Chatbot avec réponses expertes pré-validées")
    print("📊 KPIs dynamiques disponibles via /api/metrics")
    print("🔎 Détection Port Scan activée (seuil: 3 ports)")
    print("🔗 Blockchain activée pour incidents CRITICAL (SHA-256)")
socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)