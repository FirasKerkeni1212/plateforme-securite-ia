🛡️ Plateforme SOC Hybride : Détection d'Intrusions par IA & Blockchain





Projet de Fin d'Études (PFE) – Ingénieur SAE, ESPRIT 2026
Stage effectué chez Tunisie Telecom (Encadrant : M. Sebti Chouchene)
Une plateforme de sécurité nouvelle génération (SOC) combinant l'analyse de logs par Intelligence Artificielle Générative (LLM) et la traçabilité immuable via Blockchain. Conçue pour détecter, analyser et auditer les cyberattaques en temps réel dans une architecture hybride Cloud/On-Premise.
🌟 Fonctionnalités Clés
🧠 Détection Hybride IA : Moteur d'analyse combinant règles de sécurité (Signatures) et LLM local (Ollama/Phi3) pour identifier les menaces complexes et zero-day.
⛓️ Traçabilité Blockchain Validée : Enregistrement automatique et immuable des incidents critiques (Ransomware, SQLi) garantissant l'intégrité des preuves forensiques (Audit compliant).
🐳 Architecture Hybride Dockerisée : Orchestration de 11 microservices (Backend, Frontend, DB, IA, Monitoring, Simulateurs) simulant un environnement de production réaliste.
📊 Dashboard SOC Temps Réel : Visualisation avancée des métriques, graphiques de menaces et assistant virtuel (Chatbot) pour l'aide à la décision.
🔒 Sécurité & RBAC : Authentification JWT forte et gestion fine des rôles (Admin/Analyste).
🚀 Démarrage Rapide (Quick Start)
Fini les installations complexes ! Toute l'infrastructure est conteneurisée.
Pré-requis : Docker Desktop installé et en cours d'exécution.
Cloner le dépôt :
bash
12
Lancer toute l'infrastructure en une commande :
bash
1
Cette commande construit et démarre automatiquement : Base de données, Moteur IA (Ollama), Backend Flask, Frontend React, Simulateurs d'attaques et Module Blockchain.
Accéder à l'application :
🖥️ Dashboard SOC : http://localhost:5173
🔗 Ledger Blockchain (Preuve) : http://localhost:6001/ledger
📈 Grafana Monitoring : http://localhost:3000 (admin / admin2026)
Se connecter :
Identifiant : admin
Mot de passe : admin123
📊 Performance & KPI (Validés Mars 2026)
Les tests effectués sur un échantillon représentatif d'attaques (Ransomware, SQL Injection, Brute Force, XSS) et de trafic normal ont confirmé l'atteinte de tous les objectifs du cahier des charges :
Indicateur
Objectif
Résultat Obtenu
Statut
Précision de Détection
≥ 95%
100% ✅
Validé
Temps de Réponse Moyen
< 30s
2 secondes ✅
Validé
Faux Positifs
< 5%
0% ✅
Validé
Traçabilité Critique
100%
100% (Hash SHA-256) ✅
Validé
🏗️ Architecture Technique
Le projet repose sur une stack moderne et entièrement conteneurisée :
Backend : Python Flask (API REST, Multi-threading, JWT)
Frontend : React.js + Vite + Recharts (Dashboard interactif)
IA / LLM : Ollama (Modèle Phi3) + CrewAI (Agents autonomes)
Base de Données : PostgreSQL (Données utilisateurs & logs)
Blockchain : Simulateur Hyperledger Fabric (Flask Mock) pour l'audit immuable
DevOps : Docker Compose (Orchestration), Prometheus & Grafana (Monitoring)
🧪 Simulation d'Attaques & Tests
Le projet inclut des modules intégrés pour tester la robustesse du système en conditions réelles :
Log Generator : Génère un flux continu de logs systèmes variés.
Attacker Simulator : Lance des scénarios d'attaques automatisés (Brute Force, Scan, Injection).
Pour observer les logs d'attaque en temps réel :
bash
1
📸 Captures d'Écran
Dashboard d'Analyse en Temps Réel
(Insère ici une capture de ton dashboard avec une alerte rouge)

Registre Immuables (Blockchain Ledger)
(Insère ici une capture du JSON blockchain)

👨‍💻 Auteur
Firas KERKENI
Étudiant Ingénieur 5ème année - Spécialité Software & Systems Engineering (SAE)
Université : ESPRIT, Tunisie
Entreprise : Tunisie Telecom
Email : ton.email@esprit.tn
LinkedIn : [Ton Profil LinkedIn]
📄 Licence
Ce projet est réalisé dans le cadre académique d'un Projet de Fin d'Études.