const { SlashCommandBuilder } = require('discord.js');

class AdminWorker {
    constructor(client) {
        this.#client = client;
    }

    execute() {
        
    }
    #client = null;
}

//Commands
function dbCommand(ctx) {

}

function dbPerms(ctx) {

}

const dbBuild = new SlashCommandBuilder()
    .setName('db')
    .setDefaultMemberPermissions(8);

const AdminCommands = {
    db: {}
}

module.exports = { worker: AdminWorker }