import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('packages')
    .setDescription('Check your Hack Club packages.')
    .addStringOption(option =>
        option.setName('query')
            .setDescription('Search for packages by title.')
            .setRequired(false));

export async function execute(interaction, pool) {
    const formatItem = (title) => {
        const lowerCaseTitle = (title || 'Untitled').toLowerCase();
        if (lowerCaseTitle === 'untitled') {
            return { title: 'Untitled Package', embed: '<:mopartsmoproblems:1419234881921220768> Untitled Package', emoji: '1419234881921220768' };
        }
        if (lowerCaseTitle.includes('summer of making')) {
            return { title, embed: `<:SOM:1419246038736175226> ${title}`, emoji: '1419246038736175226' };
        }
        if (lowerCaseTitle.includes('sinkening balloons')) {
            return { title, embed: `🎈 ${title}`, emoji: '🎈' };
        }
        if (lowerCaseTitle.includes('daydream stickers')) {
            return { title, embed: `<:daydream:1419248040400912474> ${title}`, emoji: '1419248040400912474' };
        }
        return { title: title || 'Untitled Package', embed: title || 'Untitled Package', emoji: '📦' };
    };

    const userId = interaction.user.id;

    try {
        const [rows] = await pool.execute('SELECT api_key FROM users WHERE discord_id = ?', [userId]);

        if (rows.length === 0) {
            return interaction.reply({
                content: '<:orphmoji_yippee:1419235231315001414> You have not set up your API key yet. Please use the /setup command.',
                ephemeral: true,
            });
        }

        const apiKey = rows[0].api_key;

        await interaction.deferReply({ ephemeral: true });

        const mailResponse = await fetch('https://mail.hackclub.com/api/public/v1/packages', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!mailResponse.ok) {
            if (mailResponse.status === 401) {
                return interaction.editReply({
                    content: '<:orphmoji_scared:1419238538653728808> Your API key is invalid. Please set it again with /setup.',
                });
            }
            throw new Error(`API request failed with status ${mailResponse.status}`);
        }

        const mailData = await mailResponse.json();
        
        let packages = mailData.packages;

        const query = interaction.options.getString('query');
        if (query) {
            packages = packages.filter(pkg => pkg.title && pkg.title.toLowerCase().includes(query.toLowerCase()));
        }

        if (!packages || packages.length === 0) {
            return interaction.editReply({
                content: '<:mopartsmoproblems:1419234881921220768> You have no packages.',
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
                .setTitle('<:orphmoji_yippee:1419235231315001414> Your Hack Club Packages')
                .setColor(0xec3750)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} | Showing ${currentItems.length} of ${packages.length} packages.` })
                .setThumbnail('https://em-content.zobj.net/source/apple/419/package_1f4e6.png');

            currentItems.forEach(item => {
                let trackingInfo = '';
                if (item.tracking_number && item.tracking_link) {
                    trackingInfo = ` | **Tracking:** [${item.tracking_number}](${item.tracking_link}) (${item.carrier || 'N/A'})`;
                }

                embed.addFields({
                    name: formatItem(item.title).embed,
                    value: `**Status:** ${item.status}\n**Created:** ${new Date(item.created_at).toLocaleDateString()}${trackingInfo}\n[View Online](${item.public_url})`,
                    inline: false
                });
            });

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

            return { embeds: [embed], components: [buttons] };
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
            content: '<:orphmoji_peefest:1419239875894579311> An error occurred while fetching your packages.',
        });
    }
}