const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class DataManager extends EventEmitter {
    constructor(dataPath = './data', io = null) {
        super();
        this.dataPath = dataPath;
        this.io = io;
        this.cache = new Map();
        
        // Ensure data directory exists
        fs.ensureDirSync(this.dataPath);
        
        // Initialize default data files
        this.initializeDataFiles();
    }

    initializeDataFiles() {
        const defaultFiles = {
            'users.json': { users: [], lastUpdated: new Date().toISOString() },
            'settings.json': { settings: {}, lastUpdated: new Date().toISOString() },
            'logs.json': { logs: [], lastUpdated: new Date().toISOString() },
            'messages.json': { messages: [], lastUpdated: new Date().toISOString() }
        };

        for (const [filename, defaultData] of Object.entries(defaultFiles)) {
            const filePath = path.join(this.dataPath, filename);
            if (!fs.existsSync(filePath)) {
                fs.writeJsonSync(filePath, defaultData, { spaces: 2 });
                console.log(`📝 Created default file: ${filename}`);
            }
        }
    }

    loadData(type) {
        const filename = `${type}.json`;
        const filePath = path.join(this.dataPath, filename);
        
        // Check cache first
        if (this.cache.has(type)) {
            return this.cache.get(type);
        }

        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readJsonSync(filePath);
                this.cache.set(type, data);
                return data;
            } else {
                // Create empty file if it doesn't exist
                const emptyData = { [type]: [], lastUpdated: new Date().toISOString() };
                fs.writeJsonSync(filePath, emptyData, { spaces: 2 });
                this.cache.set(type, emptyData);
                return emptyData;
            }
        } catch (error) {
            console.error(`❌ Error loading ${type} data:`, error);
            return { [type]: [], error: error.message };
        }
    }

    saveData(type, data) {
        const filename = `${type}.json`;
        const filePath = path.join(this.dataPath, filename);
        
        try {
            // Add timestamp
            data.lastUpdated = new Date().toISOString();
            
            // Save to file
            fs.writeJsonSync(filePath, data, { spaces: 2 });
            
            // Update cache
            this.cache.set(type, data);
            
            // Emit update event
            this.emit('dataUpdated', { type, data });
            
            // Notify connected clients via Socket.IO
            if (this.io) {
                this.io.emit('data:update', { type, data });
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${type} data:`, error);
            throw error;
        }
    }

    addEntry(type, entry) {
        const data = this.loadData(type);
        const key = type in data ? type : Object.keys(data)[0];
        
        if (!Array.isArray(data[key])) {
            data[key] = [];
        }
        
        // Add unique ID and timestamp if not present
        if (!entry.id) {
            entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        if (!entry.timestamp) {
            entry.timestamp = new Date().toISOString();
        }
        
        data[key].push(entry);
        this.saveData(type, data);
        
        return entry;
    }

    updateEntry(type, id, updates) {
        const data = this.loadData(type);
        const key = type in data ? type : Object.keys(data)[0];
        
        if (!Array.isArray(data[key])) {
            throw new Error(`No array found for type: ${type}`);
        }
        
        const index = data[key].findIndex(item => item.id === id);
        if (index === -1) {
            throw new Error(`Entry with id ${id} not found`);
        }
        
        data[key][index] = { ...data[key][index], ...updates, lastModified: new Date().toISOString() };
        this.saveData(type, data);
        
        return data[key][index];
    }

    deleteEntry(type, id) {
        const data = this.loadData(type);
        const key = type in data ? type : Object.keys(data)[0];
        
        if (!Array.isArray(data[key])) {
            throw new Error(`No array found for type: ${type}`);
        }
        
        const index = data[key].findIndex(item => item.id === id);
        if (index === -1) {
            throw new Error(`Entry with id ${id} not found`);
        }
        
        const deleted = data[key].splice(index, 1)[0];
        this.saveData(type, data);
        
        return deleted;
    }

    query(type, filter = {}) {
        const data = this.loadData(type);
        const key = type in data ? type : Object.keys(data)[0];
        
        if (!Array.isArray(data[key])) {
            return [];
        }
        
        let results = [...data[key]];
        
        // Apply filters
        for (const [field, value] of Object.entries(filter)) {
            results = results.filter(item => {
                if (typeof value === 'object' && value !== null) {
                    // Handle range queries
                    if ('$gte' in value) return item[field] >= value.$gte;
                    if ('$gt' in value) return item[field] > value.$gt;
                    if ('$lte' in value) return item[field] <= value.$lte;
                    if ('$lt' in value) return item[field] < value.$lt;
                    if ('$ne' in value) return item[field] !== value.$ne;
                    if ('$in' in value) return value.$in.includes(item[field]);
                    if ('$regex' in value) {
                        const regex = new RegExp(value.$regex, value.$options || 'i');
                        return regex.test(item[field]);
                    }
                }
                return item[field] === value;
            });
        }
        
        return results;
    }

    // Discord-specific methods
    async logDiscordMessage(messageData) {
        return this.addEntry('messages', {
            ...messageData,
            type: 'discord_message'
        });
    }

    async logEvent(eventType, eventData) {
        return this.addEntry('logs', {
            type: eventType,
            ...eventData,
            timestamp: new Date().toISOString()
        });
    }

    // User management
    getUser(userId) {
        const users = this.loadData('users');
        return users.users?.find(u => u.id === userId);
    }

    saveUser(userData) {
        const users = this.loadData('users');
        if (!users.users) users.users = [];
        
        const existingIndex = users.users.findIndex(u => u.id === userData.id);
        if (existingIndex !== -1) {
            users.users[existingIndex] = { ...users.users[existingIndex], ...userData };
        } else {
            users.users.push(userData);
        }
        
        this.saveData('users', users);
        return userData;
    }

    // Settings management
    getSetting(key) {
        const settings = this.loadData('settings');
        return settings.settings?.[key];
    }

    setSetting(key, value) {
        const settings = this.loadData('settings');
        if (!settings.settings) settings.settings = {};
        settings.settings[key] = value;
        this.saveData('settings', settings);
        return value;
    }

    // Cleanup old data
    cleanup(type, daysToKeep = 30) {
        const data = this.loadData(type);
        const key = type in data ? type : Object.keys(data)[0];
        
        if (!Array.isArray(data[key])) {
            return 0;
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const originalLength = data[key].length;
        data[key] = data[key].filter(item => {
            const itemDate = new Date(item.timestamp || item.createdAt || item.date);
            return itemDate > cutoffDate;
        });
        
        const deletedCount = originalLength - data[key].length;
        if (deletedCount > 0) {
            this.saveData(type, data);
            console.log(`🧹 Cleaned up ${deletedCount} old entries from ${type}`);
        }
        
        return deletedCount;
    }

    // Get statistics
    getStats() {
        const stats = {};
        const files = fs.readdirSync(this.dataPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            const type = path.basename(file, '.json');
            const data = this.loadData(type);
            const key = type in data ? type : Object.keys(data)[0];
            
            stats[type] = {
                count: Array.isArray(data[key]) ? data[key].length : 0,
                lastUpdated: data.lastUpdated || 'Never',
                size: fs.statSync(path.join(this.dataPath, file)).size
            };
        }
        
        return stats;
    }
}

module.exports = DataManager;