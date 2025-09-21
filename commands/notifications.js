import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('notifications')
    .setDescription('Toggle automatic notifications for mail updates.');

export async function execute(interaction, pool) {
    const userId = interaction.user.id;

    try {
        const [rows] = await pool.execute('SELECT notifications_enabled FROM users WHERE discord_id = ?', [userId]);

        if (rows.length === 0) {
            return interaction.reply({ content: '<:mopartsmoproblems:1419234881921220768> You need to set up your API key first with `/setup`.', ephemeral: true });
        }

        const currentStatus = rows[0].notifications_enabled;
        const newStatus = !currentStatus;

        await pool.execute('UPDATE users SET notifications_enabled = ? WHERE discord_id = ?', [newStatus, userId]);

        const statusMessage = newStatus
            ? '<:orphmoji_yippee:1419235231315001414> Notifications have been enabled! I will check for updates every 20 minutes.'
            : '<:sad:1419239776049168528> Notifications have been disabled.';

        await interaction.reply({ content: statusMessage, ephemeral: true });

    } catch (error) {
        console.error('Error toggling notification settings:', error);
        await interaction.reply({ content: '<:orphmoji_scared:1419238538653728808> There was an error changing your notification settings.', ephemeral: true });
    }
}
