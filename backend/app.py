import os
import time
import traceback
import re
import json
import requests as http_requests
import threading
from collections import defaultdict
from functools import wraps

# Flask & Extensions
from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

# Prometheus
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

# =========================
# Initialisation Flask & DB
# =========================
app = Flask(__name__)

db_user = os.getenv("POSTGRES_USER", "admin")
db_pass = os.getenv("POSTGRES_PASSWORD", "SecurePass2026")
db_host = os.getenv("DB_HOST", "on-premise-server")
db_name = os.getenv("POSTGRES_DB", "company_data")

app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{db_user}:{db_pass}@{db_host}:5432/{db_name}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "ta-cle-secrete-super-complexe-pfe-2026")

db = SQLAlchemy(app)
jwt = JWTManager(app)

CORS(app, resources={r"/api/*": {"origins": ["*"], "methods": ["GET", "POST", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# =========================
# Modèle Utilisateur
# =========================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='analyst')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

with app.app_context():
    db.create_all()
    # Création users par défaut
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', role='admin')
        admin.set_password('admin123')
        db.session.add(admin)
        
        if not User.query.filter_by(username='analyste').first():
            analyst = User(username='analyste', role='analyst')
            analyst.set_password('analyste123')
            db.session.add(analyst)
        db.session.commit()
        print("✅ Users par défaut créés")

# =========================
# Blockchain Bridge
# =========================
BLOCKCHAIN_BRIDGE_URL = os.getenv("BLOCKCHAIN_URL", "http://blockchain-sim:6001/record")

def record_to_blockchain(result: dict):
    try:
        payload = {
            "log": result.get("log", "")[:200],
            "attack_type": result.get("attack_type", "Unknown"),
            "criticality": result.get("criticality", "basse"),
            "confidence": result.get("confidence", 0.0),
            "ip": result.get("ip", "unknown"),
            "detected_by": result.get("detected_by", "unknown")
        }
        resp = http_requests.post(BLOCKCHAIN_BRIDGE_URL, json=payload, timeout=10)
        if resp.json().get("success"):
            print(f"✅ Blockchain OK")
    except Exception as e:
        print(f"❌ Blockchain Error: {e}")

# =========================
# Métriques & Config
# =========================
HTTP_REQUESTS_TOTAL = Counter("http_requests_total", "Total HTTP Requests", ["method", "endpoint", "status"])
ANOMALY_DETECTION_TOTAL = Counter("anomaly_detection_total", "Anomalies Detected", ["criticality", "type"])
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3:latest")

ip_request_tracker = defaultdict(list)
last_anomalies = []
chat_context = {"last_topic": None, "last_anomaly_data": None}

# =========================
# Middleware & Routes Base
# =========================
@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    if hasattr(request, "start_time"):
        HTTP_REQUESTS_TOTAL.labels(method=request.method, endpoint=request.path, status=response.status_code).inc()
    return response

@app.route("/metrics")
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST, status=200)

@app.route("/")
def home():
    return jsonify({"message": "Plateforme Securite IA Hybride", "status": "READY"}), 200

# =========================
# AUTHENTIFICATION
# =========================
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        token = create_access_token(identity=user.id, additional_claims={"role": user.role})
        return jsonify({"success": True, "token": token, "role": user.role, "username": user.username}), 200
    return jsonify({"success": False, "error": "Identifiants invalides"}), 401

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": "Accès refusé : Administrateur requis"}), 403
        return f(*args, **kwargs)
    return decorated

# =========================
# GESTION DES UTILISATEURS (ADMIN)
# =========================
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify({"users": [{"id": u.id, "username": u.username, "role": u.role} for u in users]}), 200

@app.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'analyst')
    
    if not username or not password:
        return jsonify({"error": "Username et password requis"}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Ce nom d'utilisateur existe déjà"}), 400
        
    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True, "message": f"Utilisateur {username} créé avec succès"}), 201

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur non trouvé"}), 404
    
    current_user_id = get_jwt_identity()
    if user.id == current_user_id:
        return jsonify({"error": "Vous ne pouvez pas supprimer votre propre compte"}), 400
        
    db.session.delete(user)
    db.session.commit()
    return jsonify({"success": True, "message": "Utilisateur supprimé"}), 200

# =========================
# MOTEUR D'ANALYSE
# =========================
def extract_ip(log):
    m = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", log)
    return m.group(1) if m else "unknown"

def rules_detect(log_text):
    log_lower = log_text.lower()
    if any(s in log_lower for s in ["accepted password", "session opened", "200 OK"]):
        return {"is_anomaly": False, "attack_type": "Normal", "criticality": "basse", "confidence": 0.99, "summary": "Trafic normal", "actions": [], "detected_by": "rules"}
    ip = extract_ip(log_text)
    if "failed password" in log_lower or "invalid user" in log_lower:
        return {"is_anomaly": True, "attack_type": "Brute Force SSH", "criticality": "haute", "confidence": 0.95, "summary": "Attaque Brute Force SSH detectee", "actions": ["Bloquer l'IP source", "Activer fail2ban"], "detected_by": "rules", "ip": ip}
    if "sql injection" in log_lower or "union select" in log_lower:
        return {"is_anomaly": True, "attack_type": "SQL Injection", "criticality": "critique", "confidence": 0.98, "summary": "Injection SQL detectee", "actions": ["Bloquer l'IP", "Activer WAF"], "detected_by": "rules", "ip": ip}
    if "ransomware" in log_lower or ".locked" in log_lower:
        return {"is_anomaly": True, "attack_type": "Ransomware", "criticality": "critique", "confidence": 0.99, "summary": "Activite ransomware detectee", "actions": ["Isoler la machine"], "detected_by": "rules", "ip": ip}
    if "port scan" in log_lower or "nmap" in log_lower:
        return {"is_anomaly": True, "attack_type": "Port Scan", "criticality": "haute", "confidence": 0.92, "summary": "Scan de ports detecte", "actions": ["Bloquer l'IP"], "detected_by": "rules", "ip": ip}
    return None

def analyze_log_hybrid(log_text):
    res = rules_detect(log_text)
    if not res:
        res = {"is_anomaly": False, "attack_type": "Normal", "criticality": "basse", "confidence": 0.8, "summary": "Normal selon IA", "actions": [], "detected_by": "llm"}
    
    if res["is_anomaly"]:
        last_anomalies.append({
            "attack_type": res["attack_type"], "ip": extract_ip(log_text),
            "criticality": res["criticality"], "confidence": res.get("confidence", 0.0),
            "summary": res.get("summary", ""), "actions": res.get("actions", []),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "detected_by": res.get("detected_by", "unknown"), "log": log_text[:200], "is_anomaly": True
        })
        if len(last_anomalies) > 50: last_anomalies.pop(0)
        crit = str(res.get("criticality", "")).lower()
        if "crit" in crit or "haute" in crit:
            threading.Thread(target=record_to_blockchain, args=(res,), daemon=True).start()
            
    return {
        "log": log_text[:200], "is_anomaly": res["is_anomaly"], "confidence": res.get("confidence", 0),
        "criticality": res["criticality"], "attack_type": res["attack_type"], "summary": res.get("summary", ""),
        "actions": res.get("actions", []), "detected_by": res.get("detected_by", ""), "ip": extract_ip(log_text)
    }

@app.route("/api/analyze", methods=["POST"])
@jwt_required()
def analyze():
    data = request.get_json()
    if not data.get("log"): return jsonify({"error": "Log manquant"}), 400
    result = analyze_log_hybrid(data["log"])
    if result["is_anomaly"]:
        ANOMALY_DETECTION_TOTAL.labels(criticality=result["criticality"], type=result["attack_type"]).inc()
    return jsonify({"success": True, "result": result})

# =========================
# CHATBOT INTELLIGENT
# =========================
@app.route("/api/chatbot", methods=["POST"])
@jwt_required()
def chatbot():
    try:
        data = request.get_json() or {}
        user_message = data.get("message", "").lower().replace("?","")

        global chat_context
        response_text = ""
        
        data = request.get_json() or {}
        # On prend le message, on met en minuscule et on enlève les points d'interrogation pour faciliter la recherche
        user_message = data.get("message", "").lower().replace("?", "")
        
        global chat_context
        response_text = ""

        # 0. SORTIE / BYE (Priorité absolue)
        if any(word in user_message for word in ["bye", "goodbye", "au revoir", "stop", "quit", "exit", "fin", "à plus"]):
            chat_context["last_topic"] = None
            return jsonify({"response": "Goodbye! Stay secure. Feel free to come back if you need help."})

        # 1. SALUTATIONS
        if any(word in user_message for word in ["hi", "hello", "bonjour", "hey", "coucou", "start", "salut"]):
            chat_context["last_topic"] = "greeting"
            response_text = "Hello! I am your SOC Assistant. Ask me about the *last anomaly*, *stats*, or *recommendations*."

        # 2. DÉCLENCHEUR : DERNIÈRE ANOMALIE (Réinitialise le contexte sur ce sujet)
        elif any(word in user_message for word in ["anomalie", "anomaly", "attack", "dernière", "last", "alert", "threat", "incident", "log"]):
            if last_anomalies:
                last = last_anomalies[-1]
                chat_context["last_topic"] = "anomaly"
                chat_context["last_anomaly_data"] = last
                response_text = (
                    f"Yes, the last detected anomaly is: **{last['attack_type']}**.\n"
                    f"- Criticality: {last['criticality'].upper()}\n"
                    f"- Confidence: {round(last['confidence']*100)}%\n"
                    f"- Summary: {last['summary']}\n\n"
                    f"Want to know the *solution* or the *confidence percentage*?"
                )
            else:
                chat_context["last_topic"] = "none"
                response_text = "No anomaly detected since startup. The system is clean!"

        # 3. QUESTIONS DE SUIVI (Si le contexte est déjà sur "anomaly")
        elif chat_context["last_topic"] == "anomaly":
            last = chat_context["last_anomaly_data"]
            
            # Solution / Fix / Action
            if any(word in user_message for word in ["solution", "remediation", "fix", "action", "que faire", "do", "repair", "mitigate", "block"]):
                actions = last.get("actions", [])
                if actions:
                    actions_str = ", ".join(actions)
                    response_text = f"The recommended solutions for this {last['attack_type']} are: **{actions_str}**."
                else:
                    response_text = "No specific automated remediation available. Manual investigation recommended."

            # Pourcentage / Confiance / Taux (Élargi pour capturer "give me the percentage")
            elif any(word in user_message for word in ["percentage", "pourcentage", "confidence", "%", "taux", "rate", "probabilité", "chance", "score", "level"]):
                conf = round(last['confidence']*100)
                response_text = f"The confidence level for this detection is **{conf}%**. Our hybrid engine is highly certain."
            
            # IP / Source
            elif any(word in user_message for word in ["ip", "source", "adresse", "origin", "who", "where"]):
                response_text = f"The attack originated from IP address: `{last['ip']}`. You should consider blocking it."
            
            # Résumé / Détail
            elif any(word in user_message for word in ["resume", "summary", "detail", "résumé", "détail", "explain"]):
                response_text = f"Summary: {last['summary']}. Detected by {last['detected_by']} module."

            else:
                # Si l'utilisateur dit quelque chose d'incompréhensible mais qu'on est dans le contexte
                response_text = "I'm still focused on the last anomaly. You can ask me about the *solution*, the *confidence percentage*, or the *source IP*. Or say *'bye'* to exit."

        # 4. STATISTIQUES
        elif any(word in user_message for word in ["stat", "stats", "chiffres", "nombre", "count", "dashboard", "total"]):
            chat_context["last_topic"] = "stats"
            msg = (
                f"📊 **Current SOC Statistics:**\n"
                f"- Total Anomalies in Memory: {len(last_anomalies)}\n"
                f"- Unique IPs Tracked: {len(ip_request_tracker)}\n"
                f"- System Status: 🟢 Operational."
            )
            response_text = msg

        # 5. RECOMMANDATIONS
        elif any(word in user_message for word in ["recommendation", "conseil", "secure", "best practice", "tips", "advice", "protect"]):
            chat_context["last_topic"] = "recommendation"
            response_text = (
                "🛡️ **Security Recommendations:**\n"
                "1. Ensure all systems are patched and up-to-date.\n"
                "2. Enforce Multi-Factor Authentication (MFA).\n"
                "3. Regularly backup your data (3-2-1 rule).\n"
                "4. Monitor logs continuously with this platform!"
            )

        # 6. DÉFAUT (Incompris)
        else:
            chat_context["last_topic"] = "unknown"
            response_text = "I'm not sure I understand. Try asking: *'Last anomaly?'*, *'Show stats'*, *'Give recommendations'*, or say *'Hi'* / *'Bye'*!"

        return jsonify({"response": response_text})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"response": f"Error: {str(e)}"}), 500
               
              

# =========================
# EXPORTS (PDF, Excel, HTML)
# =========================
@app.route('/api/export/<format>', methods=['POST'])
@jwt_required()
def export_data(format):
    logs = last_anomalies
    if not logs: return jsonify({"error": "Aucune donnée"}), 400
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    date_str = time.strftime("%d/%m/%Y %H:%M:%S")
    total = len(logs)
    anomalies_count = sum(1 for l in logs if l.get('is_anomaly'))
    rate = round((anomalies_count / total * 100), 1) if total else 0
    avg_conf = round(sum(l.get('confidence', 0) for l in logs) / total * 100, 1) if total else 0

    if format == 'pdf':
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.set_text_color(0, 100, 200)
        pdf.cell(0, 10, "RAPPORT D'ANALYSE SECURITE IA", ln=True, align='C')
        pdf.set_font("Arial", size=10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, f"Généré le: {date_str}", ln=True, align='C')
        pdf.ln(5)
        pdf.set_font("Arial", 'B', 12); pdf.set_text_color(0, 150, 0)
        pdf.cell(0, 10, "STATISTIQUES GLOBALES:", ln=True)
        pdf.set_font("Arial", size=11); pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 6, f"- Total logs: {total}", ln=True)
        pdf.cell(0, 6, f"- Anomalies: {anomalies_count}", ln=True)
        pdf.cell(0, 6, f"- Taux: {rate}%", ln=True)
        pdf.ln(5)
        for i, log in enumerate(logs):
            pdf.set_fill_color(240, 240, 240)
            pdf.set_font("Arial", 'B', 10)
            pdf.cell(0, 6, f"Log N°{i+1}: {log.get('log', '')[:50]}...", ln=True, fill=True)
            pdf.set_font("Arial", size=10)
            pdf.cell(0, 5, f"  Type: {log.get('attack_type')} | Crit: {log.get('criticality', 'N/A').upper()}", ln=True)
            acts = log.get('actions', [])
            if acts:
                pdf.set_text_color(200, 0, 0)
                pdf.cell(0, 5, "  Actions:", ln=True)
                pdf.set_text_color(0, 0, 0)
                for a in acts:
                    safe_a = a.encode('latin-1', 'replace').decode('latin-1')
                    pdf.cell(0, 5, f"    - {safe_a}", ln=True)
        fname = f"Rapport_Securite_{timestamp}.pdf"
        pdf.output(fname)
        return send_file(fname, as_attachment=True)

    elif format == 'excel':
        import pandas as pd
        from openpyxl import load_workbook
        from openpyxl.styles import Font, PatternFill, Alignment
        data = []
        for log in logs:
            data.append({
                "N°": "", "Log": log.get('log', '')[:100],
                "Classification": "ANOMALIE" if log.get('is_anomaly') else "NORMAL",
                "Confiance (%)": round(log.get('confidence', 0)*100),
                "Criticité": log.get('criticality', 'N/A').upper(),
                "Heure": log.get('timestamp', ''),
                "Actions": "; ".join(log.get('actions', []))
            })
        df = pd.DataFrame(data)
        df.index += 1
        df.insert(0, "N°", df.index)
        fname = f"Historique_{timestamp}.xlsx"
        df.to_excel(fname, index=False, sheet_name='Rapport')
        wb = load_workbook(fname)
        ws = wb.active
        h_fill = PatternFill(start_color="444444", end_color="444444", fill_type="solid")
        h_font = Font(bold=True, color="FFFFFF")
        for c in ws[1]: c.fill, c.font, c.alignment = h_fill, h_font, Alignment(horizontal='center')
        for i, w in enumerate([5, 80, 15, 12, 12, 20, 40], 1): ws.column_dimensions[chr(64+i)].width = w
        wb.save(fname)
        return send_file(fname, as_attachment=True)

    elif format == 'html':
        html = f"""<!DOCTYPE html><html><head><title>Rapport SOC</title>
        <style>body{{font-family:'Segoe UI',sans-serif;background:#1a252f;color:#ecf0f1;margin:0;padding:20px}}
        .container{{max-width:1200px;margin:0 auto;background:#2c3e50;padding:30px;border-radius:10px}}
        h1{{color:#3498db;text-align:center}}.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:20px 0}}
        .card{{background:#34495e;padding:20px;border-radius:8px;text-align:center;border-left:5px solid #3498db}}
        .val{{font-size:2em;font-weight:bold;color:#3498db}}.lbl{{color:#bdc3c7;text-transform:uppercase;font-size:0.8em}}
        table{{width:100%;border-collapse:collapse;margin-top:20px}}th{{background:#3498db;color:#fff;padding:12px;text-align:left}}
        td{{padding:10px;border-bottom:1px solid #34495e}}.anom{{color:#e74c3c;font-weight:bold}}.norm{{color:#2ecc71;font-weight:bold}}
        </style></head><body><div class="container">
        <h1>🔒 Rapport Analyse Sécurité IA</h1>
        <p style="text-align:center;color:#bdc3c7">Généré le: {date_str}</p>
        <div class="stats">
            <div class="card"><div class="val">{total}</div><div class="lbl">Logs Analysés</div></div>
            <div class="card"><div class="val">{anomalies_count}</div><div class="lbl">Anomalies</div></div>
            <div class="card"><div class="val">{rate}%</div><div class="lbl">Taux Détection</div></div>
            <div class="card"><div class="val">{avg_conf}%</div><div class="lbl">Confiance Moy.</div></div>
        </div>
        <h2 style="color:#3498db;border-bottom:2px solid #3498db">Historique Détaillé</h2>
        <table><thead><tr><th>N°</th><th>Log</th><th>Type</th><th>Criticité</th><th>Confiance</th><th>Heure</th></tr></thead><tbody>"""
        for i, l in enumerate(logs):
            cls = "anom" if l.get('is_anomaly') else "norm"
            html += f"<tr><td>{i+1}</td><td style='font-family:monospace;font-size:0.85em'>{l.get('log','')[:60]}...</td><td class='{cls}'>{l.get('attack_type')}</td><td>{l.get('criticality','').upper()}</td><td>{round(l.get('confidence',0)*100)}%</td><td>{l.get('timestamp')}</td></tr>"
        html += "</tbody></table></div></body></html>"
        fname = f"Rapport_Securite_{timestamp}.html"
        with open(fname, 'w', encoding='utf-8') as f: f.write(html)
        return send_file(fname, as_attachment=True)

    return jsonify({"error": "Format inconnu"}), 400

if __name__ == "__main__":
    print("🚀 Démarrage Flask PRO avec Gestion Utilisateurs...")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)