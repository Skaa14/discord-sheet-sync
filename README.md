# Discord → Google Sheets Sync Bot

Automatisation pour synchroniser rôles, absences et sanctions avec Google Sheets.

## 🔧 Installation
1. Fork ce repo ou clone-le.
2. Renomme `.env.example` en `.env` avec tes infos.
3. Déploie sur Railway (ou similaire).
4. Assure-toi que bot a intents & permissions : GuildMembers, MessageContent, GuildMessages.

## 🧠 Fonctionnalités
- Détecte changement de grade & privilège formation
- Surveille messages dans canaux absences / sanctions
- Envoie données à ta Web App Google Sheets

## 🔌 Côté Google
Prévois une Web App Apps Script qui reçoit les POST.

Payloads :
```json
{ "type":"grade", "matricule":"05", "grade":"Rookie" }
{ "type":"formation", "matricule":"05", "formation":"PPA" }
{ "type":"absence", "matricule":"05", "reason":"<texte>" }
{ "type":"sanction", "matricule":"05", "reason":"<texte>" }
