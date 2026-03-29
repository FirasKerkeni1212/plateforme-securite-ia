content = open('app.py', 'r', encoding='utf-8').read()
endpoint = '\n# ENDPOINT CHATBOT SOC\n@app.route("/api/chatbot", methods=["POST", "OPTIONS"])\ndef chatbot():\n    if request.method == "OPTIONS":\n        return jsonify({}), 200\n    data = request.get_json(silent=True) or {}\n    intent = data.get("intent", "")\n    if intent == "get_stats":\n        return jsonify({"response": "Stats SOC: IPs trackees: " + str(len(ip_request_tracker))})\n    elif intent == "get_last_anomaly":\n        return jsonify({"response": "Derniere anomalie en cours de recuperation..."})\n    elif intent == "get_recommendations":\n        return jsonify({"response": "Recommandations: Activer fail2ban, bloquer IPs suspectes."})\n    else:\n        return jsonify({"response": "Essayez: stats du jour, derniere anomalie, recommandations."})\n\n'
marker = '# =========================\n# Lancement'
content = content.replace(marker, endpoint + marker)
open('app.py', 'w', encoding='utf-8').write(content)
print('Done:', content.count('def chatbot'), 'chatbot endpoint(s)')
