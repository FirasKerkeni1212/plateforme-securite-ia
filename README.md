# Plateforme Sécurité IA - PFE 2025-2026

**Plateforme hybride cloud-réseaux sécurisée intégrant IA générative locale et coordination multi-agents pour l'analyse automatisée de logs de sécurité et la génération de configurations sécurisées.**

Projet de Fin d'Études – 5ᵉ année SAE – Esprit – Stage chez DataAxion  
Encadrant : M. Sebti Chouchene  
Auteur : Firas Kerkeni

## Fonctionnalités principales

- Analyse contextuelle de logs en temps réel avec IA générative locale (Ollama + phi3:mini)
- Système multi-agents collaboratifs (CrewAI) :  
  - Analyste → détection d’anomalies  
  - Remédiateur → propositions d’actions techniques (iptables, Fail2Ban, etc.)  
  - Validateur → évaluation de la criticité & priorisation
- Interface web moderne et intuitive (React + Vite + Tailwind)
- Détection précise des menaces (brute force SSH, scans de ports, etc.)
- Traçabilité immuable des événements critiques via blockchain Hyperledger Fabric (en cours de finalisation)

## Technologies utilisées

- **Backend** : Python 3.11, Flask, CrewAI, LangChain-Ollama
- **IA locale** : Ollama + modèle phi3:mini (3.8B paramètres)
- **Frontend** : React 18, Vite, Axios, Tailwind CSS
- **Blockchain** : Hyperledger Fabric v2.5 (test-network + chaincode Go)
- **Conteneurisation** : Docker + Docker Compose (simulation environnement hybride)

## Lancement rapide (en local)

1. **Prérequis**  
   - Python 3.11+  
   - Node.js 20+  
   - Ollama installé & lancé (`ollama run phi3:mini` dans un terminal séparé)

2. **Backend**  
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   python app.py
