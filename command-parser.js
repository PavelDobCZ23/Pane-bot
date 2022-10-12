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
      if (command.guildOnly && !ctx.guild) {
        ctx.reply('This command can\'t be used in DMs!');
        return;
      }
      if (command.permissions) {
        const check = command.permissions(ctx);
        if (!check.pass) {
          ctx.reply(check.message);
          return;
        }
      };
      try {
        await command.run(ctx);
      } catch (error) {
        ctx.channel.send(`Fatal Error!\n${error}`);
        console.error(error);
      }
    });

    this.#client = client;
  }

  registerCommand(name, options) {
    this.#commands[name] = options;
  }

  async registerAppCommands(guildId = null) {
    for (const commandName in this.#commands) {
      if (guildId) {
        const guild = await this.#client.guilds.fetch(guildId);
        await guild.commands.create(this.#commands[commandName].build);
      } else {
        await this.#client.application.commands.create(this.#commands[commandName].build);
      }
    }
    console.log('Registered app command/s sucessfully.');
  }

  async deleteAppCommands(commandIds,guildId = null) {
    for (const commandId of commandIds) {
      if (guildId) {
        const guild = await this.#client.guilds.fetch(guildId);
        await guild.commands.delete(commandId);
      } else {
        await this.#client.application.commands.delete(commandId);
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