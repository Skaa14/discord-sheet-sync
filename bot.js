console.log("Bot en cours de démarrage...");

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

import express from 'express';
import { Client, GatewayIntentBits, Partials } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.get('/', (req, res) => res.send('Bot is running.'));
app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 Serveur HTTP Express lancé pour le keep-alive');
});

// --- Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember]
});

// --- Constantes ---
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

// --- Fonctions utilitaires ---
function extractMatricule(nick) {
  const m = nick.match(/\[(\d+)\]/);
  return m ? m[1] : null;
}

async function postToSheet(payload) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("Erreur envoi à Sheets:", e);
  }
}

// --- Événements Discord ---
client.on("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!valider") {
    const userId = message.author.id;
    const nickname = message.member.nickname || message.author.username;
    const mat = extractMatricule(nickname);
    const nom = nickname.replace(/\[\d+\]\s*/, '').trim();

    if (!mat) return message.reply("❌ Matricule introuvable dans ton pseudo.");

    postToSheet({ type: "grade", userId, matricule: mat, nom, grade: "Rookie" });
    message.reply('✅ Tu as été enregistré comme Rookie dans Google Sheets !');
  }

  if (message.content === "!presence") {
    const userId = message.author.id;

    try {
      const response = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const text = await response.text();
      console.log('Réponse Sheets:', text);

      if (response.ok) {
        message.reply('📋 Ta présence a bien été enregistrée dans la feuille !');
      } else {
        message.reply('❌ Une erreur est survenue côté Google Sheet.');
      }
    } catch (error) {
      console.error('Erreur fetch :', error);
      message.reply('⚠️ Impossible de contacter Google Sheet.');
    }
  }

  // Absences / sanctions
  if (message.channel.id === CHANNEL_ABS || message.channel.id === CHANNEL_SAN) {
    const mat = extractMatricule(message.content);
    if (!mat) return;
    const type = message.channel.id === CHANNEL_ABS ? "absence" : "sanction";
    const reason = message.content.replace(/\[.*?\]\s*/, "");
    postToSheet({ type, matricule: mat, reason, timestamp: message.createdTimestamp });
  }
});

client.on("guildMemberUpdate", async (oldM, newM) => {
  const user = newM.user;
  const userId = user.id;
  const nickname = newM.nickname || user.username;
  const mat = extractMatricule(nickname);
  const nom = nickname.replace(/\[\d+\]\s*/, '').trim();

  if (!mat) return;

  for (const [grade, id] of Object.entries(ROLE_IDS)) {
    const had = oldM.roles.cache.has(id);
    const has = newM.roles.cache.has(id);
    if (!had && has) {
      postToSheet({
        type: "grade",
        userId,
        matricule: mat,
        nom,
        grade
      });
    }
  }

  for (const [formation, id] of Object.entries(FORMATION_IDS)) {
    const had = oldM.roles.cache.has(id);
    const has = newM.roles.cache.has(id);
    if (!had && has) {
      postToSheet({
        type: "formation",
        userId,
        matricule: mat,
        nom,
        formation
      });
    }
  }
});

client.login(process.env.BOT_TOKEN);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
