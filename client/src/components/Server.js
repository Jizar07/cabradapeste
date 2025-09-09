import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  TextField,
  InputAdornment,
  Alert,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Dns as ServerIcon,
  People as PeopleIcon,
  Speed as PingIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as OnlineIcon,
  Chat as DiscordIcon,
  Storage as ResourceIcon,
  AccessTime as UptimeIcon,
  Link as LinkIcon,
  Sort as SortIcon,
  ArrowUpward as SortAscIcon,
  ArrowDownward as SortDescIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  FilterList as FilterIcon,
  Work as WorkIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';

const Server = () => {
  const [serverInfo, setServerInfo] = useState(null);
  const [players, setPlayers] = useState([]);
  const [dynamicInfo, setDynamicInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, ping, id
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [expandedSections, setExpandedSections] = useState({
    resources: false,
    endpoints: true,
    knownPlayers: true
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Known Players states
  const [knownPlayers, setKnownPlayers] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [knownSearchTerm, setKnownSearchTerm] = useState('');
  const [knownSortBy, setKnownSortBy] = useState('status'); // status, name, job, ping
  const [knownSortOrder, setKnownSortOrder] = useState('asc');
  const [showOfflinePlayers, setShowOfflinePlayers] = useState(true);

  const SERVER_IP = '131.196.197.140';
  const SERVER_PORT = '30120';
  const TXADMIN_PORT = '40120';
  const BASE_URL = `https://${SERVER_IP}:${SERVER_PORT}`;
  const TXADMIN_URL = `http://${SERVER_IP}:${TXADMIN_PORT}`;
  const DISCORD_INVITE = 'discord.gg/condado';

  // Fetch server data using our backend proxy
  const fetchServerData = async () => {
    try {
      setLoading(true);
      
      // Use our backend proxy to avoid CORS issues
      const [infoRes, playersRes, dynamicRes] = await Promise.all([
        fetch('/api/server-proxy/info').catch(() => null),
        fetch('/api/server-proxy/players').catch(() => null),
        fetch('/api/server-proxy/dynamic').catch(() => null)
      ]);

      if (infoRes && infoRes.ok) {
        const infoData = await infoRes.json();
        setServerInfo(infoData);
      }

      if (playersRes && playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData);
        
        // Update known players status
        updateKnownPlayersStatus(playersData);
      }

      if (dynamicRes && dynamicRes.ok) {
        const dynamicData = await dynamicRes.json();
        setDynamicInfo(dynamicData);
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Erro ao buscar dados do servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch known players
  const fetchKnownPlayers = async () => {
    try {
      const response = await fetch('/api/known-players');
      const data = await response.json();
      if (data.success) {
        setKnownPlayers(data.data.players || {});
      }
    } catch (error) {
      console.error('Error fetching known players:', error);
    }
  };

  // Fetch workers for linking
  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/known-players/link-options');
      const data = await response.json();
      if (data.success) {
        setWorkers(data.workers || []);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  // Update known players status
  const updateKnownPlayersStatus = async (currentPlayers) => {
    try {
      await fetch('/api/known-players/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: currentPlayers })
      });
      fetchKnownPlayers();
    } catch (error) {
      console.error('Error updating known players status:', error);
    }
  };

  // Add/Update known player
  const handleSaveKnownPlayer = async (playerData) => {
    try {
      const response = await fetch('/api/known-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
      const data = await response.json();
      if (data.success) {
        fetchKnownPlayers();
        setEditDialogOpen(false);
        setEditingPlayer(null);
      } else {
        setError(data.error || 'Failed to save player');
      }
    } catch (error) {
      console.error('Error saving known player:', error);
      setError('Failed to save player');
    }
  };

  // Remove known player
  const handleRemoveKnownPlayer = async (nameId) => {
    if (!window.confirm('Remove this known player?')) return;
    
    try {
      const response = await fetch(`/api/known-players/${encodeURIComponent(nameId)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        fetchKnownPlayers();
      }
    } catch (error) {
      console.error('Error removing known player:', error);
    }
  };

  // Open edit dialog for player
  const openEditDialog = (player, isNew = false) => {
    if (isNew) {
      setEditingPlayer({
        name_id: player.name,
        display_name: player.name,
        pombo: '',
        job: '',
        worker_link: null,
        current_id: player.id,
        is_online: true
      });
    } else {
      setEditingPlayer({
        ...knownPlayers[player.name_id],
        current_id: player.id,
        is_online: player.is_online
      });
    }
    setEditDialogOpen(true);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchServerData();
    fetchKnownPlayers();
    fetchWorkers();
    
    const interval = setInterval(() => {
      fetchServerData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort players
  const filteredAndSortedPlayers = players
    .filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'ping':
          comparison = a.ping - b.ping;
          break;
        case 'id':
          comparison = a.id - b.id;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Handle column header click for sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort icon for column headers
  const getSortIcon = (column) => {
    if (sortBy !== column) return <SortIcon fontSize="small" />;
    return sortOrder === 'asc' ? 
      <SortAscIcon fontSize="small" /> : 
      <SortDescIcon fontSize="small" />;
  };

  // Handle known players sorting
  const handleKnownPlayersSort = (column) => {
    if (knownSortBy === column) {
      setKnownSortOrder(knownSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setKnownSortBy(column);
      setKnownSortOrder('asc');
    }
  };

  // Get sort icon for known players columns
  const getKnownPlayersSortIcon = (column) => {
    if (knownSortBy !== column) return <SortIcon fontSize="small" />;
    return knownSortOrder === 'asc' ? 
      <SortAscIcon fontSize="small" /> : 
      <SortDescIcon fontSize="small" />;
  };

  // Get ping color
  const getPingColor = (ping) => {
    if (ping < 50) return 'success';
    if (ping < 100) return 'warning';
    return 'error';
  };

  // Filter and sort known players
  const getFilteredKnownPlayers = () => {
    const knownPlayersList = Object.values(knownPlayers);
    
    // Filter by search term
    let filtered = knownPlayersList.filter(player => {
      const searchLower = knownSearchTerm.toLowerCase();
      return (
        player.display_name?.toLowerCase().includes(searchLower) ||
        player.name_id?.toLowerCase().includes(searchLower) ||
        player.job?.toLowerCase().includes(searchLower) ||
        player.pombo?.toLowerCase().includes(searchLower)
      );
    });

    // Filter offline players if needed
    if (!showOfflinePlayers) {
      filtered = filtered.filter(player => player.is_online);
    }

    // Sort players
    filtered.sort((a, b) => {
      // Always show online players first
      if (a.is_online !== b.is_online) {
        return a.is_online ? -1 : 1;
      }

      let comparison = 0;
      switch (knownSortBy) {
        case 'status':
          comparison = 0; // Already sorted by online status
          break;
        case 'name':
          comparison = (a.display_name || a.name_id).localeCompare(b.display_name || b.name_id);
          break;
        case 'job':
          comparison = (a.job || '').localeCompare(b.job || '');
          break;
        case 'ping':
          comparison = (a.current_ping || 999) - (b.current_ping || 999);
          break;
        case 'lastLogin':
          comparison = new Date(b.last_login || 0) - new Date(a.last_login || 0);
          break;
        case 'lastLogout':
          comparison = new Date(b.last_logout || 0) - new Date(a.last_logout || 0);
          break;
        default:
          comparison = 0;
      }

      return knownSortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('pt-BR');
  };

  // Group resources by category with descriptions
  const categorizeResources = (resources) => {
    if (!resources) return {};
    
    const categories = {
      'VORP Framework': { 
        resources: [], 
        description: 'Core RedM framework - provides character system, inventory, economy, jobs, and database management'
      },
      'Atlanta Scripts': { 
        resources: [], 
        description: 'Custom server scripts for farm management, activities tracking, and unique gameplay features'
      },
      'Admin & Moderation': { 
        resources: [], 
        description: 'Administrative tools for server management, player moderation, and debugging'
      },
      'Maps & MLOs': { 
        resources: [], 
        description: 'Custom map additions and interior locations (Map Loader Objects)'
      },
      'Utilities & Tools': { 
        resources: [], 
        description: 'Development tools, APIs, loggers, and utility scripts for server functionality'
      },
      'Gameplay & Features': { 
        resources: [], 
        description: 'Additional gameplay features, mechanics, and player interaction systems'
      }
    };

    resources.forEach(resource => {
      if (resource.includes('vorp')) {
        categories['VORP Framework'].resources.push(resource);
      } else if (resource.includes('atlanta')) {
        categories['Atlanta Scripts'].resources.push(resource);
      } else if (resource.includes('admin') || resource.includes('drg_admin') || resource.includes('mod')) {
        categories['Admin & Moderation'].resources.push(resource);
      } else if (resource.includes('map') || resource.includes('mlo') || resource.includes('interior')) {
        categories['Maps & MLOs'].resources.push(resource);
      } else if (resource.includes('tool') || resource.includes('logger') || resource.includes('api') || resource.includes('util')) {
        categories['Utilities & Tools'].resources.push(resource);
      } else {
        categories['Gameplay & Features'].resources.push(resource);
      }
    });

    return categories;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const endpoints = [
    { url: '/info.json', status: 'online', description: 'Server configuration and resources' },
    { url: '/players.json', status: 'online', description: 'Real-time player list' },
    { url: '/dynamic.json', status: 'online', description: 'Server status and metadata' },
    { url: `${TXADMIN_URL}/`, status: 'auth', description: 'txAdmin panel (requires login)' },
    { url: '/api', status: 'partial', description: 'API endpoints (authentication required)' }
  ];

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ServerIcon /> Server Monitor - Atlanta Season 2
      </Typography>

      {/* Server Status Card */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <OnlineIcon color="success" /> Server Status
              </Typography>
              
              {dynamicInfo ? (
                <Box>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Hostname:</strong> {dynamicInfo.hostname}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Game Type:</strong> {dynamicInfo.gametype}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Map:</strong> {dynamicInfo.mapname}
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        Players Online
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {dynamicInfo.clients || players.length} / {dynamicInfo.sv_maxclients}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(dynamicInfo.clients || players.length) / dynamicInfo.sv_maxclients * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Chip 
                      icon={<UptimeIcon />}
                      label="3 Anos Online"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      icon={<DiscordIcon />}
                      label={DISCORD_INVITE}
                      color="secondary"
                      variant="outlined"
                      onClick={() => window.open(`https://${DISCORD_INVITE}`, '_blank')}
                      clickable
                    />
                  </Box>
                </Box>
              ) : (
                <CircularProgress />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon /> Server Endpoints
              </Typography>
              
              <List dense>
                {endpoints.map((endpoint, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={endpoint.url}
                      secondary={endpoint.description}
                    />
                    <Chip
                      size="small"
                      label={endpoint.status === 'online' ? 'Online' : 
                             endpoint.status === 'auth' ? 'Auth Required' : 'Partial'}
                      color={endpoint.status === 'online' ? 'success' : 
                             endpoint.status === 'auth' ? 'warning' : 'default'}
                    />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.open(TXADMIN_URL, '_blank')}
                  startIcon={<LinkIcon />}
                >
                  txAdmin Panel
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={fetchServerData}
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Known People Box */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer',
              mb: 2
            }}
            onClick={() => toggleSection('knownPlayers')}
          >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon color="warning" /> 
              Known People
              <Badge badgeContent={Object.keys(knownPlayers).length} color="primary" />
            </Typography>
            <IconButton>
              {expandedSections.knownPlayers ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.knownPlayers}>
            {/* Filters and Controls */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search known people..."
                value={knownSearchTerm}
                onChange={(e) => setKnownSearchTerm(e.target.value)}
                sx={{ flex: 1, minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showOfflinePlayers}
                    onChange={(e) => setShowOfflinePlayers(e.target.checked)}
                  />
                }
                label="Show Offline"
              />
              
            </Box>

            {/* Known People Table */}
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleKnownPlayersSort('status')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Status {getKnownPlayersSortIcon('status')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleKnownPlayersSort('name')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Display Name {getKnownPlayersSortIcon('name')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleKnownPlayersSort('job')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Job {getKnownPlayersSortIcon('job')}
                      </Box>
                    </TableCell>
                    <TableCell>Boot (ID)</TableCell>
                    <TableCell>Pombo</TableCell>
                    <TableCell 
                      sx={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleKnownPlayersSort('lastLogin')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Last Login {getKnownPlayersSortIcon('lastLogin')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleKnownPlayersSort('lastLogout')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Last Logout {getKnownPlayersSortIcon('lastLogout')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleKnownPlayersSort('ping')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        Ping {getKnownPlayersSortIcon('ping')}
                      </Box>
                    </TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredKnownPlayers().map((player) => (
                    <TableRow 
                      key={player.name_id}
                      sx={{ 
                        backgroundColor: player.is_online ? 'rgba(76, 175, 80, 0.08)' : 'inherit',
                        opacity: player.is_online ? 1 : 0.7
                      }}
                    >
                      <TableCell>
                        <Chip
                          icon={player.is_online ? <OnlineIcon /> : <LogoutIcon />}
                          label={player.is_online ? 'Online' : 'Offline'}
                          size="small"
                          color={player.is_online ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StarIcon color="warning" fontSize="small" />
                          {player.display_name || player.name_id}
                          {player.worker_link && (
                            <Tooltip title={`Linked to Worker: ${player.worker_link}`}>
                              <WorkIcon fontSize="small" color="primary" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{player.job || '-'}</TableCell>
                      <TableCell>{player.is_online ? player.last_seen_id : '-'}</TableCell>
                      <TableCell>{player.pombo || '-'}</TableCell>
                      <TableCell>{formatTimestamp(player.last_login)}</TableCell>
                      <TableCell>{formatTimestamp(player.last_logout)}</TableCell>
                      <TableCell align="center">
                        {player.is_online && player.current_ping ? (
                          <Chip
                            icon={<PingIcon />}
                            label={`${player.current_ping}ms`}
                            size="small"
                            color={getPingColor(player.current_ping)}
                            variant="outlined"
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setEditingPlayer(player);
                                setEditDialogOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveKnownPlayer(player.name_id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {getFilteredKnownPlayers().length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {knownSearchTerm ? 'No known people found matching your search' : 
                   Object.keys(knownPlayers).length === 0 ? 'No known people yet. Click the star icon on online players to add them.' :
                   'No people match the current filters'}
                </Typography>
              </Box>
            )}
          </Collapse>
        </CardContent>
      </Card>

      {/* Player List */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon /> 
              Players Online 
              <Badge badgeContent={filteredAndSortedPlayers.length} color="primary" />
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Last update: {lastUpdate.toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('id')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      ID {getSortIcon('id')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Name {getSortIcon('name')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    align="center"
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('ping')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      Ping {getSortIcon('ping')}
                    </Box>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedPlayers.map((player) => {
                  const isKnown = knownPlayers[player.name] !== undefined;
                  const knownPlayer = knownPlayers[player.name];
                  
                  return (
                    <TableRow 
                      key={player.id}
                      sx={{ 
                        backgroundColor: player.name === 'GM Stoffel' ? 'rgba(66, 135, 245, 0.1)' : 
                                       isKnown ? 'rgba(255, 215, 0, 0.05)' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
                      }}
                    >
                      <TableCell>{player.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isKnown && (
                            <Tooltip title="Known Player">
                              <StarIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                          {knownPlayer?.display_name || player.name}
                          {player.name === 'GM Stoffel' && (
                            <Chip label="YOU" size="small" color="primary" />
                          )}
                          {knownPlayer?.job && (
                            <Chip label={knownPlayer.job} size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<PingIcon />}
                          label={`${player.ping}ms`}
                          size="small"
                          color={getPingColor(player.ping)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<OnlineIcon />}
                          label="Online"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {isKnown ? (
                            <>
                              <Tooltip title="Edit Known Player">
                                <IconButton 
                                  size="small" 
                                  onClick={() => openEditDialog(player, false)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove from Known Players">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleRemoveKnownPlayer(player.name)}
                                  color="error"
                                >
                                  <StarIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip title="Add to Known Players">
                              <IconButton 
                                size="small" 
                                onClick={() => openEditDialog(player, true)}
                                color="warning"
                              >
                                <StarBorderIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredAndSortedPlayers.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {searchTerm ? 'No players found matching your search' : 'No players online'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Resources Section */}
      <Card>
        <CardContent>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => toggleSection('resources')}
          >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ResourceIcon /> 
              Server Resources 
              {serverInfo && (
                <Badge badgeContent={serverInfo.resources?.length || 0} color="primary" />
              )}
            </Typography>
            <IconButton>
              {expandedSections.resources ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.resources}>
            {serverInfo && serverInfo.resources && (
              <Box sx={{ mt: 2 }}>
                {Object.entries(categorizeResources(serverInfo.resources)).map(([category, categoryData]) => (
                  categoryData.resources.length > 0 && (
                    <Box key={category} sx={{ mb: 3, p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <Typography variant="subtitle1" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {category} ({categoryData.resources.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                        {categoryData.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {categoryData.resources.map((resource, index) => (
                          <Chip
                            key={index}
                            label={resource}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              backgroundColor: 'rgba(66, 135, 245, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(66, 135, 245, 0.2)' }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )
                ))}
              </Box>
            )}
          </Collapse>
        </CardContent>
      </Card>


      {/* Edit Known Player Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPlayer?.name_id ? 'Edit Known Player' : 'Add Known Player'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Player Name ID"
              value={editingPlayer?.name_id || ''}
              disabled
              fullWidth
              helperText="This is the permanent player name used as ID"
            />
            
            <TextField
              label="Display Name"
              value={editingPlayer?.display_name || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, display_name: e.target.value })}
              fullWidth
              helperText="Custom display name (optional)"
            />
            
            <TextField
              label="Pombo"
              value={editingPlayer?.pombo || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, pombo: e.target.value })}
              fullWidth
              helperText="Pombo reference or ID"
            />
            
            <TextField
              label="Job"
              value={editingPlayer?.job || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, job: e.target.value })}
              fullWidth
              helperText="Player's job or role"
            />
            
            <FormControl fullWidth>
              <InputLabel>Link to Worker</InputLabel>
              <Select
                value={editingPlayer?.worker_link || ''}
                onChange={(e) => setEditingPlayer({ ...editingPlayer, worker_link: e.target.value })}
                label="Link to Worker"
              >
                <MenuItem value="">None</MenuItem>
                {workers.map((worker) => (
                  <MenuItem key={worker.id} value={worker.id}>
                    {worker.nome} (ID: {worker.fixo_id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {editingPlayer?.is_online !== undefined && (
              <Alert severity="info">
                Player is currently {editingPlayer.is_online ? 'ONLINE' : 'OFFLINE'}
                {editingPlayer.current_id && ` with Boot ID: ${editingPlayer.current_id}`}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => handleSaveKnownPlayer(editingPlayer)} 
            variant="contained"
            disabled={!editingPlayer?.name_id}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default Server;