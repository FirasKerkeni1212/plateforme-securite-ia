from crewai import Agent, Task, Crew

# Format reconnu par CrewAI pour Ollama local
LLM_MODEL = "ollama/tinyllama"

analyst = Agent(
    role="Analyste Expert en Sécurité Réseau",
    goal="Analyser le log et détecter toute anomalie avec précision",
    backstory="Tu es un analyste SOC expérimenté spécialisé dans les logs SSH, firewall et authentification.",
    llm=LLM_MODEL,
    allow_delegation=False,
    verbose=True
)

remediator = Agent(
    role="Expert en Réponse aux Incidents Cybersécurité",
    goal="Proposer des actions techniques détaillées et efficaces",
    backstory="Tu maîtrises iptables, firewalls, blocage d'IP et bonnes pratiques de sécurité.",
    llm=LLM_MODEL,
    allow_delegation=False,
    verbose=True
)

validator = Agent(
    role="Responsable Sécurité Senior",
    goal="Valider l'analyse et prioriser les actions",
    backstory="Tu es le décideur final qui vérifie la cohérence et l'urgence des recommandations.",
    llm=LLM_MODEL,
    allow_delegation=False,
    verbose=True
)

def analyze_with_crew(log_text):
    task1 = Task(
        description=f"Analyse attentivement ce log de sécurité et réponds en français :\n\n{log_text}\n\nIdentifie s'il y a une anomalie, de quel type, le niveau de risque (faible/moyen/élevé/critique) et explique pourquoi.",
        expected_output="Type d'anomalie (ou 'normal'), explication claire, niveau de risque",
        agent=analyst
    )

    task2 = Task(
        description="En te basant sur l'analyse précédente, propose une liste d'actions techniques précises pour corriger ou atténuer la menace (ex: bloquer IP, alerter admin, modifier règle firewall).",
        expected_output="Liste numérotée d'actions recommandées avec justification",
        agent=remediator
    )

    task3 = Task(
        description="Valide l'ensemble de l'analyse et des propositions. Donne la criticité finale, l'action prioritaire et une justification.",
        expected_output="Criticité finale (basse/moyenne/haute/critique), action prioritaire, justification",
        agent=validator
    )

    crew = Crew(
        agents=[analyst, remediator, validator],
        tasks=[task1, task2, task3],
        verbose=True  # Conversation visible dans la console Flask
    )

    result = crew.kickoff()

    full_text = str(result)

    return {
        "full_analysis": full_text,
        "summary": full_text[-800:].strip(),
        "is_anomaly": any(word in full_text.lower() for word in ["anomalie", "attaque", "suspect", "risque", "critique", "élevé"]),
        "confidence": 0.96
    }