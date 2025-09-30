import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View statistics about your Hack Club mail.');

export async function execute(interaction, pool) {
    const userId = interaction.user.id;

    try {
        const [rows] = await pool.execute('SELECT api_key FROM users WHERE discord_id = ?', [userId]);

        if (rows.length === 0) {
            return interaction.reply({
                content: '<:mopartsmoproblems:1419234881921220768> You have not set up your API key yet. Please use the /setup command.',
                ephemeral: true,
            });
        }

        const apiKey = rows[0].api_key;
        await interaction.deferReply({ ephemeral: true });

        const mailResponse = await fetch('https://mail.hackclub.com/api/public/v1/mail', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!mailResponse.ok) {
            throw new Error(`API request failed with status ${mailResponse.status}`);
        }

        const mailData = await mailResponse.json();
        const letters = mailData.mail.filter(item => item.type === 'letter');
        const packages = mailData.mail.filter(item => item.type === 'warehouse_order');

        const deliveredLetters = letters.filter(l => ['delivered', 'received'].includes(l.status));
        const deliveredPackages = packages.filter(p => ['delivered', 'received'].includes(p.status));

        const avgDeliveryTime = async (items) => {
            if (items.length === 0) return 'N/A';
            
            let totalDuration = 0;
            let count = 0;

            for (const item of items) {
                try {
                    const itemResponse = await fetch(`https://mail.hackclub.com/api/public/v1/${item.type}s/${item.id}`, {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    if (!itemResponse.ok) continue;

                    const details = await itemResponse.json();
                    const fullItem = details[item.type];

                    const created = new Date(fullItem.created_at);
                    const deliveredEvent = fullItem.events.find(e => e.description.toLowerCase().includes('delivered') || e.description.toLowerCase().includes('received'));
                    
                    if (deliveredEvent) {
                        const delivered = new Date(deliveredEvent.happened_at);
                        totalDuration += delivered.getTime() - created.getTime();
                        count++;
                    }
                } catch (e) {
                    console.error(`Failed to fetch details for ${item.id}`, e);
                }
            }

            if (count === 0) return 'N/A';

            const avgDuration = totalDuration / count;
            const days = Math.floor(avgDuration / (1000 * 60 * 60 * 24));
            return `${days} days`;
        };

        const statsEmbed = new EmbedBuilder()
            .setTitle('📈 Your Hack Club Mail Statistics')
            .setColor(0xec3750)
            .addFields(
                { name: 'Total Letters', value: letters.length.toString(), inline: true },
                { name: 'Delivered Letters', value: deliveredLetters.length.toString(), inline: true },
                { name: 'Avg. Letter Delivery Time', value: await avgDeliveryTime(deliveredLetters), inline: true },
                { name: 'Total Packages', value: packages.length.toString(), inline: true },
                { name: 'Delivered Packages', value: deliveredPackages.length.toString(), inline: true },
                { name: 'Avg. Package Delivery Time', value: await avgDeliveryTime(deliveredPackages), inline: true }
            );

        await interaction.editReply({ embeds: [statsEmbed] });

    } catch (error) {
        console.error('Error fetching stats:', error);
        await interaction.editReply({ content: 'An error occurred while fetching your statistics.' });
    }
}
