import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('mail')
    .setDescription('Check your Hack Club mail.');

export async function execute(interaction, pool) {
    const userId = interaction.user.id;

    try {
        const [rows] = await pool.execute('SELECT api_key FROM users WHERE discord_id = ?', [userId]);

        if (rows.length === 0) {
            return interaction.reply({
                content: 'You have not set up your API key yet. Please use the /setup command.',
                ephemeral: true,
            });
        }

        const apiKey = rows[0].api_key;

        await interaction.deferReply({ ephemeral: true });

        const mailResponse = await fetch('https://mail.hackclub.com/api/public/v1/mail', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!mailResponse.ok) {
            if (mailResponse.status === 401) {
                return interaction.editReply({
                    content: 'Your API key is invalid. Please set it again with /setup.',
                });
            }
            throw new Error(`API request failed with status ${mailResponse.status}`);
        }

        const mailData = await mailResponse.json();

        if (!mailData.mail || mailData.mail.length === 0) {
            return interaction.editReply({
                content: 'You have no mail.',
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Your Hack Club Mail')
            .setColor(0xec3750);

        mailData.mail.slice(0, 5).forEach(item => { // Show up to 5 items
            embed.addFields({
                name: item.title || 'Untitled',
                value: `**Status:** ${item.status}\n**Created:** ${new Date(item.created_at).toLocaleDateString()}\n[View Online](${item.public_url})`,
                inline: false
            });
        });
        
        if (mailData.mail.length > 5) {
            embed.setFooter({ text: `Showing 5 of ${mailData.mail.length} items.` });
        }

        await interaction.editReply({
            embeds: [embed],
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply({
            content: 'An error occurred while fetching your mail.',
        });
    }
}
