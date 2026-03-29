lines = open('app.py', 'r', encoding='utf-8').readlines()

# Supprimer les lignes 523-534 (tracker mal place) et corriger le return
new_lines = lines[:522] + [
    '        "blockchain_recorded": False,\n',
    '        "mode":              "Hybrid: Rules + Ollama/Phi3"\n',
    '    }\n',
]
new_lines += lines[537:]
open('app.py', 'w', encoding='utf-8').writelines(new_lines)
print('Done! Lines:', len(new_lines))

# Verifier syntaxe
import py_compile
try:
    py_compile.compile('app.py', doraise=True)
    print('Syntax OK!')
except py_compile.PyCompileError as e:
    print('Syntax ERROR:', e)
