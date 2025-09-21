import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('notifications')
    .setDescription('Customize your mail notification settings.');

export async function execute(interaction, pool) {
    const userId = interaction.user.id;

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE discord_id = ?', [userId]);

        if (rows.length === 0) {
            return interaction.reply({ content: 'You need to set up your API key first with `/setup`.', ephemeral: true });
        }

        const user = rows[0];

        const generateComponents = (currentUser) => {
            const settings = [
                { id: 'notify_new', label: 'New Mail', description: 'Notify when new mail is registered.', value: currentUser.notify_new },
                { id: 'notify_transit', label: 'In Transit', description: 'Notify when mail is in transit.', value: currentUser.notify_transit },
                { id: 'notify_delivered', label: 'Delivered', description: 'Notify when mail is delivered/received.', value: currentUser.notify_delivered },
                { id: 'notify_failed', label: 'Failed Delivery', description: 'Notify when a delivery fails.', value: currentUser.notify_failed }
            ];

            const embed = new EmbedBuilder()
                .setTitle('Notification Settings')
                .setDescription('Toggle which mail updates you want to be notified about. Your current settings are shown below.')
                .setColor(0xec3750);

            settings.forEach(s => {
                embed.addFields({ name: `${s.label} ${s.value ? '✅' : '❌'}`, value: s.description, inline: false });
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('toggle_notification')
                .setPlaceholder('Select a setting to toggle')
                .addOptions(settings.map(s => ({
                    label: s.label,
                    description: `Currently: ${s.value ? 'Enabled' : 'Disabled'}`,
                    value: s.id,
                })));
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            return { embeds: [embed], components: [row] };
        };

        const message = await interaction.reply({ ...generateComponents(user), ephemeral: true });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 600000,
        });

        collector.on('collect', async i => {
            const settingToToggle = i.values[0];
            
            const [current] = await pool.execute(`SELECT ${settingToToggle} FROM users WHERE discord_id = ?`, [userId]);
            const newStatus = !current[0][settingToToggle];

            await pool.execute(`UPDATE users SET ${settingToToggle} = ? WHERE discord_id = ?`, [newStatus, userId]);
            
            const [updatedUser] = await pool.execute('SELECT * FROM users WHERE discord_id = ?', [userId]);
            await i.update(generateComponents(updatedUser[0]));
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });

    } catch (error) {
        console.error('Error managing notification settings:', error);
        await interaction.reply({ content: 'There was an error managing your notification settings.', ephemeral: true });
    }
}
