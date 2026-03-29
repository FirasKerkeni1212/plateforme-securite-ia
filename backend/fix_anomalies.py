content = open('app.py', 'r', encoding='utf-8').read()

# 1. Ajouter last_anomalies apres ip_request_tracker
old1 = 'ip_request_tracker     = defaultdict(list)'
new1 = 'ip_request_tracker     = defaultdict(list)\nlast_anomalies = []  # stocke les 20 dernieres anomalies'

if old1 in content:
    content = content.replace(old1, new1)
    print('OK: last_anomalies ajoute')
else:
    print('ERREUR: ip_request_tracker non trouve')

# 2. Tracker anomalies dans analyze_log_hybrid
old2 = '        "blockchain_recorded": False,'
new2 = (
    '    if final["is_anomaly"]:\n'
    '        last_anomalies.append({\n'
    '            "attack_type": final["attack_type"],\n'
    '            "ip": ip,\n'
    '            "criticality": final["criticality"],\n'
    '            "confidence": final.get("confidence", 0.0),\n'
    '            "summary": final.get("summary", ""),\n'
    '            "timestamp": time.strftime("%H:%M:%S"),\n'
    '            "detected_by": detected_by\n'
    '        })\n'
    '        if len(last_anomalies) > 20:\n'
    '            last_anomalies.pop(0)\n'
    '        "blockchain_recorded": False,'
)

if old2 in content:
    content = content.replace(old2, new2)
    print('OK: tracker ajoute dans analyze_log_hybrid')
else:
    print('ERREUR: blockchain_recorded non trouve')

# 3. Mettre a jour get_last_anomaly dans chatbot
old3 = (
    '        elif intent == "get_last_anomaly":\n'
    '            # Derniere IP suspecte trackee\n'
    '            if ip_request_tracker:'
)
new3 = (
    '        elif intent == "get_last_anomaly":\n'
    '            if last_anomalies:'
)

if old3 in content:
    content = content.replace(old3, new3)
    print('OK: get_last_anomaly mis a jour')
else:
    print('INFO: get_last_anomaly pattern non trouve - ok si deja mis a jour')

# 4. Mettre a jour le contenu de get_last_anomaly
old4 = (
    '                now = time.time()\n'
    '                last_ip = max(ip_request_tracker, key=lambda ip: max(ip_request_tracker[ip]) if ip_request_tracker[ip] else 0)\n'
    '                count = len([t for t in ip_request_tracker[last_ip] if now - t <= DDOS_WINDOW_SECONDS])\n'
    '                return jsonify({\n'
    '                    "response": (\n'
    '                        f"🔍 Dernière activité suspecte :\\n"\n'
    '                        f"• IP : {last_ip}\\n"\n'
    '                        f"• Requêtes/60s : {count}\\n"\n'
    '                        f"• Statut : {\'⚠️ DDoS confirmé\' if count > DDOS_THRESHOLD_CONFIRMED else \'⚠️ Suspect\'}"\n'
    '                    )\n'
    '                })\n'
    '            else:\n'
    '                return jsonify({"response": "✅ Aucune anomalie récente détectée."})'
)
new4 = (
    '                a = last_anomalies[-1]\n'
    '                return jsonify({"response": (\n'
    '                    "Derniere anomalie detectee :\\n"\n'
    '                    "- Type : " + a["attack_type"] + "\\n"\n'
    '                    "- IP : " + a["ip"] + "\\n"\n'
    '                    "- Criticite : " + a["criticality"] + "\\n"\n'
    '                    "- Confiance : " + str(round(a["confidence"]*100)) + "%\\n"\n'
    '                    "- Heure : " + a["timestamp"] + "\\n"\n'
    '                    "- Resume : " + a["summary"]\n'
    '                )})\n'
    '            else:\n'
    '                return jsonify({"response": "Aucune anomalie detectee depuis le demarrage."})'
)

if old4 in content:
    content = content.replace(old4, new4)
    print('OK: contenu get_last_anomaly mis a jour')
else:
    print('INFO: contenu deja mis a jour ou pattern different')

open('app.py', 'w', encoding='utf-8').write(content)
print('Done! Occurrences last_anomalies:', content.count('last_anomalies'))
