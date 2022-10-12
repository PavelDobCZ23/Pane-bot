require('dotenv').config();
const config = require('./../config.json');
const mysql = require('mysql2');
const { SlashCommandBuilder, Client, Interaction, EmbedBuilder} = require('discord.js');

class LevelsWorker {
/**
 * @param {Client} client 
 */
constructor(client) {
    this.#client = client;
}
execute() {
    const client = this.#client;
    const connection = mysql.createConnection({
        host: config.database.host,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: config.database.name
    });
    connection.connect((error) => {
        if (error) throw error;
    });
    client.on('messageCreate', async (msg) => {
        const levelData = await queryResult({sql:`SELECT * FROM user_levels WHERE id = ?`,values:[msg.author.id]},connection);
        const currentDate = Date.now();
        if (msg.author.bot) return;
        if (!levelData.length) {
            connection.query({sql:`INSERT INTO user_levels (id, level, xp, last_msg) VALUES (?, 1, 10, ?)`,values:[msg.author.id,currentDate]},errorCallback)
            await msg.reply('This must be your first message here, welcome \\:D');
        } else if (levelData[0].last_msg + config.levels.xpCooldown <= currentDate) {
            let level = levelData[0].level;
            let xp = levelData[0].xp;
            xp += randInt(config.levels.xpGain[0],config.levels.xpGain[1]);
            const nextLevelXp = Math.ceil(config.levels.baseXpRequired + (config.levels.baseXpRequired * config.levels.levelXpMultiplier * (level - 1)));
            if (xp >= nextLevelXp) {
                level++;
                await msg.reply(`Congrats! You've just leveled up to level **${level}**!`);
            }
            connection.query({sql:`UPDATE user_levels SET level = ?, xp = ?, last_msg = ? WHERE id = ?`,values:[level,xp,currentDate,msg.author.id]},errorCallback);
        }
    })
}
#client;
}

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

function randInt(min, max) {
    max++;
    return Math.floor(Math.random() * (max - min)) + min;
}

function resolveMemberName(member) {
    return `${member.displayName}#${member.user.discriminator}`;
}

//Commands
/**
 * @param {Interaction} ctx 
 */
async function levelCommand(ctx) {
    let levelData,levelEmbed;
    const connection = mysql.createConnection({
        host: config.database.host,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: config.database.name
    });
    connection.connect(errorCallback);
    switch(ctx.options.getSubcommand(false)) {
        case 'get':
            const memberOption = ctx.options.getUser('member', false);
            const member = memberOption ? await ctx.guild.members.fetch(memberOption.id) : ctx.member;
            levelData = await queryResult({sql:`SELECT * FROM user_levels WHERE id = ?`,values:[member.id]}, connection);
            if (!levelData.length) {
                levelEmbed = new EmbedBuilder({title: 'Level Stats',color:member.displayColor,description:`Data not found.`})
                .setAuthor({name:resolveMemberName(member),iconURL: member.displayAvatarURL()})
                .setFooter({text:`Pantopia Levelling - ${member.id}`});
            } else {
                const xpRequired = Math.ceil(config.levels.baseXpRequired + (config.levels.baseXpRequired * config.levels.levelXpMultiplier * (levelData[0].level - 1)));
                levelEmbed = new EmbedBuilder({title: 'Level Stats',color:member.displayColor,description:`Level: **${levelData[0].level}** XP: **${levelData[0].xp}**\n XP required to level up: **${xpRequired}**`})
                .setAuthor({name:resolveMemberName(member),iconURL: member.displayAvatarURL()})
                .setFooter({text:`Pantopia Levelling - ${member.id}`});
            }
            ctx.reply({embeds:[levelEmbed]});
            break;
        case 'leaderboard':
            let leaderboard = '';
            levelData = await queryResult({sql:`SELECT * FROM user_levels ORDER BY 'xp';`},connection);
            for (let index = 0;index < 10;index++) {
                leaderboard += `#${index+1} <@${levelData[index].id}> - Level **${levelData[index].level}** *(${levelData[index].xp} xp)*\n`;
                if (levelData[index+1] == null) index = 11;
            }
            levelEmbed = new EmbedBuilder({title: 'Level Leaderboard',color:0x0021f1,description:leaderboard})
            .setFooter({text:`Pantopia Levelling`});
            ctx.reply({embeds:[levelEmbed]});
            break;
    }
    connection.end(errorCallback);
} 

const levelBuild = new SlashCommandBuilder()
    .setName('levels')
    .setDescription('Interacts with the levelling system.')
    .addSubcommand(subcommand => 
        subcommand
        .setName('get')
        .setDescription('Gets and shows your level stats.')
        .addUserOption(option =>
                option
                .setName('member')
                .setDescription('Optionally specified member to get the stats of.')
                .setRequired(false)

            )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('leaderboard')
        .setDescription('Shows the level leaderboard.')
    ).toJSON();

const LevelCommands = {
    levels: {
        build: levelBuild,
        run: levelCommand,
        guildOnly: true
    }
}

module.exports = { worker: LevelsWorker, commands: LevelCommands }