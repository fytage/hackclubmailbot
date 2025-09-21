import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('deleteme')
    .setDescription('Removes your API key and all associated data from the bot.');

export async function execute(interaction, pool) {
    const userId = interaction.user.id;

    try {
        const [result] = await pool.execute('DELETE FROM users WHERE discord_id = ?', [userId]);

        if (result.affectedRows > 0) {
            await interaction.reply({ content: '<:orphmoji_peefest:1419239875894579311> Your data has been successfully removed. Sorry to see you go!', ephemeral: true });
        } else {
            await interaction.reply({ content: '<:mopartsmoproblems:1419234881921220768> You have no data stored with the bot.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error removing user data:', error);
        await interaction.reply({ content: '<:orphmoji_scared:1419238538653728808> There was an error removing your data.', ephemeral: true });
    }
}
