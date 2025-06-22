console.log("Bot en cours de démarrage...");

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

const express = require('express');
const app = express();

// Quand quelqu’un accède à la racine du site ("/"), on répond juste "Bot is running."
app.get('/', (req, res) => {
  res.send('Bot is running.');
});

// Démarre le serveur sur le port défini par Railway (ou le 3000 par défaut)
app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 Serveur HTTP Express lancé pour le keep-alive');
});

import { Client, GatewayIntentBits, Partials } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember]
});

const ROLE_IDS = {
  Rookie: process.env.ROLE_ROOKIE,
  "Officier I": process.env.ROLE_OFFICIER_I,
  "Officier II": process.env.ROLE_OFFICIER_II,
  "Officier III": process.env.ROLE_OFFICIER_III
};

const FORMATION_IDS = {
  PPA: process.env.ROLE_PPA,
  Procédure: process.env.ROLE_PROC,
  "Call radio": process.env.ROLE_CALLRADIO,
  "Contrôle routier": process.env.ROLE_CONTROLE,
  "Périmètre de sécurité": process.env.ROLE_PERIMETRE
};

const CHANNEL_ABS = process.env.CHANNEL_ABSENCES;
const CHANNEL_SAN = process.env.CHANNEL_SANCTIONS;
const SHEET_URL = process.env.SHEET_WEBAPP_URL;

// Extrait matricule [xx] de pseudo
function extractMatricule(nick) {
  const m = nick.match(/\[(\d+)\]/);
  return m ? m[1] : null;
}

// Envoi POST au script Sheets
async function postToSheet(payload) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.error("Erreur envoi à Sheets:", e);
  }
}

// Surveille ajout de rôle
client.on("guildMemberUpdate", async (oldM, newM) => {
  const mat = extractMatricule(newM.nickname || newM.user.username);
  if (!mat) return;

  // changement de grade
  for (const [grade, id] of Object.entries(ROLE_IDS)) {
    const had = oldM.roles.cache.has(id);
    const has = newM.roles.cache.has(id);
    if (!had && has) {
      postToSheet({ type: "grade", matricule: mat, grade });
    }
  }

  // formation
  for (const [name, id] of Object.entries(FORMATION_IDS)) {
    const had = oldM.roles.cache.has(id);
    const has = newM.roles.cache.has(id);
    if (!had && has) {
      postToSheet({ type: "formation", matricule: mat, formation: name });
    }
  }
});

// Surveille absences & sanctions
client.on("messageCreate", msg => {
  if (msg.channel.id === CHANNEL_ABS || msg.channel.id === CHANNEL_SAN) {
    const mat = extractMatricule(msg.content);
    if (!mat) return;
    const type = msg.channel.id === CHANNEL_ABS ? "absence" : "sanction";
    const reason = msg.content.replace(/\[.*?\]\s*/, "");
    postToSheet({ type, matricule: mat, reason, timestamp: msg.createdTimestamp });
  }
});

client.login(process.env.BOT_TOKEN);

client.on("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
