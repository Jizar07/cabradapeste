const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Manage inventory items')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add item to inventory')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item name')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Quantity to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove item from inventory')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item name')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Quantity to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all inventory items')),
    
    async execute(interaction, dataManager) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'add') {
            const item = interaction.options.getString('item');
            const quantity = interaction.options.getInteger('quantity');
            
            // Add item to inventory
            const result = await dataManager.addInventoryItem(item, quantity, interaction.user.username);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Item Added to Inventory')
                .addFields(
                    { name: 'Item', value: item, inline: true },
                    { name: 'Quantity', value: quantity.toString(), inline: true },
                    { name: 'Added by', value: interaction.user.username, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
        } else if (subcommand === 'remove') {
            const item = interaction.options.getString('item');
            const quantity = interaction.options.getInteger('quantity');
            
            // Remove item from inventory
            const result = await dataManager.removeInventoryItem(item, quantity, interaction.user.username);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Item Removed from Inventory')
                    .addFields(
                        { name: 'Item', value: item, inline: true },
                        { name: 'Quantity', value: quantity.toString(), inline: true },
                        { name: 'Removed by', value: interaction.user.username, inline: true }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: `⚠️ ${result.message}`, ephemeral: true });
            }
            
        } else if (subcommand === 'list') {
            const inventory = await dataManager.getInventory();
            
            if (!inventory || Object.keys(inventory).length === 0) {
                await interaction.reply({ content: '📦 Inventory is empty!', ephemeral: true });
                return;
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📦 Current Inventory')
                .setDescription('Here are all items in the inventory:')
                .setTimestamp();
            
            for (const [itemName, itemData] of Object.entries(inventory)) {
                embed.addFields({ 
                    name: itemName, 
                    value: `Quantity: ${itemData.quantity || 0}`, 
                    inline: true 
                });
            }
            
            await interaction.reply({ embeds: [embed] });
        }
    },
};