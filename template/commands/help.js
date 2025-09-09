const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands'),
    async execute(interaction, dataManager) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Bot Commands')
            .setDescription('Here are all the available commands:')
            .addFields(
                { name: '/ping', value: 'Check bot latency', inline: true },
                { name: '/help', value: 'Show this help message', inline: true },
                { name: '/info', value: 'Show bot information', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    },
};