const {  } = require('discord.js');

class ActivityWorker {
    constructor(client) {
        this.#client = client;
    }

    execute() {
        
    }
    #client = null;
}

module.exports = { worker: ActivityWorker }