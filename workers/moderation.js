class ModerationWorker {
    constructor(client) {
        this.#client = client;
    }

    execute() {
        this.#client.on('messageCreate', async function (message) {
            console.log(message.content);
            if (message.mentions.members.has('349561249769455617') && !message.member.permissions.has('ManageMessages')) {
              await message.reply('Don\'t ping him man....');
              await message.member.timeout(1000 * 60, 'Pinging the owner.');
            }
        });
    }

    #client = null;
}

module.exports = { worker: ModerationWorker }