from crewai import Agent, Task, Crew
from langchain_ollama import ChatOllama

# Configuration du LLM Ollama
llm = ChatOllama(
    model="phi3:mini",
    base_url="http://localhost:11434"
)

# Définition des agents avec le LLM configuré
analyst = Agent(
    role="Analyste Expert en Sécurité Réseau",
    goal="Analyser le log et détecter précisément s'il y a une anomalie de sécurité",
    backstory="Tu es un analyste SOC expérimenté spécialisé dans les logs SSH, firewall et authentification. Tu réponds toujours en français, de façon concise et factuelle.",
    llm=llm,
    allow_delegation=False,
    verbose=True,
    max_iter=10
)

remediator = Agent(
    role="Expert en Réponse aux Incidents Cybersécurité",
    goal="Proposer 2 à 4 actions techniques précises pour corriger ou atténuer la menace",
    backstory="Tu es spécialiste en iptables, firewalls, blocage d'IP, fail2ban et alertes. Tu réponds en français avec des actions concrètes et réalistes.",
    llm=llm,
    allow_delegation=False,
    verbose=True,
    max_iter=10
)

validator = Agent(
    role="Responsable Sécurité Senior",
    goal="Valider l'analyse, attribuer une criticité et prioriser l'action",
    backstory="Tu es le décideur final en sécurité. Tu vérifies la cohérence, la proportionnalité et l'urgence. Tu réponds en français avec une conclusion claire.",
    llm=llm,
    allow_delegation=False,
    verbose=True,
    max_iter=10
)

def analyze_with_crew(log_text):
    """Analyse un log avec les multi-agents CrewAI"""
    
    task1 = Task(
        description=f"Analyse UNIQUEMENT ce log de sécurité. Réponds en français au format exact suivant :\n\n"
                    f"Log analysé : {log_text}\n\n"
                    "Anomalie : oui ou non\n"
                    "Type : [type d'anomalie ou 'aucune']\n"
                    "Risque : faible/moyen/élevé/critique\n"
                    "Explication : [1-2 phrases courtes et factuelles]",
        expected_output="Anomalie : oui/non\nType : ...\nRisque : ...\nExplication : ...",
        agent=analyst
    )

    task2 = Task(
        description="En te basant UNIQUEMENT sur l'analyse précédente, propose 2 à 4 actions techniques précises (ex: bloquer IP avec iptables, activer fail2ban, alerter admin). "
                    "Numérote les actions et donne une courte justification pour chacune.",
        expected_output="1. Action - Justification\n2. Action - Justification\n...",
        agent=remediator
    )

    task3 = Task(
        description="Valide l'ensemble de l'analyse et des actions. Réponds au format exact :\n"
                    "Criticité : basse/moyenne/haute/critique\n"
                    "Action prioritaire : [l'action la plus urgente]\n"
                    "Justification : [2-3 phrases concises en français]",
        expected_output="Criticité : ...\nAction prioritaire : ...\nJustification : ...",
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
        full_text_lower = full_text.lower()

        # Détection d'anomalie robuste
        is_anomaly = any(word in full_text_lower for word in [
            "oui", "anomalie", "attaque", "brute force", "force brute", 
            "scan", "élevé", "critique", "suspect", "risque", "invalide", "failed"
        ])

        # Extraction de la criticité
        criticality = "moyenne"
        if "critique" in full_text_lower:
            criticality = "critique"
        elif "haute" in full_text_lower or "élevé" in full_text_lower:
            criticality = "haute"
        elif "basse" in full_text_lower or "faible" in full_text_lower:
            criticality = "basse"

        # Intégration blockchain si criticité haute/critique
        blockchain_status = None
        if criticality in ["critique", "haute"] and is_anomaly:
            try:
                from utils.blockchain import record_security_event
                blockchain_result = record_security_event(
                    log_text,
                    full_text[-800:],
                    "Actions proposées par les agents",
                    criticality
                )
                blockchain_status = blockchain_result.get("status")
                print(f"[BLOCKCHAIN] Enregistrement: {blockchain_status}")
            except Exception as e:
                print(f"[BLOCKCHAIN ERROR] {str(e)}")
                blockchain_status = "error"

        return {
            "full_analysis": full_text,
            "summary": full_text[-1200:].strip(),
            "is_anomaly": is_anomaly,
            "confidence": 0.97,
            "criticality": criticality,
            "blockchain_recorded": blockchain_status == "success"
        }
    
    except Exception as e:
        print(f"[CREW ERROR] {str(e)}")
        # Fallback en cas d'erreur
        return {
            "full_analysis": f"Erreur lors de l'analyse: {str(e)}",
            "summary": "Analyse indisponible - erreur système",
            "is_anomaly": False,
            "confidence": 0.0,
            "criticality": "inconnue",
            "blockchain_recorded": False
        }