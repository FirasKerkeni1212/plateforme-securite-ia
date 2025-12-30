from crewai import Agent, Task, Crew

# Modèle recommandé : gemma2:2b – stable sur Windows, bonnes réponses en français, rapide
LLM_MODEL = "ollama/phi3:mini"
# Si tu veux tester tinyllama (plus rapide mais moins précis), décommente la ligne suivante :
# LLM_MODEL = "ollama/tinyllama"

# Agent 1 : Analyste
analyst = Agent(
    role="Analyste Expert en Sécurité Réseau",
    goal="Analyser le log fourni et détecter précisément s'il contient une anomalie de sécurité",
    backstory="Tu es un analyste SOC expérimenté. Tu analyses uniquement des logs système, SSH, firewall et authentification. Tu réponds toujours en français et de manière concise.",
    llm=LLM_MODEL,
    allow_delegation=False,
    verbose=True
)

# Agent 2 : Remédiateur
remediator = Agent(
    role="Expert en Réponse aux Incidents Cybersécurité",
    goal="Proposer des actions techniques précises et réalistes pour corriger ou atténuer la menace détectée",
    backstory="Tu es spécialiste en iptables, firewalls, blocage d'IP, alertes et bonnes pratiques de sécurité. Tu réponds en français avec des actions concrètes.",
    llm=LLM_MODEL,
    allow_delegation=False,
    verbose=True
)

# Agent 3 : Validateur
validator = Agent(
    role="Responsable Sécurité Senior",
    goal="Valider l'analyse et la remédiation, attribuer une criticité et prioriser l'action",
    backstory="Tu es le décideur final en sécurité. Tu vérifies la cohérence, la proportionnalité et l'urgence. Tu réponds en français avec une conclusion claire.",
    llm=LLM_MODEL,
    allow_delegation=False,
    verbose=True
)

def analyze_with_crew(log_text):
    # Tâche 1 : Analyse du log
    task1 = Task(
        description=f"Analyse ce log de sécurité et réponds UNIQUEMENT sur la base de son contenu, en français :\n\n{log_text}\n\n"
                    "Identifie s'il y a une anomalie. Si oui : type d'anomalie, niveau de risque (faible, moyen, élevé, critique) et explication courte. "
                    "Si non : dis simplement 'Aucun risque détecté'.",
        expected_output="Anomalie : oui/non, Type, Niveau de risque, Explication courte",
        agent=analyst
    )

    # Tâche 2 : Remédiation
    task2 = Task(
        description="En te basant strictement sur l'analyse précédente, propose 2 à 4 actions techniques précises pour corriger ou atténuer le risque (ex: bloquer IP, alerter admin, renforcer règle firewall). "
                    "Numérote les actions et donne une courte justification pour chacune.",
        expected_output="Liste numérotée d'actions avec justification",
        agent=remediator
    )

    # Tâche 3 : Validation finale
    task3 = Task(
        description="Valide l'analyse et les actions proposées. Donne : "
                    "- Criticité finale (basse/moyenne/haute/critique) "
                    "- L'action prioritaire à exécuter en premier "
                    "- Une justification concise en français",
        expected_output="Criticité, Action prioritaire, Justification",
        agent=validator
    )

    # Création de l'équipe
    crew = Crew(
        agents=[analyst, remediator, validator],
        tasks=[task1, task2, task3],
        verbose=True  # Tu verras toute la conversation dans la console Flask
    )

    # Exécution
    result = crew.kickoff()

    full_text = str(result)

    # Détection simple d'anomalie pour l'interface
    is_anomaly = any(word in full_text.lower() for word in [
        "anomalie", "attaque", "brute force", "force brute", "scan", "élevé", "critique", "suspect", "risque"
    ])

    return {
        "full_analysis": full_text,
        "summary": full_text[-800:].strip(),  # Dernière partie (la plus pertinente)
        "is_anomaly": is_anomaly,
        "confidence": 0.96
    }