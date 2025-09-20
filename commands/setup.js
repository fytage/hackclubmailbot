import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Enter your Hack Club Mail API key.')
    .addStringOption(option =>
        option.setName('api-key')
            .setDescription('Your API key from https://mail.hackclub.com/api/k')
            .setRequired(true));

export async function execute(interaction, pool) {
    const userId = interaction.user.id;
    const apiKey = interaction.options.getString('api-key');

    try {
        const [rows] = await pool.execute(
            'INSERT INTO users (discord_id, api_key) VALUES (?, ?) ON DUPLICATE KEY UPDATE api_key = ?',
            [userId, apiKey, apiKey]
        );
        await interaction.reply({ content: 'Your API key has been saved!', ephemeral: true });
    } catch (error) {
        console.error('Error saving API key:', error);
        await interaction.reply({ content: 'There was an error saving your API key.', ephemeral: true });
    }
}
