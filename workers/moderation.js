const {Client, EmbedBuilder, Interaction, SlashCommandBuilder, PermissionFlagsBits} = require('discord.js');
const mysql = require('mysql2');
const config = require('./../config.json');
const modConfig = config.moderation;
const profanityRegex = /(\bcunt\b)|(\btwat\b)|(\bbastard\b)|(\bslut\b)|(\bd[i1]ck\b)|(\bcum\b)|(\bass?h[o0]le\b)/i
const discordInviteRegex = /((https?:\/\/)?discord\.gg\/[\w\d-]+)|((https?:\/\/)?discord\.com\/invite\/[\w\d-]+)/i
class ModerationWorker {
/** @arg {Client} client */
constructor(client) {
    this.#client = client;
}

execute() {
    const client = this.#client;
    client.on('messageCreate', async (msg) => {
        if (!msg.guild) return
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
        //Profanity filter
        if (msg.content.match(profanityRegex)) {
            await msg.reply(`You have used banned word in your message ${msg.member}!`);
            await msg.delete();
            const logChannel = await msg.guild.channels.fetch(modConfig.logChannelId);
            const logEmbed = new EmbedBuilder({title:'Profanity Detected',color:0xfe2815,description:msg.content})
            .setAuthor({name:resolveMemberName(msg.member),iconURL:msg.member.displayAvatarURL()})
            .addFields({name:'Channel:',value:`<#${msg.channelId}>`})
            .setFooter({text:`Pantopia Moderation - ${msg.member.id}`});
            await logChannel.send({embeds:[logEmbed]});
        }
        //Discord Invites Filter
        if (msg.content.match(discordInviteRegex)) {
            await msg.reply(`Good try, invites don't belong here ${msg.member}...`);
            await msg.delete();
            const logChannel = await msg.guild.channels.fetch(modConfig.logChannelId);
            const logEmbed = new EmbedBuilder({title:'Discord Link Detected',color:0xfe2815,description:msg.content})
            .setAuthor({name:resolveMemberName(msg.member),iconURL:msg.member.displayAvatarURL()})
            .addFields({name:'Channel:',value:`<#${msg.channelId}>`})
            .setFooter({text:`Pantopia Moderation - ${msg.member.id}`});
            await logChannel.send({embeds:[logEmbed]});
        }
    });
}

#client;
}

function resolveMemberName(member) {
    return `${member.displayName}#${member.user.discriminator}`;
}
//Commands:

const warnBuild = new SlashCommandBuilder()
.setName('warn')
.setDescription('Manages warns of a member.')
.addSubcommand(subcommand =>
    subcommand
    .setName('lookup')
    .setDescription('Find information about warns of a member.')
    .addUserOption(option =>
        option
        .setName('member')
        .setDescription('Member to lookup. MOD ONLY')
        .setRequired(false)
    )
)
.addSubcommand(subcommand =>
    subcommand
    .setName('add')
    .setDescription('Warn a member. MOD ONLY')
    .addUserOption(option =>
        option
        .setName('member')
        .setDescription('Member to warn.')
        .setRequired(true)
    )
    .addStringOption(option =>
        option
        .setName('reason')
        .setDescription('Reason to warn.')
        .setRequired(true)
    )
)
.addSubcommand(subcommand =>
    subcommand
    .setName('remove')
    .setDescription('Unwarn member. MOD ONLY')
    .addUserOption(option =>
        option
        .setName('member')
        .setDescription('Member to unwarn.')
        .setRequired(true)
    )
    .addStringOption(option =>
        option
        .setName('reason')
        .setDescription('Reason to unwarn.')
        .setRequired(true)
    )
)

async function warnCommand(ctx) {
    const connection = mysql.createConnection({
        host: config.database.host,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: config.database.name
    });
    connection.connect(errorCallback);

    let logEmbed, reason, warnAmount, warnEmbed;
    const userId = ctx.options.getUser('member') ? ctx.options.getUser('member').id : ctx.member.id;
    const member = await ctx.guild.members.fetch(userId);
    const warnData = await queryResult({sql:`SELECT * FROM member_warns WHERE id = ?`,values:[userId]}, connection);
    switch (ctx.options.getSubcommand()) {
        case 'lookup':
            warnAmount = warnData.length ? `${warnData[0].amount}` : '0';
            warnEmbed = new EmbedBuilder({title:'Warn Lookup',color:member.displayColor})
            .setAuthor({name:resolveMemberName(member),iconURL:member.displayAvatarURL()})
            .addFields({name:'Amount:',value: warnAmount})
            .setFooter({text:`Pantopia Moderation - ${userId}`});
            ctx.reply({embeds:[warnEmbed]});
            break;
        case 'add':
            reason = ctx.options.getString('reason');
            warnAmount = warnData.length ? `${warnData[0].amount + 1}` : '1';

            if (!warnData.length) {
                connection.query({sql:`INSERT INTO member_warns (id, amount) VALUES (?, 1)`,values:[userId]}, errorCallback);
            } else {
                connection.query({sql:`UPDATE member_warns SET amount = ? WHERE id = ?`,values:[warnAmount,userId]},errorCallback);
            }

            logEmbed = new EmbedBuilder({title:'Member Warn',color:0xA45F1B})
            .setAuthor({name:resolveMemberName(member),iconURL:member.displayAvatarURL()})
            .addFields({name:'Moderator:',value: `<@${ctx.member.id}>`})
            .addFields({name:'Reason:',value: reason})
            .addFields({name:'Amount Now:',value: warnAmount})
            .setFooter({text:`Pantopia Moderation - ${userId}`});
            ctx.reply(`Warned <@${userId}> for ${reason}`);
            break;
        case 'remove':
            if (!warnData.length || warnData[0].amount <= 0) {
                ctx.reply('This member currently doesn\'t have any warns!');
                break;
            }
            reason = ctx.options.getString('reason');
            warnAmount = `${warnData[0].amount - 1}`;

            connection.query({sql:`UPDATE member_warns SET amount = ? WHERE id = ?`,values:[warnAmount,userId]},errorCallback);

            logEmbed = new EmbedBuilder({title:'Member Unwarn',color:0x5FA41B})
            .setAuthor({name:resolveMemberName(member),iconURL:member.displayAvatarURL()})
            .addFields({name:'Moderator:',value: `<@${ctx.member.id}>`})
            .addFields({name:'Reason:',value: reason})
            .addFields({name:'Amount Now:',value: warnAmount})
            .setFooter({text:`Pantopia Moderation - ${userId}`});
            ctx.reply(`Unwarned <@${userId}> for ${reason}`);
            break;
    }
    if (logEmbed) {
        const logChannel = await ctx.guild.channels.fetch(modConfig.logChannelId);
        await logChannel.send({embeds:[logEmbed]});
    }
    connection.end(errorCallback);
}

/**
 * @param {Interaction} ctx 
 * @returns {boolean}
 */
function warnPerms(ctx) {
    if (ctx.member.permissions.has('ModerateMembers')) return {pass:true};
    if (ctx.options.getSubcommand() === 'lookup' && !ctx.options.getUser('member')) return {pass:true};
    return {pass:false, message:'You can only lookup your own warns!'};
}

// Functions 
async function queryResult(query, connection) {
    return new Promise((resolve, reject) => {
        connection.query(query, (error,result) => {
            if (error) reject(error);
            resolve(result);
        });
    });
}

function errorCallback(error) {
    if (error) throw error;
}

function resolveMemberName(member) {
    return `${member.displayName}#${member.user.discriminator}`;
}
/*
const timeoutBuild = new SlashCommandBuilder()
.setName('timeout')
.setDescription('Manages timeout of a member.')
.addUserOption(option => 
    option
    .setName('member')
    .setDescription('Member to timeout.')
    .setRequired(true)
)
.addNumberOption(option => 
    option
    .setName('seconds')
    .setDescription('Timeout amount in seconds (set to 0 to remove timeout).')
    .setRequired(true)
)
.addStringOption(option => 
    option
    .setName('reason')
    .setDescription('Reason to timeout the member.')
    .setRequired(true)
)
.setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers).toJSON();

async function timeoutCommand(ctx) {
    const timeoutMs = ctx.options.getNumber('seconds') * 1000;
    const timeoutMember = await ctx.guild.members.fetch(ctx.options.getUser('member').id);
    await timeoutMember.timeout(timeoutMs,ctx.options.getString('reason'));
    if (timeoutMs) {
        ctx.reply({content:`Successfully timeouted <@${timeoutMember.id}> for ${timeoutMs/1000} seconds.`,allowedMentions:false});
    } else {
        ctx.reply({content:`Successfully removed timeout of <@${timeoutMember.id}>.`,allowedMentions:false});
    }
}
*/

const ModerationCommands = {
    warn: {
        build: warnBuild,
        run: warnCommand,
        permissions: warnPerms,
        guildOnly: true
    }
}

module.exports = { worker: ModerationWorker, commands: ModerationCommands }