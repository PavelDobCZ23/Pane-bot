require('dotenv').config();
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
  const commandParser = new CommandParser(client);
  commandParser.registerCommand('test', {
    commandBuild: new SlashCommandBuilder().setName('test').setDescription('test').toJSON(),
    run(interaction) {
      interaction.reply({content: `Test!`});
  }});
  //commandParser.registerAppCommands('1024008881908764812');
})

client.on('messageCreate', (message) => {
  console.log(message.content);
  if (message.mentions.members.has('349561249769455617') && !message.member.permissions.has('ManageMessages')) {
    message.reply('Don\'t ping him man....');
    message.member.timeout(1000 * 60,'Pinging the owner.')
  }
});

client.login(process.env.TOKEN);