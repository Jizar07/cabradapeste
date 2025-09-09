import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Snackbar,
  Alert,
  Slider,
  FormControlLabel
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ShoppingCart as ShoppingCartIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

const StockManagementSection = ({ socket }) => {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [reporCriticosDialog, setReporCriticosDialog] = useState(false);
  const [planejarComprasDialog, setPlanejarComprasDialog] = useState(false);
  const [verAlertasDialog, setVerAlertasDialog] = useState(false);
  
  // Operation states
  const [restocking, setRestocking] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [customQuantities, setCustomQuantities] = useState({});
  
  // Notification states
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  // Alerts dialog tab state
  const [alertsTab, setAlertsTab] = useState(0);

  // Fetch stock data
  const fetchStockData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stock/config');
      if (response.ok) {
        const data = await response.json();
        setStockData(data.data);
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('estoque:avisos-atualizados', (data) => {
        console.log('📦 Stock warnings updated:', data);
        fetchStockData();
      });

      socket.on('estoque:configuracao-atualizada', (data) => {
        console.log('⚙️ Stock configuration updated:', data);
        fetchStockData();
      });

      return () => {
        socket.off('estoque:avisos-atualizados');
        socket.off('estoque:configuracao-atualizada');
      };
    }
  }, [socket]);

  const calculateRestockCost = (avisos) => {
    return avisos.reduce((total, aviso) => total + (aviso.quantidade_restock * 0.5), 0);
  };

  // Professional handler functions
  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleReporCriticos = () => {
    const avisosCriticos = stockData?.avisos?.filter(a => a.prioridade === 'critico' && !a.visto) || [];
    if (avisosCriticos.length === 0) {
      showNotification('Nenhum item crítico encontrado!', 'info');
      return;
    }
    
    // Initialize selected items (all selected by default)
    const initialSelected = {};
    avisosCriticos.forEach(aviso => {
      initialSelected[aviso.id] = true;
    });
    setSelectedItems(initialSelected);
    setReporCriticosDialog(true);
  };

  const handlePlanejarCompras = () => {
    const avisos = stockData?.avisos || [];
    if (avisos.length === 0) {
      showNotification('Nenhum item precisa ser reposto no momento!', 'info');
      return;
    }
    
    // Initialize custom quantities with default restock amounts
    const initialQuantities = {};
    avisos.forEach(aviso => {
      initialQuantities[aviso.id] = aviso.quantidade_restock;
    });
    setCustomQuantities(initialQuantities);
    setPlanejarComprasDialog(true);
  };

  const handleVerTodosAlertas = () => {
    const avisos = stockData?.avisos || [];
    if (avisos.length === 0) {
      showNotification('Nenhum alerta de estoque ativo!', 'info');
      return;
    }
    setVerAlertasDialog(true);
  };

  const executeRestock = async () => {
    const avisosCriticos = stockData?.avisos?.filter(a => a.prioridade === 'critico' && !a.visto) || [];
    const selectedAvisos = avisosCriticos.filter(aviso => selectedItems[aviso.id]);
    
    if (selectedAvisos.length === 0) {
      showNotification('Selecione pelo menos um item para repor!', 'warning');
      return;
    }

    setRestocking(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const aviso of selectedAvisos) {
        try {
          // Add items to inventory
          const addResponse = await fetch('/api/inventario/adicionar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nomeItem: aviso.item_id,
              quantidade: aviso.quantidade_restock,
              autor: 'Sistema - Restock Automático'
            })
          });

          if (addResponse.ok) {
            // Mark warning as seen
            await fetch(`/api/stock/warnings/${aviso.id}/seen`, {
              method: 'POST'
            });
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error restocking ${aviso.item_nome}:`, error);
          errorCount++;
        }
      }

      // Refresh data
      await fetchStockData();
      
      if (errorCount === 0) {
        showNotification(`✅ Reposição concluída! ${successCount} itens foram repostos com sucesso.`, 'success');
      } else if (successCount > 0) {
        showNotification(`⚠️ Reposição parcial: ${successCount} sucessos, ${errorCount} falhas.`, 'warning');
      } else {
        showNotification(`❌ Falha na reposição: ${errorCount} erros ocorreram.`, 'error');
      }
      
      setReporCriticosDialog(false);
      setSelectedItems({});
      
    } catch (error) {
      console.error('Error in bulk restocking:', error);
      showNotification('❌ Erro ao repor itens críticos. Tente novamente.', 'error');
    } finally {
      setRestocking(false);
    }
  };

  if (loading || !stockData) {
    return null;
  }

  const { avisos = [], estatisticas = {} } = stockData;
  const avisosCriticos = avisos.filter(a => a.prioridade === 'critico' && !a.visto);
  const avisosNormais = avisos.filter(a => a.prioridade !== 'critico' && !a.visto);

  return (
    <>
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              📦 Gerenciamento de Estoque
            </Typography>
            
            <Grid container spacing={3}>
              {/* Left Card - Alertas de Estoque */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center">
                    ⚠️ Alertas de Estoque
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="textSecondary">Críticos</Typography>
                        <Typography variant="h2" color="error.main" sx={{ fontSize: '3rem' }}>
                          {avisosCriticos.length}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="textSecondary">Avisos</Typography>
                        <Typography variant="h2" color="warning.main" sx={{ fontSize: '3rem' }}>
                          {avisosNormais.length}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Box textAlign="center">
                    <Typography variant="body2" color="textSecondary">Custo para Repor</Typography>
                    <Typography variant="h5" color="primary.main">
                      ${calculateRestockCost(avisos).toFixed(2)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Right Card - Ações Rápidas */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center">
                    🎯 Ações Rápidas
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label="ℹ️ Limites de Estoque: Animais: 20, Ração: 120, Sementes: 500"
                      variant="outlined"
                      color="info"
                      sx={{ fontSize: '0.75rem', mb: 2 }}
                    />
                  </Box>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="outlined"
                        sx={{ 
                          mb: 1,
                          bgcolor: avisosCriticos.length > 0 ? '#e0e0e0' : 'transparent'
                        }}
                        disabled={avisosCriticos.length === 0}
                        onClick={handleReporCriticos}
                      >
                        ⚪ Repor Críticos ({avisosCriticos.length})
                      </Button>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="warning"
                        sx={{ mb: 1 }}
                        onClick={handlePlanejarCompras}
                      >
                        🛒 Planejar Compras
                      </Button>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="success"
                        onClick={handleVerTodosAlertas}
                      >
                        △ Ver Todos os Alertas
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Professional Dialogs */}
    
    {/* Repor Críticos Dialog */}
    <Dialog 
      open={reporCriticosDialog} 
      onClose={() => setReporCriticosDialog(false)}
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorIcon color="error" />
          Repor Itens Críticos
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Selecione os itens que deseja repor automaticamente ao nível máximo:
        </Typography>
        
        {stockData?.avisos?.filter(a => a.prioridade === 'critico' && !a.visto).map((aviso) => (
          <Paper key={aviso.id} elevation={1} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedItems[aviso.id] || false}
                    onChange={(e) => setSelectedItems(prev => ({
                      ...prev,
                      [aviso.id]: e.target.checked
                    }))}
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="error">
                  {aviso.item_nome}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Atual: {aviso.quantidade_atual} → Máximo: {aviso.maximo} (Repor: +{aviso.quantidade_restock})
                </Typography>
                <Typography variant="body2" color="primary">
                  Custo estimado: ${(aviso.quantidade_restock * 0.5).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
        
        {stockData?.avisos?.filter(a => a.prioridade === 'critico' && !a.visto).length === 0 && (
          <Typography color="textSecondary" textAlign="center" sx={{ py: 4 }}>
            Nenhum item crítico encontrado.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReporCriticosDialog(false)}>
          Cancelar
        </Button>
        <Button 
          onClick={executeRestock}
          variant="contained" 
          color="error"
          disabled={restocking || Object.values(selectedItems).filter(Boolean).length === 0}
          startIcon={restocking ? <CircularProgress size={20} /> : <RefreshIcon />}
        >
          {restocking ? 'Repondo...' : 'Repor Selecionados'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Planejar Compras Dialog */}
    <Dialog 
      open={planejarComprasDialog} 
      onClose={() => setPlanejarComprasDialog(false)}
      maxWidth="lg" 
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartIcon color="warning" />
          Planejar Compras
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Ajuste as quantidades de reposição conforme necessário:
        </Typography>
        
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Item</strong></TableCell>
                <TableCell align="center"><strong>Atual</strong></TableCell>
                <TableCell align="center"><strong>Máximo</strong></TableCell>
                <TableCell align="center"><strong>Quantidade</strong></TableCell>
                <TableCell align="center"><strong>Custo</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockData?.avisos?.map((aviso) => (
                <TableRow key={aviso.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {aviso.item_nome}
                      </Typography>
                      <Chip 
                        size="small"
                        label={aviso.prioridade === 'critico' ? 'CRÍTICO' : 'AVISO'}
                        color={aviso.prioridade === 'critico' ? 'error' : 'warning'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={aviso.quantidade_atual}
                      color={aviso.quantidade_atual === 0 ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">{aviso.maximo}</TableCell>
                  <TableCell align="center" sx={{ width: 200 }}>
                    <Slider
                      value={customQuantities[aviso.id] || aviso.quantidade_restock}
                      onChange={(_, value) => setCustomQuantities(prev => ({
                        ...prev,
                        [aviso.id]: value
                      }))}
                      min={0}
                      max={aviso.maximo}
                      step={1}
                      marks={[
                        { value: 0, label: '0' },
                        { value: aviso.quantidade_restock, label: `${aviso.quantidade_restock}` },
                        { value: aviso.maximo, label: `${aviso.maximo}` }
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body1" color="primary" fontWeight="bold">
                      ${((customQuantities[aviso.id] || aviso.quantidade_restock) * 0.5).toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Paper elevation={2} sx={{ p: 2, mt: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="h6" textAlign="center">
            💰 Custo Total: ${stockData?.avisos?.reduce((total, aviso) => 
              total + ((customQuantities[aviso.id] || aviso.quantidade_restock) * 0.5), 0
            ).toFixed(2)}
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPlanejarComprasDialog(false)}>
          Fechar
        </Button>
        <Button 
          variant="contained"
          color="primary"
          onClick={() => {
            const planText = stockData?.avisos?.map(aviso => 
              `${aviso.item_nome}: ${customQuantities[aviso.id] || aviso.quantidade_restock}x - $${((customQuantities[aviso.id] || aviso.quantidade_restock) * 0.5).toFixed(2)}`
            ).join('\n');
            navigator.clipboard.writeText(`PLANO DE COMPRAS:\n\n${planText}\n\nTOTAL: $${stockData?.avisos?.reduce((total, aviso) => total + ((customQuantities[aviso.id] || aviso.quantidade_restock) * 0.5), 0).toFixed(2)}`);
            showNotification('Plano de compras copiado para clipboard!', 'success');
          }}
        >
          📋 Copiar Plano
        </Button>
      </DialogActions>
    </Dialog>

    {/* Ver Todos Alertas Dialog */}
    <Dialog 
      open={verAlertasDialog} 
      onClose={() => setVerAlertasDialog(false)}
      maxWidth="lg" 
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityIcon color="success" />
          Todos os Alertas de Estoque
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs value={alertsTab} onChange={(_, newValue) => setAlertsTab(newValue)} sx={{ mb: 2 }}>
          <Tab label={`🔴 Críticos (${stockData?.avisos?.filter(a => a.prioridade === 'critico').length || 0})`} />
          <Tab label={`🟡 Avisos (${stockData?.avisos?.filter(a => a.prioridade !== 'critico').length || 0})`} />
          <Tab label={`📋 Todos (${stockData?.avisos?.length || 0})`} />
        </Tabs>

        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Prioridade</strong></TableCell>
                <TableCell><strong>Item</strong></TableCell>
                <TableCell align="center"><strong>Estoque</strong></TableCell>
                <TableCell align="center"><strong>Mínimo</strong></TableCell>
                <TableCell align="center"><strong>Repor</strong></TableCell>
                <TableCell align="center"><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockData?.avisos?.filter(aviso => {
                if (alertsTab === 0) return aviso.prioridade === 'critico';
                if (alertsTab === 1) return aviso.prioridade !== 'critico';
                return true;
              }).map((aviso) => (
                <TableRow key={aviso.id}>
                  <TableCell>
                    <Chip 
                      icon={aviso.prioridade === 'critico' ? <ErrorIcon /> : <WarningIcon />}
                      label={aviso.prioridade === 'critico' ? 'CRÍTICO' : 'AVISO'}
                      color={aviso.prioridade === 'critico' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {aviso.item_nome}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {aviso.item_id}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={aviso.quantidade_atual}
                      color={aviso.quantidade_atual === 0 ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">{aviso.minimo}</TableCell>
                  <TableCell align="center">
                    <Typography color="primary" fontWeight="bold">
                      +{aviso.quantidade_restock}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={async () => {
                        try {
                          await fetch(`/api/stock/warnings/${aviso.id}/seen`, {
                            method: 'POST'
                          });
                          await fetchStockData();
                          showNotification(`Alerta para ${aviso.item_nome} marcado como visto`, 'success');
                        } catch (error) {
                          showNotification('Erro ao marcar alerta como visto', 'error');
                        }
                      }}
                    >
                      ✓ Visto
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setVerAlertasDialog(false)}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>

    {/* Toast Notification */}
    <Snackbar
      open={notification.open}
      autoHideDuration={6000}
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

export default StockManagementSection;