from crewai import Agent, Task, Crew, LLM
import re

# LLM Ollama local – format CrewAI natif
llm = LLM(
    model="ollama/phi3:mini",
    base_url="http://localhost:11434",
    temperature=0.2,      # Très bas pour des réponses déterministes
    timeout=1800          # 30 minutes de timeout au lieu de 600s
)

# Agents
analyst = Agent(
    role="Analyste Expert en Sécurité Réseau",
    goal="Analyser le log et détecter précisément s'il y a une anomalie de sécurité",
    backstory="Tu es un analyste SOC expérimenté. Tu réponds toujours en français, de façon concise et factuelle.",
    llm=llm,
    allow_delegation=False,
    verbose=True,
    max_iter=5
)

remediator = Agent(
    role="Expert en Réponse aux Incidents Cybersécurité",
    goal="Proposer 2 à 4 actions techniques précises",
    backstory="Tu es spécialiste en iptables, fail2ban, blocage IP. Tu réponds en français avec des actions concrètes.",
    llm=llm,
    allow_delegation=False,
    verbose=True,
    max_iter=5
)

validator = Agent(
    role="Responsable Sécurité Senior",
    goal="Valider l'analyse, attribuer une criticité et prioriser l'action",
    backstory="Tu es le décideur final. Tu réponds en français avec une conclusion claire.",
    llm=llm,
    allow_delegation=False,
    verbose=True,
    max_iter=5
)

def parse_crew_output(full_text):
    """
    Parse la sortie complète du Crew et extrait les informations structurées
    """
    text_lower = full_text.lower()
    
    # 1. Détection précise d'anomalie (cherche "Anomalie : oui" dans la sortie)
    is_anomaly = "anomalie : oui" in text_lower
    
    # 2. Extraction de la criticité – cherche "Criticité : " partout dans le texte
    criticality = "basse"
    if "criticité : critique" in text_lower:
        criticality = "critique"
    elif "criticité : haute" in text_lower:
        criticality = "haute"
    elif "criticité : moyenne" in text_lower:
        criticality = "moyenne"
    # Fallback sur le risque si criticité non trouvée
    elif "risque : critique" in text_lower or "risque : élevé" in text_lower:
        criticality = "haute"
    
    # 3. Extraction de l'action prioritaire
    action_match = re.search(r'Action prioritaire\s*:\s*([^\n]+)', full_text, re.IGNORECASE)
    action_prioritaire = action_match.group(1).strip() if action_match else "Action non identifiée"
    
    # 4. Extraction de la justification
    justif_match = re.search(r'Justification\s*:\s*([^\n]+)', full_text, re.IGNORECASE)
    justification = justif_match.group(1).strip() if justif_match else ""
    
    # 5. Extraction des actions techniques (1., 2., 3., 4.)
    # Cherche "1. Action - " ou simplement "1. " suivi de texte long
    actions = []
    
    # Pattern 1: "1. Action - Texte :"
    pattern1 = re.findall(r'^\d+\.\s+Action\s*-\s*([^:]+):', full_text, re.MULTILINE)
    if pattern1:
        actions = [a.strip() for a in pattern1]
    
    # Pattern 2: Fallback "1. Texte :" (sans "Action -")
    if not actions:
        pattern2 = re.findall(r'^\d+\.\s+([^:]{30,}?):\s+', full_text, re.MULTILINE)
        if pattern2:
            actions = [a.strip() for a in pattern2 if len(a.strip()) > 20]
    
    print(f"[DEBUG] Actions extraites : {actions}")
    
    return {
        "is_anomaly": is_anomaly,
        "criticality": criticality,
        "action_prioritaire": action_prioritaire,
        "justification": justification,
        "actions": actions
    }

def analyze_with_crew(log_text):
    # Prompts ultra-stricts pour garantir un format parsable
    task1 = Task(
        description=f"Analyse UNIQUEMENT ce log de sécurité.\n"
                    f"RÈGLES IMPORTANTES :\n"
                    f"1. Si le log contient 'Accepted password' ou 'Accepted publickey', c'est une connexion NORMALE → Anomalie : non, Risque : faible.\n"
                    f"2. Si le log contient 'Invalid user' ou 'Failed password' UNE SEULE FOIS, c'est une tentative échouée NORMALE → Anomalie : non, Risque : faible.\n"
                    f"3. Si le log contient PLUSIEURS 'Failed password' ou 'invalid user' (au moins 3-5 fois), c'est une ANOMALIE (brute-force) → Anomalie : oui, Risque : élevé ou critique.\n"
                    f"4. Si 'Invalid user' est suivi de 'Accepted', c'est juste quelqu'un qui s'est trompé puis a réussi → Anomalie : non, Risque : faible.\n\n"
                    f"Log analysé : {log_text}\n\n"
                    "Réponds EXACTEMENT au format suivant :\n"
                    "Anomalie : oui ou non\n"
                    "Type : [type d'anomalie ou 'aucune']\n"
                    "Risque : faible/moyen/élevé/critique\n"
                    "Explication : [1-2 phrases courtes et factuelles]",
        expected_output="Format strict respecté",
        agent=analyst
    )

    task2 = Task(
        description="En te basant UNIQUEMENT sur l'analyse précédente, propose 2 à 4 actions techniques numérotées avec une courte justification pour chacune.",
        expected_output="1. Action - Justification\n2. Action - Justification...",
        agent=remediator
    )

    task3 = Task(
        description="Valide l'ensemble. Réponds EXACTEMENT au format :\n"
                    "Criticité : basse/moyenne/haute/critique\n"
                    "Action prioritaire : [l'action la plus urgente]\n"
                    "Justification : [2-3 phrases concises]",
        expected_output="Format strict respecté",
        agent=validator
    )

    crew = Crew(
        agents=[analyst, remediator, validator],
        tasks=[task1, task2, task3],
        verbose=True
    )

    try:
        result = crew.kickoff()
        full_text = str(result)
        
        # Accéder aussi aux résultats individuels des tasks pour avoir les actions
        task_outputs = {}
        for task in [task1, task2, task3]:
            try:
                task_outputs[task.description[:30]] = task.output.raw if hasattr(task.output, 'raw') else str(task.output)
            except:
                pass
        
        # Concaténer tous les outputs pour avoir l'ensemble complet
        combined_text = full_text
        for output in task_outputs.values():
            if output:
                combined_text += "\n" + str(output)
        
        print("\n=== PARSING DE LA SORTIE CREW ===")
        parsed = parse_crew_output(combined_text)
        print(f"Anomalie détectée : {parsed['is_anomaly']}")
        print(f"Criticité : {parsed['criticality']}")
        print(f"Actions trouvées : {len(parsed['actions'])}")
        print()

        # Blockchain si critique
        blockchain_status = None
        if parsed['criticality'] in ["critique", "haute"] and parsed['is_anomaly']:
            try:
                from utils.blockchain import record_security_event
                blockchain_result = record_security_event(
                    log_text=log_text,
                    analysis=full_text[-800:],
                    remediation="Actions proposées par les agents",
                    criticality=parsed['criticality'].capitalize()
                )
                blockchain_status = blockchain_result.get("status", "error")
                print(f"[BLOCKCHAIN] Statut : {blockchain_status.upper()}")
            except Exception as e:
                print(f"[BLOCKCHAIN ERROR] {str(e)}")
                blockchain_status = "error"

        return {
            "full_analysis": combined_text,
            "summary": f"{parsed['action_prioritaire']}. {parsed['justification']}",
            "is_anomaly": parsed['is_anomaly'],
            "confidence": 0.97,
            "criticality": parsed['criticality'],
            "actions": parsed['actions'],
            "blockchain_recorded": blockchain_status == "success"
        }

    except Exception as e:
        print(f"[CREW ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "full_analysis": f"Erreur : {str(e)}",
            "summary": "Analyse indisponible – erreur système",
            "is_anomaly": False,
            "confidence": 0.0,
            "criticality": "inconnue",
            "actions": [],
            "blockchain_recorded": False
        }