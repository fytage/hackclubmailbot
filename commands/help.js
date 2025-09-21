import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays information about all available commands.');

export async function execute(interaction) {
    const helpEmbed = new EmbedBuilder()
        .setTitle('Help')
        .setDescription('Here is a list of all my commands and what they do:')
        .setColor(0xec3750)
        .addFields(
            { name: '/letters', value: 'Check your Hack Club letters and their details.' },
            { name: '/packages', value: 'Check your Hack Club packages and their details.' },
            { name: '/setup', value: 'Set up the bot with your Hack Club Mail API key.' },
            { name: '/stats', value: 'View statistics about your Hack Club mail.' },
            { name: '/notifications', value: 'Manage automatic notifications for mail updates.' },
            { name: '/deleteme', value: 'Remove your API key and data from the bot.' },
            { name: '/help', value: 'Shows this help message.' }
        );

    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
}
