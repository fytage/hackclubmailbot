import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('letters')
    .setDescription('Check your Hack Club letters.')
    .addStringOption(option =>
        option.setName('query')
            .setDescription('Search for letters by title.')
            .setRequired(false));

export async function execute(interaction, pool) {
    const formatItem = (title) => {
        const lowerCaseTitle = (title || 'Untitled').toLowerCase();
        if (lowerCaseTitle === 'untitled') {
            return { title: 'Untitled', embed: '<:mopartsmoproblems:1419234881921220768> Untitled', emoji: '1419234881921220768' };
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
        return { title: title || 'Untitled', embed: title || 'Untitled', emoji: '✉️' };
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

        const mailResponse = await fetch('https://mail.hackclub.com/api/public/v1/mail', {
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
        let letters = mailData.mail.filter(item => item.type === 'letter');

        const query = interaction.options.getString('query');
        if (query) {
            letters = letters.filter(letter => letter.title && letter.title.toLowerCase().includes(query.toLowerCase()));
        }

        if (!letters || letters.length === 0) {
            return interaction.editReply({
                content: '<:mopartsmoproblems:1419234881921220768> You have no letters.',
            });
        }

        const itemsPerPage = 5;
        const totalPages = Math.ceil(letters.length / itemsPerPage);
        let currentPage = 0;

        const generateComponents = (page, letters) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = letters.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle('<:orphmoji_yippee:1419235231315001414> Your Hack Club Letters')
                .setColor(0xec3750)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} | Showing ${currentItems.length} of ${letters.length} letters.` })
                .setThumbnail('https://em-content.zobj.net/source/apple/419/envelope_2709-fe0f.png');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_letter')
                .setPlaceholder('Select a letter to view details')
                .addOptions(currentItems.map(item => {
                    const formatted = formatItem(item.title);
                    return {
                        label: formatted.title.substring(0, 100),
                        description: `Status: ${item.status}`,
                        value: item.id,
                        emoji: formatted.emoji,
                    }
                }));

            currentItems.forEach(item => {
                embed.addFields({
                    name: formatItem(item.title).embed,
                    value: `**Status:** ${item.status}\n**Created:** ${new Date(item.created_at).toLocaleDateString()}\n[View Online](${item.public_url})`,
                    inline: false
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel(' ')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel(' ')
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1)
                );

            return { embeds: [embed], components: [row, buttons] };
        };

        const message = await interaction.editReply(generateComponents(currentPage, letters));

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

            await i.update(generateComponents(currentPage, letters));
        });

        const selectCollector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 600000,
        });

        selectCollector.on('collect', async i => {
            const letterId = i.values[0];
            
            await i.deferUpdate();

            try {
                const letterResponse = await fetch(`https://mail.hackclub.com/api/public/v1/letters/${letterId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (!letterResponse.ok) {
                    await i.followUp({ content: '<:orphmoji_peefest:1419239875894579311> Failed to fetch letter details.', ephemeral: true });
                    return;
                }

                const { letter } = await letterResponse.json();
                const formatted = formatItem(letter.title);

                const events = letter.events.sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at));

                const detailEmbed = new EmbedBuilder()
                    .setTitle(formatted.embed)
                    .setURL(letter.public_url)
                    .setColor(0xec3750)
                    .setDescription(`⚡ **Status:** ${letter.status}\n🏷️ **Tags:** ${letter.tags.join(', ') || 'None'}`)
                    .addFields({ name: '📅  Events', value: events.map(event => {
                        const timestamp = Math.floor(new Date(event.happened_at).getTime() / 1000);
                        return `**${event.description}**\n📌 ${event.location ? `*${event.location}*` : ''}\n⌚ <t:${timestamp}:R> (<t:${timestamp}:F>)`;
                    }).join('\n\n')});

                await i.followUp({ embeds: [detailEmbed], ephemeral: true });

            } catch (error) {
                console.error('Failed to fetch letter details:', error);
                await i.followUp({ content: '<:orphmoji_peefest:1419239875894579311> An error occurred while fetching letter details.', ephemeral: true });
            }
        });

        collector.on('end', () => {
            const disabledComponents = generateComponents(currentPage, letters).components.map(row => {
                row.components.forEach(component => component.setDisabled(true));
                return row;
            });
            interaction.editReply({ components: disabledComponents });
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply({
            content: '<:orphmoji_peefest:1419239875894579311> An error occurred while fetching your mail.',
        });
    }
}
