lines = open('app.py', 'r', encoding='utf-8').readlines()

# Trouver la ligne get_last_anomaly dans chatbot
start = None
end = None
for i, l in enumerate(lines):
    if 'elif intent == "get_last_anomaly"' in l:
        start = i
    if start and i > start and 'elif intent ==' in l:
        end = i
        break

print(f'get_last_anomaly: lignes {start+1} a {end}')
for i in range(start, end):
    print(f'{i+1}: {repr(lines[i])}')

# Remplacer par le nouveau code
new_block = [
    '        elif intent == "get_last_anomaly":\n',
    '            if last_anomalies:\n',
    '                a = last_anomalies[-1]\n',
    '                return jsonify({"response": (\n',
    '                    "Derniere anomalie detectee :\\n"\n',
    '                    "- Type : " + a["attack_type"] + "\\n"\n',
    '                    "- IP : " + a["ip"] + "\\n"\n',
    '                    "- Criticite : " + a["criticality"] + "\\n"\n',
    '                    "- Confiance : " + str(round(a["confidence"]*100)) + "%\\n"\n',
    '                    "- Heure : " + a["timestamp"] + "\\n"\n',
    '                    "- Resume : " + a["summary"]\n',
    '                )})\n',
    '            else:\n',
    '                return jsonify({"response": "Aucune anomalie detectee depuis le demarrage."})\n',
    '\n',
]

new_lines = lines[:start] + new_block + lines[end:]
open('app.py', 'w', encoding='utf-8').writelines(new_lines)
print('Done! Lines:', len(new_lines))

import py_compile
try:
    py_compile.compile('app.py', doraise=True)
    print('Syntax OK!')
except py_compile.PyCompileError as e:
    print('Syntax ERROR:', e)
