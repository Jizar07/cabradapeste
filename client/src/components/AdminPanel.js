import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Save,
  Delete,
  Add,
  Settings
} from '@mui/icons-material';

const AdminPanel = () => {
  const [channelToWatch, setChannelToWatch] = useState('');
  const [watchedChannels, setWatchedChannels] = useState([]);
  const [commands, setCommands] = useState([
    { name: 'ping', description: 'Check bot latency', enabled: true },
    { name: 'inventory', description: 'Manage farm inventory', enabled: true }
  ]);
  const [newCommand, setNewCommand] = useState({ name: '', description: '' });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/simple-config');
      if (response.ok) {
        const data = await response.json();
        setWatchedChannels(data.watchedChannels || []);
        setCommands(data.commands || commands);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveConfig = async () => {
    try {
      const response = await fetch('/api/admin/simple-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedChannels,
          commands
        })
      });

      if (response.ok) {
        showNotification('Settings saved successfully!', 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    }
  };

  const addChannelToWatch = () => {
    if (channelToWatch.trim()) {
      const newChannel = {
        id: channelToWatch.trim(),
        name: `Channel ${channelToWatch.slice(-4)}`,
        addedAt: new Date().toISOString()
      };
      
      setWatchedChannels([...watchedChannels, newChannel]);
      setChannelToWatch('');
      showNotification('Channel added for monitoring', 'success');
    }
  };

  const removeChannel = (channelId) => {
    setWatchedChannels(watchedChannels.filter(ch => ch.id !== channelId));
    showNotification('Channel removed', 'info');
  };

  const addCommand = () => {
    if (newCommand.name.trim() && newCommand.description.trim()) {
      setCommands([...commands, { ...newCommand, enabled: true }]);
      setNewCommand({ name: '', description: '' });
      showNotification('Command added', 'success');
    }
  };

  const toggleCommand = (index) => {
    const updated = [...commands];
    updated[index].enabled = !updated[index].enabled;
    setCommands(updated);
  };

  const removeCommand = (index) => {
    setCommands(commands.filter((_, i) => i !== index));
    showNotification('Command removed', 'info');
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Settings sx={{ mr: 2, color: 'primary.main' }} />
        Bot Admin Panel
      </Typography>

      <Grid container spacing={3}>
        {/* Channels to Watch */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Channels to Watch"
              subheader="Add Discord channel IDs to monitor for farm logs"
            />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      label="Channel ID"
                      value={channelToWatch}
                      onChange={(e) => setChannelToWatch(e.target.value)}
                      placeholder="1234567890123456789"
                      helperText="Right-click Discord channel → Copy ID"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={addChannelToWatch}
                      disabled={!channelToWatch.trim()}
                      fullWidth
                    >
                      Add Channel
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {watchedChannels.length === 0 ? (
                <Alert severity="info">
                  No channels being watched. Add channel IDs above to start monitoring farm activities.
                </Alert>
              ) : (
                <List>
                  {watchedChannels.map((channel) => (
                    <ListItem key={channel.id}>
                      <ListItemText
                        primary={`Channel ID: ${channel.id}`}
                        secondary={`Added: ${new Date(channel.addedAt).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          color="error"
                          onClick={() => removeChannel(channel.id)}
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Bot Commands */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Bot Commands"
              subheader="Manage available slash commands"
            />
            <CardContent>
              {/* Add New Command */}
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Command Name"
                      value={newCommand.name}
                      onChange={(e) => setNewCommand({...newCommand, name: e.target.value})}
                      placeholder="mycommand"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={newCommand.description}
                      onChange={(e) => setNewCommand({...newCommand, description: e.target.value})}
                      placeholder="What this command does"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={addCommand}
                      disabled={!newCommand.name.trim() || !newCommand.description.trim()}
                      fullWidth
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Commands List */}
              <List>
                {commands.map((command, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography 
                            variant="subtitle1" 
                            color={command.enabled ? 'text.primary' : 'text.disabled'}
                          >
                            /{command.name}
                          </Typography>
                          <Button
                            size="small"
                            variant={command.enabled ? 'contained' : 'outlined'}
                            color={command.enabled ? 'success' : 'default'}
                            onClick={() => toggleCommand(index)}
                          >
                            {command.enabled ? 'Enabled' : 'Disabled'}
                          </Button>
                        </Box>
                      }
                      secondary={command.description}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        color="error"
                        onClick={() => removeCommand(index)}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Save />}
              onClick={saveConfig}
              sx={{ minWidth: 200 }}
            >
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPanel;