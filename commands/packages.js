import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('packages')
    .setDescription('Check your Hack Club packages.');

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
        const packages = mailData.mail.filter(item => item.type === 'package');

        if (!packages || packages.length === 0) {
            return interaction.editReply({
                content: 'You have no packages.',
            });
        }

        const itemsPerPage = 5;
        const totalPages = Math.ceil(packages.length / itemsPerPage);
        let currentPage = 0;

        const generateComponents = (page, packages) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = packages.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle('Your Hack Club Packages')
                .setColor(0xec3750)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} | Showing ${currentItems.length} of ${packages.length} packages.` });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_package')
                .setPlaceholder('Select a package to view details')
                .addOptions(currentItems.map(item => ({
                    label: item.title || 'Untitled Package',
                    description: `Status: ${item.status}`,
                    value: item.id,
                })));
            
            currentItems.forEach(item => {
                embed.addFields({
                    name: item.title || 'Untitled Package',
                    value: `**Status:** ${item.status}\n**Created:** ${new Date(item.created_at).toLocaleDateString()}\n[View Online](${item.public_url})`,
                    inline: false
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1)
                );

            return { embeds: [embed], components: [row, buttons] };
        };

        const message = await interaction.editReply(generateComponents(currentPage, packages));

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000, // 10 minutes
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev_page') {
                currentPage--;
            } else if (i.customId === 'next_page') {
                currentPage++;
            }

            await i.update(generateComponents(currentPage, packages));
        });

        const selectCollector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 600000,
        });

        selectCollector.on('collect', async i => {
            const packageId = i.values[0];
            
            await i.deferUpdate();

            try {
                const packageResponse = await fetch(`https://mail.hackclub.com/api/public/v1/packages/${packageId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (!packageResponse.ok) {
                    await i.followUp({ content: 'Failed to fetch package details.', ephemeral: true });
                    return;
                }

                const { package: packageData } = await packageResponse.json();

                const events = packageData.events.sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at));

                const detailEmbed = new EmbedBuilder()
                    .setTitle(packageData.title || 'Untitled Package')
                    .setURL(packageData.public_url)
                    .setColor(0xec3750)
                    .setDescription(`**Status:** ${packageData.status}\n**Tags:** ${packageData.tags.join(', ') || 'None'}`)
                    .addFields({ name: 'Events', value: events.map(event => {
                        const timestamp = Math.floor(new Date(event.happened_at).getTime() / 1000);
                        return `**${event.description}**\n${event.location ? `*${event.location}*` : ''}\n<t:${timestamp}:R> (<t:${timestamp}:F>)`;
                    }).join('\n\n')});

                await i.followUp({ embeds: [detailEmbed], ephemeral: true });

            } catch (error) {
                console.error('Failed to fetch package details:', error);
                await i.followUp({ content: 'An error occurred while fetching package details.', ephemeral: true });
            }
        });

        collector.on('end', () => {
            const disabledComponents = generateComponents(currentPage, packages).components.map(row => {
                row.components.forEach(component => component.setDisabled(true));
                return row;
            });
            interaction.editReply({ components: disabledComponents });
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply({
            content: 'An error occurred while fetching your packages.',
        });
    }
}
