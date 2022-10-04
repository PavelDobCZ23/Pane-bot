const {Client, EmbedBuilder, messageLink} = require('discord.js');
const config = require('./../config.json');
const modConfig = config.moderation;
class ModerationWorker {
/** @arg {Client} client */
constructor(client) {
    this.#client = client;
}

execute() {
    const client = this.#client;
    client.on('messageCreate', async (msg) => {
        //Owner ping check
        if (msg.mentions?.members?.has(msg.guild.ownerId) && !msg.member.permissions?.has('ManageMessages')) {
          await msg.reply('Don\'t ping him man....');
          await msg.member.timeout(modConfig.timeout.ownerPing, 'Pinging the owner.');
          
        }
        //Anti-spam
        if (!msg.member.permissions?.has('ManageMessages')) {
            let msgAmount = 0;
            msg.channel.messages.cache.every((cacheMsg) => {
                const spamCheckTimestamp = msg.createdTimestamp - modConfig.antiSpam.treshold;
                if (cacheMsg.member.id === msg.member.id && spamCheckTimestamp <= cacheMsg.createdTimestamp) {
                    msgAmount++;
                }
                if (msgAmount >= modConfig.antiSpam.messages || spamCheckTimestamp > cacheMsg.createdTimestamp) {
                    return false;
                } else {
                    return true;
                }
            });
            if (msgAmount >= modConfig.antiSpam.messages) {
                await msg.member.timeout(modConfig.timeout.ownerPing,'Spam.');
                await msg.reply('Whoa, you better stop over there this isn\'t a racing game.');
                const logChannel = await msg.guild.channels.fetch(modConfig.logChannelId);
                const logEmbed = new EmbedBuilder({title:'Spam Detected',color:0xfe2815})
                .setAuthor({name:resolveMemberName(msg.member),iconURL:msg.member.displayAvatarURL()})
                .addFields({name:'Channel:',value:`<#${msg.channelId}>`})
                .addFields({name:'Link:',value:msg.url})
                .setFooter({text:`Pantopia Moderation - ${msg.member.id}`});
                await logChannel.send({embeds:[logEmbed]});
            }
        }
    });
}

#client;
}

function resolveMemberName(member) {
    return `${member.displayName}#${member.user.discriminator}`;
}


module.exports = { worker: ModerationWorker }