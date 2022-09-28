require('dotenv').config();
const { REST, SlashCommandBuilder, Routes, Client } = require('discord.js');
const { clientId, guildId } = require('./config.json');

class CommandParser {
  /**
  * @param client {Client}
  */
  constructor(client) {
    client.on('interactionCreate', (interaction) => {
      if (!interaction.isChatInputCommand) return;
      const command = this.#commands[interaction.commandName];
      command.run(interaction);
    });

    this.#client = client;
    this.#rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  }

  registerCommand(name, options) {
    this.#commands[name] = options;
  }

  async registerAppCommands(guildId = null) {
    const commands = [];
    for (const command in this.#commands) {
      commands.push(this.#commands[command].commandBuild);
    }
    if (guildId) {
      await this.#rest.put(Routes.applicationGuildCommands(`${this.#client.user.id}`, guildId), {body: commands});
      console.log('Registered sucessfully.');
    } else {
      await this.#rest.put(Routes.applicationCommands(`${this.#client.user.id}`), {body: commands});
      console.log('Registered sucessfully.');
    }
  }

  async deleteAppCommands(commandIds,guildId = null) {
    for (const commandId of commandIds) {
      if (guildId) {
        await this.#rest.delete(Routes.applicationGuildCommand(`${this.#client.user.id}`, guildId, commandId));
      } else {
        await this.#rest.delete(Routes.applicationCommand(`${this.#client.user.id}`, commandId));
      }
    }
  }

  #client = null;
  #rest = null;
  #commands = {};

}

module.exports = {
  CommandParser: CommandParser
}