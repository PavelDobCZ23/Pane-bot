const {  } = require('discord.js');

class ModMailWorker {
    constructor(client) {
        this.#client = client;
    }

    execute() {
        
    }
    #client = null;
}

module.exports = { worker: ModMailWorker }