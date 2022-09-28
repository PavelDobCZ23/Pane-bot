const { SlashCommandBuilder } = require('discord.js');
const { CommandParser } = require('./../command-parser.js');

class CommandsWorker {
    constructor(client) {
        this.#client = client;
    }

    execute() {
        const commandParser = new CommandParser(this.#client);
        commandParser.registerCommand('test', {
          commandBuild: new SlashCommandBuilder().setName('test').setDescription('test').toJSON(),
          run(interaction) {
            interaction.reply({content: `Test!`});
        }});
        //commandParser.registerAppCommands('1024008881908764812');
    }
    #client = null;
}

module.exports = { worker: CommandsWorker }