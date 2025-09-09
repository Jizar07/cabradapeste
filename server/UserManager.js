const fs = require('fs');
const path = require('path');

class UserManager {
  constructor(dataFolder = '../data') {
    this.dataFolder = dataFolder;
    this.userRolesFile = path.join(dataFolder, 'user_roles.json');
    this.userRoles = this.loadUserRoles();
  }

  loadUserRoles() {
    try {
      if (fs.existsSync(this.userRolesFile)) {
        const data = fs.readFileSync(this.userRolesFile, 'utf8');
        const rawData = JSON.parse(data);
        
        // Check if it's the desktop app format (direct user objects)
        if (rawData && typeof rawData === 'object' && !rawData.users && !rawData.roles) {
          // Convert desktop app format to web app format
          const users = {};
          const roles = { manager: [], worker: [] };
          
          Object.keys(rawData).forEach(userId => {
            const userData = rawData[userId];
            users[userId] = userData;
            if (userData.role === 'manager') {
              roles.manager.push(userId);
            } else if (userData.role === 'worker') {
              roles.worker.push(userId);
            }
          });
          
          return { users, roles };
        }
        
        // Return as-is if already in web app format
        return rawData;
      }
    } catch (error) {
      console.error('Error loading user roles:', error);
    }
    
    return {
      users: {},
      roles: {
        manager: [],
        worker: []
      }
    };
  }

  saveUserRoles() {
    try {
      const dir = path.dirname(this.userRolesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.userRolesFile, JSON.stringify(this.userRoles, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving user roles:', error);
      return false;
    }
  }

  getAllUsers() {
    return this.userRoles.users || {};
  }

  getUserRole(userId) {
    const user = this.userRoles.users[userId];
    return user ? user.role : 'worker'; // Default to worker
  }

  getUserDisplayName(userId) {
    const user = this.userRoles.users[userId];
    return user ? user.display_name : userId;
  }

  addUser(userId, displayName, role = 'worker') {
    if (!this.userRoles.users) {
      this.userRoles.users = {};
    }
    
    if (!this.userRoles.roles) {
      this.userRoles.roles = { manager: [], worker: [] };
    }

    // Add user to users object
    this.userRoles.users[userId] = {
      display_name: displayName,
      role: role,
      created_at: new Date().toISOString()
    };

    // Add to role list if not already there
    if (!this.userRoles.roles[role].includes(userId)) {
      this.userRoles.roles[role].push(userId);
    }

    this.saveUserRoles();
    return true;
  }

  updateUserRole(userId, newRole) {
    if (!this.userRoles.users[userId]) {
      return false;
    }

    const oldRole = this.userRoles.users[userId].role;
    
    // Remove from old role list
    if (this.userRoles.roles[oldRole]) {
      const index = this.userRoles.roles[oldRole].indexOf(userId);
      if (index > -1) {
        this.userRoles.roles[oldRole].splice(index, 1);
      }
    }

    // Add to new role list
    if (!this.userRoles.roles[newRole]) {
      this.userRoles.roles[newRole] = [];
    }
    if (!this.userRoles.roles[newRole].includes(userId)) {
      this.userRoles.roles[newRole].push(userId);
    }

    // Update user role
    this.userRoles.users[userId].role = newRole;
    this.userRoles.users[userId].updated_at = new Date().toISOString();

    this.saveUserRoles();
    return true;
  }

  updateUserDisplayName(userId, newDisplayName) {
    if (!this.userRoles.users[userId]) {
      return false;
    }

    this.userRoles.users[userId].display_name = newDisplayName;
    this.userRoles.users[userId].updated_at = new Date().toISOString();

    this.saveUserRoles();
    return true;
  }

  removeUser(userId) {
    if (!this.userRoles.users[userId]) {
      return false;
    }

    const role = this.userRoles.users[userId].role;
    
    // Remove from role list
    if (this.userRoles.roles[role]) {
      const index = this.userRoles.roles[role].indexOf(userId);
      if (index > -1) {
        this.userRoles.roles[role].splice(index, 1);
      }
    }

    // Remove from users
    delete this.userRoles.users[userId];

    this.saveUserRoles();
    return true;
  }

  getUsersByRole(role) {
    if (!this.userRoles.roles[role]) {
      return [];
    }
    
    return this.userRoles.roles[role].map(userId => ({
      id: userId,
      ...this.userRoles.users[userId]
    }));
  }

  isManager(userId) {
    return this.getUserRole(userId) === 'manager';
  }

  isWorker(userId) {
    return this.getUserRole(userId) === 'worker';
  }

  getUserStats(userId) {
    // This would typically integrate with transaction data
    // For now, return basic user info
    const user = this.userRoles.users[userId];
    if (!user) {
      return null;
    }

    return {
      id: userId,
      display_name: user.display_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      total_transactions: 0, // Would need to calculate from transaction log
      total_earnings: 0.0    // Would need to calculate from payment log
    };
  }

  // Method to process user from webhook messages
  processUserFromMessage(userString) {
    // Handle both formats: "[First Last | FIXO: ID]" and "[First Last]"
    const fixoMatch = userString.match(/\[(.*?)\s*\|\s*FIXO:\s*(\d+)\]/);
    if (fixoMatch) {
      const displayName = fixoMatch[1].trim();
      const fixoId = fixoMatch[2];
      const fullUserId = `[${displayName} | FIXO: ${fixoId}]`;
      
      // Add user if doesn't exist
      if (!this.userRoles.users[fullUserId]) {
        this.addUser(fullUserId, displayName, 'worker');
      }
      
      return fullUserId;
    }

    // Handle plain name format: "[First Last]"
    const plainMatch = userString.match(/\[(.*?)\]/);
    if (plainMatch) {
      const displayName = plainMatch[1].trim();
      const plainUserId = `[${displayName}]`;
      
      // Add user if doesn't exist
      if (!this.userRoles.users[plainUserId]) {
        this.addUser(plainUserId, displayName, 'worker');
      }
      
      return plainUserId;
    }

    return userString; // Return as-is if no pattern matches
  }
}

module.exports = UserManager;