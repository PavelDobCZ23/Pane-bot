require('dotenv').config();
const { REST, Routes, Client, ContextMenuCommandAssertions } = require('discord.js');

class CommandParser {
  /**
  * @param client {Client}
  */
  constructor(client) {
    client.on('interactionCreate', async (ctx) => {
      console.log(ctx)
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
    this.#rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  }

  registerCommand(name, options) {
    this.#commands[name] = options;
  }

  async registerAppCommands(guildId = null) {
    const commands = [];
    for (const command in this.#commands) {
      commands.push(this.#commands[command].build);
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