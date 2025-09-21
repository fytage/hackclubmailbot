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
                { id: 'notify_new_letter', label: 'New Letters', description: 'Notify when a new letter is registered.', value: currentUser.notify_new_letter },
                { id: 'notify_letter_update', label: 'Letter Updates', description: "Notify when a letter's status changes.", value: currentUser.notify_letter_update },
                { id: 'notify_new_package', label: 'New Packages', description: 'Notify when a new package is registered.', value: currentUser.notify_new_package },
                { id: 'notify_package_update', label: 'Package Updates', description: "Notify when a package's status changes.", value: currentUser.notify_package_update }
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
        };        const message = await interaction.reply({ ...generateComponents(user), ephemeral: true });

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
