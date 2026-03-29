from transformers import pipeline

# Chargement du modèle zéro-shot (se fait une seule fois au démarrage)
classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)

def analyze_log(log_text):
    """
    Analyse un log et retourne :
    - Si c'est une anomalie ou non
    - Le niveau de confiance
    - Une suggestion simple
    """
    # Liste de catégories possibles
    candidate_labels = [
        "trafic normal",
        "tentative de connexion échouée",
        "accès suspect",
        "attaque par force brute",
        "scan de ports",
        "anomalie inconnue"
    ]

    # Classification
    result = classifier(log_text, candidate_labels)

    top_label = result["labels"][0]
    score = result["scores"][0]

    # Détermine si c'est une anomalie
    is_anomaly = "normal" not in top_label.lower()

    # Suggestion basique selon le type détecté
    if "force brute" in top_label.lower() or "connexion échouée" in top_label.lower():
        suggestion = "Bloquer l'IP source et alerter l'administrateur."
    elif "suspect" in top_label.lower() or "scan" in top_label.lower():
        suggestion = "Surveiller cet IP et vérifier les règles firewall."
    elif "anomalie" in top_label.lower():
        suggestion = "Analyse manuelle recommandée."
    else:
        suggestion = "Aucune action immédiate requise."

    return {
        "log": log_text,
        "classification": top_label,
        "confidence": round(score, 3),
        "is_anomaly": is_anomaly,
        "suggestion": suggestion
    }