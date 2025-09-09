const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Path to known players data file
const KNOWN_PLAYERS_FILE = path.join(__dirname, '../../data/known_players.json');
const USUARIOS_FILE = path.join(__dirname, '../../data/usuarios.json');

// Helper function to read known players
const readKnownPlayers = () => {
  try {
    if (!fs.existsSync(KNOWN_PLAYERS_FILE)) {
      return { players: {}, last_updated: null };
    }
    const data = fs.readFileSync(KNOWN_PLAYERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading known players:', error);
    return { players: {}, last_updated: null };
  }
};

// Helper function to save known players
const saveKnownPlayers = (data) => {
  try {
    data.last_updated = new Date().toISOString();
    fs.writeFileSync(KNOWN_PLAYERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving known players:', error);
    return false;
  }
};

// Helper function to read usuarios for linking
const readUsuarios = () => {
  try {
    if (!fs.existsSync(USUARIOS_FILE)) {
      return { usuarios: {} };
    }
    const data = fs.readFileSync(USUARIOS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading usuarios:', error);
    return { usuarios: {} };
  }
};

// GET /api/known-players - Get all known players
router.get('/', (req, res) => {
  try {
    const knownPlayers = readKnownPlayers();
    res.json({ success: true, data: knownPlayers });
  } catch (error) {
    console.error('Error fetching known players:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch known players' });
  }
});

// POST /api/known-players - Add or update a known player
router.post('/', (req, res) => {
  try {
    const { 
      name_id, 
      display_name, 
      pombo, 
      job, 
      worker_link,
      current_id,
      is_online
    } = req.body;

    if (!name_id) {
      return res.status(400).json({ success: false, error: 'Player name ID is required' });
    }

    const knownPlayers = readKnownPlayers();
    
    // Check if player exists
    const existingPlayer = knownPlayers.players[name_id];
    
    // Update or create player data
    knownPlayers.players[name_id] = {
      name_id,
      display_name: display_name || name_id,
      pombo: pombo || '',
      job: job || '',
      worker_link: worker_link || null,
      last_seen_id: current_id || existingPlayer?.last_seen_id || null,
      last_login: is_online ? new Date().toISOString() : (existingPlayer?.last_login || null),
      last_logout: !is_online && existingPlayer ? new Date().toISOString() : (existingPlayer?.last_logout || null),
      created_at: existingPlayer?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save changes
    if (saveKnownPlayers(knownPlayers)) {
      res.json({ 
        success: true, 
        message: 'Known player saved successfully',
        player: knownPlayers.players[name_id]
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save known player' });
    }
  } catch (error) {
    console.error('Error saving known player:', error);
    res.status(500).json({ success: false, error: 'Failed to save known player' });
  }
});

// DELETE /api/known-players/:nameId - Remove a known player
router.delete('/:nameId', (req, res) => {
  try {
    const nameId = decodeURIComponent(req.params.nameId);
    const knownPlayers = readKnownPlayers();
    
    if (!knownPlayers.players[nameId]) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }
    
    delete knownPlayers.players[nameId];
    
    if (saveKnownPlayers(knownPlayers)) {
      res.json({ success: true, message: 'Known player removed successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to remove known player' });
    }
  } catch (error) {
    console.error('Error removing known player:', error);
    res.status(500).json({ success: false, error: 'Failed to remove known player' });
  }
});

// GET /api/known-players/link-options - Get workers for linking
router.get('/link-options', (req, res) => {
  try {
    const usuarios = readUsuarios();
    const workers = Object.entries(usuarios.usuarios || {})
      .filter(([id, user]) => user.funcao === 'trabalhador' && user.ativo !== false)
      .map(([id, user]) => ({
        id,
        nome: user.nome,
        fixo_id: user.fixo_id
      }));
    
    res.json({ success: true, workers });
  } catch (error) {
    console.error('Error fetching link options:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch link options' });
  }
});

// POST /api/known-players/update-status - Update online/offline status
router.post('/update-status', (req, res) => {
  try {
    const { players } = req.body; // Array of current online players
    
    if (!Array.isArray(players)) {
      return res.status(400).json({ success: false, error: 'Invalid players data' });
    }
    
    const knownPlayers = readKnownPlayers();
    const onlineNames = players.map(p => p.name);
    
    // Update status for all known players
    Object.keys(knownPlayers.players).forEach(nameId => {
      const player = knownPlayers.players[nameId];
      const onlinePlayer = players.find(p => p.name === nameId);
      
      if (onlinePlayer) {
        // Player is online
        if (!player.is_online) {
          player.last_login = new Date().toISOString();
        }
        player.is_online = true;
        player.last_seen_id = onlinePlayer.id;
        player.current_ping = onlinePlayer.ping;
      } else {
        // Player is offline
        if (player.is_online) {
          player.last_logout = new Date().toISOString();
        }
        player.is_online = false;
        player.current_ping = null;
      }
    });
    
    saveKnownPlayers(knownPlayers);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

module.exports = router;