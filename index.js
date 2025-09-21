import 'dotenv/config';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import pool from './db.js';
import fetch from 'node-fetch';
import { EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.once('ready', () => {
    console.log('Bot is online!');
    setInterval(checkMailUpdates, 20 * 60 * 1000); // 20 minutes
});

async function checkMailUpdates() {
    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE notifications_enabled = 1');
        if (users.length === 0) return;

        for (const user of users) {
            const mailResponse = await fetch('https://mail.hackclub.com/api/public/v1/mail', {
                headers: { 'Authorization': `Bearer ${user.api_key}` }
            });

            if (!mailResponse.ok) continue;

            const mailData = await mailResponse.json();
            const recentMail = mailData.mail.filter(item => new Date(item.updated_at) > new Date(user.last_checked));

            if (recentMail.length > 0) {
                const userDiscord = await client.users.fetch(user.discord_id);
                if (!userDiscord) continue;

                for (const item of recentMail) {
                    const itemResponse = await fetch(`https://mail.hackclub.com/api/public/v1/${item.type}s/${item.id}`, {
                        headers: { 'Authorization': `Bearer ${user.api_key}` }
                    });
                    if(!itemResponse.ok) continue;
                    const itemDetails = await itemResponse.json();
                    const latestEvent = itemDetails[item.type].events.sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at))[0];

                    const updateEmbed = new EmbedBuilder()
                        .setTitle(`<:orphmoji_scared:1419238538653728808> Update for your ${item.type}: ${item.title || 'Untitled'}`)
                        .setURL(item.public_url)
                        .setColor(0xec3750)
                        .setDescription(`🗓️ **New Event:** ${latestEvent.description}\n📌 **Location:** ${latestEvent.location || 'N/A'}`)
                        .setTimestamp(new Date(latestEvent.happened_at));
                    
                    await userDiscord.send({ embeds: [updateEmbed] });
                }
            }
            await pool.execute('UPDATE users SET last_checked = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        }
    } catch (error) {
        console.error('Error checking mail updates:', error);
    }
}

client.login(process.env.DISCORD_TOKEN);
