import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Send,
  Refresh,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import axios from 'axios';

const PlantDemandBox = ({ socket }) => {
  const [demandData, setDemandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [autoSend, setAutoSend] = useState(false); // Disabled by default
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [lastSent, setLastSent] = useState(null);

  // Fetch demand data
  const fetchDemandData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/inventario/demanda-plantas');
      if (response.data.sucesso) {
        setDemandData(response.data.dados);
      }
    } catch (error) {
      console.error('Error fetching demand data:', error);
      setNotification({
        open: true,
        message: 'Erro ao carregar dados de demanda',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Send to Discord
  const sendToDiscord = async () => {
    try {
      setSending(true);
      const response = await axios.post('/api/inventario/enviar-demanda-discord');
      if (response.data.sucesso) {
        setNotification({
          open: true,
          message: 'Demanda enviada ao Discord com sucesso!',
          severity: 'success'
        });
        setLastSent(new Date());
      }
    } catch (error) {
      console.error('Error sending to Discord:', error);
      setNotification({
        open: true,
        message: 'Erro ao enviar para Discord',
        severity: 'error'
      });
    } finally {
      setSending(false);
    }
  };

  // Auto-send logic (optional - users can enable if needed)
  useEffect(() => {
    if (autoSend && demandData) {
      const criticalItems = demandData.demanda.filter(item => item.status === 'CRÍTICO');
      if (criticalItems.length > 0) {
        // Check if we haven't sent in the last 30 minutes
        if (!lastSent || (new Date() - lastSent) > 30 * 60 * 1000) {
          sendToDiscord();
        }
      }
    }
  }, [autoSend, demandData, lastSent]);

  // Initial load
  useEffect(() => {
    fetchDemandData();
  }, []);

  // Socket listener for inventory updates
  useEffect(() => {
    if (socket) {
      const handleInventoryUpdate = () => {
        fetchDemandData();
      };

      socket.on('inventario:atualizado', handleInventoryUpdate);
      
      return () => {
        socket.off('inventario:atualizado', handleInventoryUpdate);
      };
    }
  }, [socket]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'CRÍTICO': return 'error';
      case 'BAIXO': return 'warning';
      case 'BOM': return 'success';
      default: return 'default';
    }
  };

  // Get progress color
  const getProgressColor = (percentage) => {
    if (percentage < 20) return '#f44336'; // red
    if (percentage < 50) return '#ff9800'; // orange
    return '#4caf50'; // green
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography sx={{ mt: 2 }}>Carregando dados de demanda...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!demandData) {
    return null;
  }

  const hasCritical = demandData.demanda.some(item => item.status === 'CRÍTICO');
  const hasLow = demandData.demanda.some(item => item.status === 'BAIXO');

  return (
    <>
      <Card 
        sx={{ 
          mb: 3,
          border: hasCritical ? '2px solid #f44336' : hasLow ? '2px solid #ff9800' : '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: hasCritical ? '0 0 10px rgba(244, 67, 54, 0.3)' : undefined
        }}
      >
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {hasCritical && <Warning color="error" />}
              <Typography variant="h6" component="div">
                🚨 DEMANDA URGENTE DE PLANTAS
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Auto-envio periódico (30min) quando há itens críticos">
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSend}
                      onChange={(e) => setAutoSend(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Auto-envio"
                  sx={{ mr: 1 }}
                />
              </Tooltip>
              <Tooltip title="Atualizar dados">
                <IconButton size="small" onClick={fetchDemandData} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={expanded}>
            {/* Info Alert */}
            <Alert severity="info" sx={{ mb: 2 }} variant="outlined">
              <Typography variant="body2">
                <strong>📋 Sistema Manual:</strong> As notificações do Discord agora são enviadas apenas manualmente. 
                Isso evita spam quando o inventário muda frequentemente. Use o botão "Enviar para Discord" quando necessário.
              </Typography>
            </Alert>

            {/* Priority Orders */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                PLANTAR AGORA:
              </Typography>
              {demandData.demanda.map((item, index) => (
                <Box key={item.itemId} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {index + 1}º {item.statusEmoji} {item.nome.toUpperCase()}: 
                    </Typography>
                    {item.sementesNecessarias > 0 ? (
                      <Chip 
                        label={`${item.sementesNecessarias} sementes`}
                        color={getStatusColor(item.status)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    ) : (
                      <Chip 
                        label="Estoque OK"
                        color="success"
                        size="small"
                        icon={<CheckCircle />}
                      />
                    )}
                    {item.status === 'CRÍTICO' && (
                      <Chip 
                        label={`CRÍTICO - só ${item.percentualEstoque}% estoque`}
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(100, item.percentualEstoque)}
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getProgressColor(item.percentualEstoque)
                          }
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.atual.toLocaleString('pt-BR')}/{item.meta.toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Current Levels Summary */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  📊 Níveis Atuais:
                </Typography>
              </Grid>
              {demandData.demanda.map(item => (
                <Grid item xs={4} key={item.itemId}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.nome}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: item.status === 'CRÍTICO' ? '#f44336' : 
                               item.status === 'BAIXO' ? '#ff9800' : '#4caf50'
                      }}
                    >
                      {item.atual.toLocaleString('pt-BR')}/{item.meta.toLocaleString('pt-BR')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.statusEmoji} {item.percentualEstoque}%
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
                onClick={sendToDiscord}
                disabled={sending}
              >
                {sending ? 'Enviando...' : 'Enviar para Discord'}
              </Button>
            </Box>

            {lastSent && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                Último envio: {lastSent.toLocaleString('pt-BR')}
              </Typography>
            )}
          </Collapse>
        </CardContent>
      </Card>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PlantDemandBox;