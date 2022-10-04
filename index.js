//! Restrict some commands to serevsr only so they can't be run in DMs
//! Fix duplicate commands
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { CommandParser } = require('./command-parser');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessageReactions
  ]
});

const commandParser = new CommandParser(client);

client.once('ready', async () => {
  console.log('Pane better is online!');
  client.user.setActivity('Doin\' Stuff...');

  //Workers
  const workerDir = path.resolve('./workers/');
  for (const filePath of fs.readdirSync(workerDir)) {
    const { worker, commands } = require(path.join(workerDir,filePath));
    if (worker) new worker(client).execute();
    if (commands) {
      for (const commandName in commands) {
        commandParser.registerCommand(commandName,commands[commandName]);
      }
    }
  }
  console.log(client.application.commands.cache.each(command => console.log(command)));
  //commandParser.registerAppCommands();
})

client.login(process.env.TOKEN);