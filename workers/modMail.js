require('dotenv').config();
const config = require('./../config.json');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2'); 
const { Interaction, EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');

class ModmailWorker {
    constructor(client) {
        this.#client = client;
    }

    execute() {
        //Database connection
        const connection = mysql.createConnection({
            host: config.database.host,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: config.database.name
        });
        connection.connect((err) => {
            if (err) throw err;
        });

        //Message handling
        this.#client.on('messageCreate', async (message) => {
            let logLine, guild, messageEmbed, member;
            if (message.content.startsWith('!!') || message.author.bot) return;
            if (message.channel.isDMBased()) {
                const lookupMember = await queryResult(`SELECT * FROM open_modmails WHERE member_id = '${message.author.id}'`, connection);
                if (lookupMember.length) {
                    const addedAttachments = message.attachments.size ? '(attached file/s)' : '';
                    guild = this.#client.guilds.cache.get(config.guildId);
                    member = await guild.members.fetch(message.author.id);
                    logLine = `${resolveMemberName(member)}(member) - ${message.content}${addedAttachments} @ ${new Date().toUTCString()}`;
                    messageEmbed = new EmbedBuilder({title: 'Modmail',timestamp: new Date(), description: message.content, color: member.displayColor})
                        .setAuthor({name:resolveMemberName(member), iconURL: member.displayAvatarURL()})
                        .setFooter({text:`Pantopia Modmail - ${lookupMember[0].member_id}`});
                    const channel = await guild.channels.fetch(lookupMember[0].channel_id);
                    await channel.send({embeds:[messageEmbed],files: message.attachments.toJSON()});
                    
                }
            } else if (message.channel.parentId === config.modmail.categoryId) {
                const lookupChannel = await queryResult(`SELECT * FROM open_modmails WHERE channel_id = '${message.channelId}'`, connection);
                if (lookupChannel.length) {
                    const addedAttachments = message.attachments.size ? '(attached file/s)' : '';
                    guild = message.guild;
                    member = await guild.members.fetch(lookupChannel[0].member_id);
                    logLine = `${resolveMemberName(message.member)}(mod) - ${message.content}${addedAttachments} @ ${new Date().toUTCString()}\n`;
                    messageEmbed = new EmbedBuilder({title: 'Modmail',timestamp: new Date(), description: message.content, color: message.member.displayColor})
                        .setAuthor({name:resolveMemberName(message.member), iconURL: message.member.displayAvatarURL()})
                        .setFooter({text:`Pantopia Modmail - ${lookupChannel[0].member_id}`});
                    const user = member.user;
                    await user.send({embeds:[messageEmbed],files: message.attachments.toJSON()});

                }
            } else {
                return
            }
            //Log file
            fs.appendFile(path.resolve(`./logs/modmail/${member.id}.txt`),logLine,(error) => {
                if (error) throw error
            });
        });
    }
    #client = null;
}

function resolveMemberName(member) {
    return `${member.displayName}#${member.user.discriminator}`;
}

async function queryResult(query, connection) {
    return new Promise((resolve, reject) => {
        connection.query(query, (error,result) => {
            if (error) reject(error);
            resolve(result);
        });
    });
}

async function asyncReadFile(filepath, options = null) {
    return new Promise((resolve, reject) => {
        fs.readFile(filepath, options, (error,data) => {
            if (error) reject(error);
            resolve(data);
        });
    });
}

//Commands
/**
 * @param {Interaction} ctx 
 */
 async function modmailCommand(ctx) {
    let guild, member, channel, modmailEmbed, logFile, logPath;
    const connection = mysql.createConnection({
        host: config.database.host,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: config.database.name
    });
    connection.connect((error) => {
        if (error) throw error;
    });
    switch (ctx.options.getSubcommand(false)) {
        case 'open':
            console.log(ctx);
            if (!ctx.channel.isDMBased()) {
                ctx.reply('Modmail should be only opened in direct messages!');
                return;
            }
            const memberLookup = await queryResult(`SELECT * FROM open_modmails WHERE member_id = '${ctx.user.id}'`, connection);
            if (memberLookup.length) {
                ctx.reply('You can only have one ticket open at a time!');
                break;
            }

            //Channel stuff
            guild = ctx.client.guilds.cache.get(config.guildId);
            member = await guild.members.fetch(ctx.user.id);
            channel = await guild.channels.create({name:`✉-${resolveMemberName(member).replace('#','-')}`, parent:config.modmail.categoryId});
            logPath = path.resolve(`./logs/modmail/${member.id}.txt`);

            //Log
            logFile = ['*Modmail log file - All dates are UTC*',
            `Member: ${resolveMemberName(member)} - ${ctx.user.id}`,
            `Date Opened: ${new Date().toUTCString()}`,
            'Date Closed: N/A',
            `Reason Opened: ${ctx.options.getString('reason')}`,
            'Reason Closed: N/A',
            '','Messages:\n'].join('\n');
            fs.writeFile(logPath,logFile,(error) => {
                if (error) throw error;
            });

            //Database 2nd part
            connection.query(`INSERT INTO open_modmails (member_id, channel_id) VALUES (${ctx.user.id}, ${channel.id})`, (error) => {
                if (error) throw error;
            });

            //Confirmation message
            modmailEmbed = new EmbedBuilder({title: 'Modmail Ticket Opened', color: member.displayColor, timestamp: new Date()})
                .setAuthor({name: resolveMemberName(member), iconURL: member.displayAvatarURL()})
                .addFields({name: 'Reason:', value: ctx.options.getString('reason')})
                .setFooter({text: `Pantopia Modmail - ${ctx.user.id}`}).toJSON();
            await channel.send({embeds: [modmailEmbed]});
            ctx.reply('Modmail successfully opened! Wait for the moderators of the server to respond.');
            break;
        case 'close':
            let modmailLookup;
            if (ctx.channel.isDMBased()) {
                guild = ctx.client.guilds.cache.get(config.guildId);
                modmailLookup = await queryResult(`SELECT * FROM open_modmails WHERE member_id = '${ctx.user.id}'`,connection);
            } else if (ctx.channel.parentId === config.modmail.categoryId) {
                guild = ctx.guild;
                modmailLookup = await queryResult(`SELECT * FROM open_modmails WHERE channel_id = '${ctx.channel.id}'`,connection);
            } else {
                ctx.reply('You can only close modmail inside a ticket channel!');
                break;
            }
            member = await guild.members.fetch(modmailLookup[0].member_id);
            channel = await guild.channels.fetch(modmailLookup[0].channel_id);
            logPath = path.resolve(`./logs/modmail/${member.id}.txt`);

            //Log
            logFile = await asyncReadFile(logPath);
            logFile = logFile.toString('utf8').split('\n');
            logFile[1] = `Member: ${resolveMemberName(member)} - ${member.id}`;
            logFile[3] = `Date Closed: ${new Date().toUTCString()}`;
            logFile[5] = `Reason Closed: ${ctx.options.getString('reason')}`;
            logFile = logFile.join('\n');
            fs.writeFile(logPath,logFile,(error) => {
                if (error) throw error;
            })
            const attachment = new AttachmentBuilder(logPath, {name:'log-file.txt'});

            modmailEmbed = new EmbedBuilder({title: 'Modmail Ticket Closed', color: member.displayColor, timestamp: new Date()})
                .setAuthor({name: resolveMemberName(member), iconURL: member.displayAvatarURL()})
                .addFields({name: 'Closed by:', value: `<@${ctx.user.id}>`})
                .addFields({name: 'Closed at:', value: new Date().toUTCString()})
                .addFields({name: 'Reason:', value: ctx.options.getString('reason')})
                .setFooter({text: `Pantopia Modmail - ${member.id}`}).toJSON();
            
            const logChannel = await guild.channels.fetch(config.moderation.logChannelId);
            await logChannel.send({embeds:[modmailEmbed],files:[attachment]});
            try {
                member.send({embeds:[modmailEmbed],files:[attachment]});
            } catch {
                ctx.channel.send('Could not message the member, they might\'ve left the server.');
            }

            connection.query(`DELETE FROM open_modmails WHERE member_id = ${member.id}`, (error) => {
                if (error) throw error
            });

            ctx.reply('Ticket successfully closed!');
            channel.send('This channel will be deleted in 15 seconds!');
            setTimeout((channel,logPath) => {
                fs.unlink(logPath, (error) => {
                    if (error) throw error;
                })
                channel.delete();
            },15000,channel,logPath);
            break;
    }
    connection.end((error) => {
        if (error) throw error;
    });
}

const modmailBuild = new SlashCommandBuilder()
    .setName('modmail')
    .setDescription('Interacts with the modmail.')
    .addSubcommand(subcommand => 
        subcommand
            .setName('open')
            .setDescription('Opens a new modmail.')
            .addStringOption(option => 
                option
                    .setName('reason')
                    .setDescription('Your reason to open the modmail.')
                    .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
            .setName('close')
            .setDescription('Closes active modmail in the current channel.')
            .addStringOption((option) => 
                option
                    .setName('reason')
                    .setDescription('Your reason to close the modmail.')
                    .setRequired(true)
        )
    ).toJSON();

const ModmailCommands = {
    modmail: {
        build: modmailBuild,
        run: modmailCommand
    }
}


module.exports = { worker: ModmailWorker, commands: ModmailCommands }