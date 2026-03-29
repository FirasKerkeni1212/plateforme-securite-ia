content = open('app.py', 'r', encoding='utf-8').read()

start = content.find('# ENDPOINT CHATBOT SOC')
end = content.find('# =========================\n# Lancement')
old_endpoint = content[start:end]

new_endpoint = (
    "# ENDPOINT CHATBOT SOC\n"
    "@app.route(\"/api/chatbot\", methods=[\"POST\", \"OPTIONS\"])\n"
    "def chatbot():\n"
    "    if request.method == \"OPTIONS\":\n"
    "        return jsonify({}), 200\n"
    "    data = request.get_json(silent=True) or {}\n"
    "    intent = data.get(\"intent\", \"\")\n"
    "    if intent == \"get_stats\":\n"
    "        return jsonify({\"response\": \"Stats SOC - IPs trackees: \" + str(len(ip_request_tracker))})\n"
    "    elif intent == \"get_last_anomaly\":\n"
    "        return jsonify({\"response\": \"Derniere anomalie en cours de recuperation...\"})\n"
    "    elif intent == \"get_recommendations\":\n"
    "        return jsonify({\"response\": \"Recommandations: fail2ban, WAF, rate limiting, IDS/IPS.\"})\n"
    "    else:\n"
    "        return jsonify({\"response\": \"Essayez: stats du jour, derniere anomalie, recommandations.\"})\n"
    "\n\n"
)

content = content.replace(old_endpoint, new_endpoint)
open('app.py', 'w', encoding='utf-8').write(content)
print('Done! chatbot count:', content.count('def chatbot'))
