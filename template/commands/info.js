const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Shows bot information'),
    async execute(interaction, dataManager) {
        const { client } = interaction;
        const uptime = Math.floor(client.uptime / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Bot Information')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: 'Bot Name', value: client.user.tag, inline: true },
                { name: 'Server Count', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'User Count', value: `${client.users.cache.size}`, inline: true },
                { name: 'Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
                { name: 'Node.js', value: process.version, inline: true },
                { name: 'Discord.js', value: 'v14', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    },
};