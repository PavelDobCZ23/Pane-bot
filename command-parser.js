require('dotenv').config();
const { Client } = require('discord.js');

class CommandParser {
  /**
  * @param client {Client}
  */
  constructor(client) {
    client.on('interactionCreate', async (ctx) => {
      if (!ctx.isChatInputCommand) return;
      const command = this.#commands[ctx.commandName];
      if (command.permissons) {
        const check = command.permissons(ctx);
        if (!check.passed) {
          ctx.reply(check.message);
        }
      };
      await command.run(ctx);
    });

    this.#client = client;
  }

  registerCommand(name, options) {
    this.#commands[name] = options;
  }

  async registerAppCommands(guildId = null) {
    for (const command in this.#commands) {
      if (guildId) {
        const guild = await this.#client.guilds.fetch(guildId);
        guild.commands.create(command);
      } else {
        this.#client.application.commands.create(command);
      }
    }
    console.log('Registered app command/s sucessfully.');
  }

  async deleteAppCommands(commandIds,guildId = null) {
    for (const commandId of commandIds) {
      if (guildId) {
        const guild = await this.#client.guilds.fetch(guildId);
        guild.commands.delete(commandId);
      } else {
        this.#client.application.commands.delete(commandId);
      }
    }
    console.log('Deleted app command/s sucessfully.');
  }

  #client = null;
  #commands = {};
}

module.exports = {
  CommandParser: CommandParser
}