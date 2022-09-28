require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { CommandParser } = require('./command-parser');
const { Client, GatewayIntentBits, Interaction, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log('Pane better is online!');
  client.user.setActivity('Doin\' Stuff...');

  //Workers
  const workerDir = path.resolve('./workers/');
  for (const filePath of fs.readdirSync(workerDir)) {
    const { worker } = require(path.join(workerDir,filePath));
    new worker(client).execute();
  }
})

client.login(process.env.TOKEN);