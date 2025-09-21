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
        const packages = mailData.mail.filter(item => item.type === 'package');

        const deliveredLetters = letters.filter(l => ['delivered', 'received'].includes(l.status)).length;
        const deliveredPackages = packages.filter(p => ['delivered', 'received'].includes(p.status)).length;

        const avgDeliveryTime = (items) => {
            const deliveredItems = items.filter(item => ['delivered', 'received'].includes(item.status) && item.events && item.events.length > 1);
            if (deliveredItems.length === 0) return 'N/A';
            
            const totalDuration = deliveredItems.reduce((acc, item) => {
                const created = new Date(item.created_at);
                const deliveredEvent = item.events.find(e => e.description.toLowerCase().includes('delivered'));
                if (deliveredEvent) {
                    const delivered = new Date(deliveredEvent.happened_at);
                    return acc + (delivered.getTime() - created.getTime());
                }
                return acc;
            }, 0);

            const avgDuration = totalDuration / deliveredItems.length;
            const days = Math.floor(avgDuration / (1000 * 60 * 60 * 24));
            return `${days} days`;
        };

        const statsEmbed = new EmbedBuilder()
            .setTitle('📈 Your Hack Club Mail Statistics')
            .setColor(0xec3750)
            .addFields(
                { name: 'Total Letters', value: letters.length.toString(), inline: true },
                { name: 'Delivered Letters', value: deliveredLetters.toString(), inline: true },
                { name: 'Avg. Letter Delivery Time', value: avgDeliveryTime(letters), inline: true },
                { name: 'Total Packages', value: packages.length.toString(), inline: true },
                { name: 'Delivered Packages', value: deliveredPackages.toString(), inline: true },
                { name: 'Avg. Package Delivery Time', value: avgDeliveryTime(packages), inline: true }
            );

        await interaction.editReply({ embeds: [statsEmbed] });

    } catch (error) {
        console.error('Error fetching stats:', error);
        await interaction.editReply({ content: 'An error occurred while fetching your statistics.' });
    }
}
