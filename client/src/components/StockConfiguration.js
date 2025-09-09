import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Autocomplete,
  InputAdornment,
  Tooltip,
  Fab,
  Zoom,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  AttachMoney as AttachMoneyIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4050/api';

const StockConfiguration = () => {
  const socket = useContext(SocketContext);
  const [configurations, setConfigurations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [costSummary, setCostSummary] = useState(null);
  const [syncCategories, setSyncCategories] = useState(false);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBelowMinimum, setShowBelowMinimum] = useState(false);
  
  // Sorting states
  const [orderBy, setOrderBy] = useState('nome_exibicao');
  const [order, setOrder] = useState('asc');
  
  const [formData, setFormData] = useState({
    id: '',
    nome_exibicao: '',
    categoria: 'outros',
    minimo: 10,
    maximo: 100,
    ativo: true,
    preco_unitario: 0,
    preco_min: 0,
    preco_max: 0,
    usar_preco_fixo: false
  });

  const [availableCategories, setAvailableCategories] = useState([
    { value: 'animais', label: '🐄 Animais', color: '#8B4513' },
    { value: 'sementes', label: '🌱 Sementes', color: '#228B22' },
    { value: 'plantas', label: '🌿 Plantas', color: '#32CD32' },
    { value: 'ferramentas', label: '🔧 Ferramentas', color: '#4169E1' },
    { value: 'materiais', label: '📦 Materiais', color: '#FF8C00' },
    { value: 'produtos', label: '📦 Produtos', color: '#9932CC' },
    { value: 'consumeveis', label: '🍪 Consumeveis', color: '#FF1493' },
    { value: 'comidas', label: '🍽️ Comidas', color: '#FF6347' },
    { value: 'bebidas', label: '🥤 Bebidas', color: '#1E90FF' },
    { value: 'racoes', label: '🥕 Racoes', color: '#DAA520' },
    { value: 'outros', label: '📋 Outros', color: '#808080' }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  // Listen for WebSocket inventory updates
  useEffect(() => {
    if (socket) {
      const handleInventoryUpdate = (data) => {
        console.log('WebSocket inventory update:', data);
        if (data && data.itens) {
          const items = Object.entries(data.itens).map(([id, itemData]) => ({
            id,
            nome: itemData.nome || id,
            quantidade: itemData.quantidade || 0,
            categoria: itemData.categoria || 'outros'
          }));
          console.log('Parsed WebSocket inventory items:', items.length, 'items');
          setInventoryItems(items);
          // Reload cost summary when inventory changes
          loadCostSummary();
        }
      };

      const handleStockConfigUpdate = (data) => {
        console.log('WebSocket stock config update:', data);
        // Update the specific configuration without reloading everything
        if (data && data.configuracao) {
          setConfigurations(prev => {
            const updated = [...prev];
            const index = updated.findIndex(config => config.id === data.configuracao.id);
            if (index >= 0) {
              updated[index] = data.configuracao;
              console.log('✅ Updated configuration for:', data.configuracao.id);
            } else {
              updated.push(data.configuracao);
              console.log('✅ Added new configuration for:', data.configuracao.id);
            }
            return updated;
          });
          // Reload cost summary when configurations change
          loadCostSummary();
        }
      };

      const handleSyncSettingUpdate = (data) => {
        console.log('WebSocket sync setting update:', data);
        if (data && data.sincronizar_categorias_inventario !== undefined) {
          setSyncCategories(data.sincronizar_categorias_inventario);
        }
      };

      socket.on('inventario:atualizado', handleInventoryUpdate);
      socket.on('estoque:configuracao-atualizada', handleStockConfigUpdate);
      socket.on('estoque:sync-setting-updated', handleSyncSettingUpdate);

      return () => {
        socket.off('inventario:atualizado', handleInventoryUpdate);
        socket.off('estoque:configuracao-atualizada', handleStockConfigUpdate);
        socket.off('estoque:sync-setting-updated', handleSyncSettingUpdate);
      };
    }
  }, [socket]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to load stock configurations from server
      try {
        const configResponse = await axios.get(`${API_BASE_URL}/stock/config`);
        console.log('Stock config response:', configResponse.data);
        const configs = Object.values(configResponse.data.configuracoes || {});
        setConfigurations(configs);
        console.log('✅ Loaded', configs.length, 'stock configurations from server');
        
        // Load sync setting
        if (configResponse.data.configuracoes_gerais) {
          setSyncCategories(configResponse.data.configuracoes_gerais.sincronizar_categorias_inventario || false);
        }
        
        // Load dynamic categories from API
        if (configResponse.data.categorias_disponiveis && configResponse.data.categorias_disponiveis.length > 0) {
          const dynamicCategories = configResponse.data.categorias_disponiveis.map(cat => {
            const categoryMap = {
              'animais': { label: '🐄 Animais', color: '#8B4513' },
              'sementes': { label: '🌱 Sementes', color: '#228B22' },
              'plantas': { label: '🌿 Plantas', color: '#32CD32' },
              'ferramentas': { label: '🔧 Ferramentas', color: '#4169E1' },
              'materiais': { label: '📦 Materiais', color: '#FF8C00' },
              'produtos': { label: '📦 Produtos', color: '#9932CC' },
              'consumeveis': { label: '🍪 Consumeveis', color: '#FF1493' },
              'comidas': { label: '🍽️ Comidas', color: '#FF6347' },
              'bebidas': { label: '🥤 Bebidas', color: '#1E90FF' },
              'racoes': { label: '🥕 Racoes', color: '#DAA520' },
              'outros': { label: '📋 Outros', color: '#808080' }
            };
            return {
              value: cat,
              label: categoryMap[cat]?.label || `📋 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
              color: categoryMap[cat]?.color || '#808080'
            };
          });
          setAvailableCategories(dynamicCategories);
          console.log('✅ Loaded', dynamicCategories.length, 'dynamic categories from API');
        }
      } catch (configError) {
        console.error('Failed to load stock configurations:', configError);
        showNotification('Erro ao carregar configurações de estoque', 'error');
        setConfigurations([]); // Start with empty array - let WebSocket populate it
      }

      // For inventory, rely on WebSocket updates since HTTP might be blocked
      console.log('Waiting for WebSocket inventory data... If HTTP is blocked, inventory will load via WebSocket.');
      
      // Initial inventory load attempt (might fail due to blocker)
      try {
        const inventoryResponse = await axios.get(`${API_BASE_URL}/inventario`);
        console.log('HTTP inventory response:', inventoryResponse.data);
        
        if (inventoryResponse.data && inventoryResponse.data.dados && inventoryResponse.data.dados.itens) {
          const items = Object.entries(inventoryResponse.data.dados.itens).map(([id, data]) => ({
            id,
            nome: data.nome || id,
            quantidade: data.quantidade || 0,
            categoria: data.categoria || 'outros'
          }));
          console.log('Parsed HTTP inventory items:', items.length, 'items');
          setInventoryItems(items);
        }
      } catch (inventoryError) {
        console.log('HTTP inventory blocked. Inventory will load via WebSocket when data updates.');
        showNotification('Carregando inventário via WebSocket...', 'info');
      }

      // Load cost summary
      await loadCostSummary();

    } catch (error) {
      console.error('Unexpected error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditMode(true);
      setSelectedItem(item);
      setFormData({
        id: item.id,
        nome_exibicao: item.nome_exibicao,
        categoria: item.categoria,
        minimo: item.minimo,
        maximo: item.maximo,
        ativo: item.ativo,
        preco_unitario: item.preco_unitario || 0,
        preco_min: item.preco_min || 0,
        preco_max: item.preco_max || item.preco_unitario || 0,
        usar_preco_fixo: item.usar_preco_fixo || false
      });
    } else {
      setEditMode(false);
      setSelectedItem(null);
      setFormData({
        id: '',
        nome_exibicao: '',
        categoria: 'outros',
        minimo: 10,
        maximo: 100,
        ativo: true,
        preco_unitario: 0,
        preco_min: 0,
        preco_max: 0,
        usar_preco_fixo: false
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setFormData({
      id: '',
      nome_exibicao: '',
      categoria: 'outros',
      minimo: 10,
      maximo: 100,
      ativo: true,
      preco_unitario: 0,
      preco_min: 0,
      preco_max: 0,
      usar_preco_fixo: false
    });
  };

  const fetchPricingInfo = async (itemId) => {
    if (!itemId) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/pricing/${itemId}`);
      if (response.data.success) {
        const pricing = response.data.data;
        setFormData(prev => ({
          ...prev,
          preco_min: pricing.preco_min || 0,
          preco_max: pricing.preco_max || 0,
          preco_unitario: pricing.preco_default || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching pricing info:', error);
    }
  };

  const loadCostSummary = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/cost-summary`);
      if (response.data.success) {
        setCostSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error loading cost summary:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.id || !formData.nome_exibicao) {
        showNotification('Por favor, selecione um item e defina um nome', 'warning');
        return;
      }

      if (formData.minimo >= formData.maximo) {
        showNotification('O valor mínimo deve ser menor que o máximo', 'warning');
        return;
      }

      const endpoint = editMode 
        ? `${API_BASE_URL}/stock/config/${formData.id}`
        : `${API_BASE_URL}/stock/config`;

      const method = editMode ? 'put' : 'post';

      console.log('Saving stock configuration:', formData);
      console.log('Endpoint:', endpoint);

      try {
        await axios[method](endpoint, formData);
        
        showNotification(
          editMode ? 'Configuração atualizada com sucesso!' : 'Item adicionado ao controle de estoque!',
          'success'
        );
        
        // Add item to local state immediately (optimistic update)
        if (!editMode) {
          const newConfig = {
            ...formData,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            quantidade_atual: inventoryItems.find(item => item.id === formData.id)?.quantidade || 0
          };
          setConfigurations(prev => [...prev, newConfig]);
        } else {
          setConfigurations(prev => prev.map(config => 
            config.id === formData.id ? { ...config, ...formData, atualizado_em: new Date().toISOString() } : config
          ));
        }
        
        handleCloseDialog();
        
        // Reload cost summary after successful save
        await loadCostSummary();
        
      } catch (httpError) {
        console.error('HTTP request blocked or failed:', httpError);
        
        if (httpError.message?.includes('ERR_BLOCKED_BY_CLIENT') || httpError.code === 'ERR_NETWORK') {
          showNotification(
            'Requisição bloqueada pelo navegador. A configuração pode ter sido salva. Recarregue a página para verificar.',
            'warning'
          );
          
          // Still close dialog and add optimistic update since it might have worked
          if (!editMode) {
            const newConfig = {
              ...formData,
              criado_em: new Date().toISOString(),
              atualizado_em: new Date().toISOString(),
              quantidade_atual: inventoryItems.find(item => item.id === formData.id)?.quantidade || 0
            };
            setConfigurations(prev => [...prev, newConfig]);
          }
          handleCloseDialog();
          // Reload cost summary after optimistic update
          await loadCostSummary();
        } else {
          showNotification('Erro ao salvar configuração: ' + httpError.message, 'error');
        }
      }
      
    } catch (error) {
      console.error('Unexpected error saving configuration:', error);
      showNotification('Erro inesperado ao salvar configuração', 'error');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Tem certeza que deseja remover este item do controle de estoque?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/stock/config/${itemId}`);
      showNotification('Item removido do controle de estoque', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      showNotification('Erro ao remover configuração', 'error');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await axios.put(`${API_BASE_URL}/stock/config/${item.id}`, {
        ...item,
        ativo: !item.ativo
      });
      showNotification(
        item.ativo ? 'Monitoramento desativado' : 'Monitoramento ativado',
        'success'
      );
      loadData();
    } catch (error) {
      console.error('Error toggling active status:', error);
      showNotification('Erro ao alterar status', 'error');
    }
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleSyncToggle = async () => {
    try {
      const newValue = !syncCategories;
      const response = await axios.put(`${API_BASE_URL}/stock/config/sync-categories`, {
        enabled: newValue
      });
      
      if (response.data.success) {
        setSyncCategories(newValue);
        showNotification(
          newValue ? 
            'Sincronização de categorias ativada. As categorias serão atualizadas automaticamente do inventário.' : 
            'Sincronização de categorias desativada. Você tem controle total sobre as categorias.',
          'success'
        );
      }
    } catch (error) {
      console.error('Error toggling sync setting:', error);
      showNotification('Erro ao alterar configuração de sincronização', 'error');
    }
  };

  const getStatusIcon = (item) => {
    const current = item.quantidade_atual || 0;
    const min = item.minimo;
    
    if (current === 0) {
      return <ErrorIcon color="error" />;
    } else if (current < min * 0.25) {
      return <WarningIcon color="error" />;
    } else if (current < min) {
      return <WarningIcon color="warning" />;
    } else {
      return <CheckCircleIcon color="success" />;
    }
  };

  const getStatusLabel = (item) => {
    const current = item.quantidade_atual || 0;
    const min = item.minimo;
    
    if (current === 0) {
      return <Chip label="SEM ESTOQUE" color="error" size="small" />;
    } else if (current < min * 0.25) {
      return <Chip label="CRÍTICO" color="error" size="small" />;
    } else if (current < min) {
      return <Chip label="BAIXO" color="warning" size="small" />;
    } else {
      return <Chip label="OK" color="success" size="small" />;
    }
  };

  const getCategoryColor = (category) => {
    const cat = availableCategories.find(c => c.value === category);
    return cat ? cat.color : '#808080';
  };

  const getCategoryLabel = (category) => {
    const cat = availableCategories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  // Sorting logic
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const createSortHandler = (property) => () => {
    handleRequestSort(property);
  };

  // Get item status for filtering
  const getItemStatus = (item) => {
    const current = item.quantidade_atual || 0;
    const min = item.minimo;
    
    if (!item.ativo) return 'inactive';
    if (current === 0) return 'critical';
    if (current < min * 0.25) return 'critical';
    if (current < min) return 'warning';
    return 'ok';
  };

  // Filter and sort configurations
  const getFilteredAndSortedConfigurations = () => {
    // Apply filters
    let filtered = configurations.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!item.nome_exibicao.toLowerCase().includes(searchLower) && 
            !item.id.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Category filter
      if (categoryFilter !== 'all' && item.categoria !== categoryFilter) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        const itemStatus = getItemStatus(item);
        if (statusFilter !== itemStatus) {
          return false;
        }
      }
      
      // Below minimum filter
      if (showBelowMinimum && (item.quantidade_atual || 0) >= item.minimo) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting
    const comparator = (a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];
      
      // Handle special cases
      if (orderBy === 'quantidade_atual' || orderBy === 'minimo' || orderBy === 'maximo' || 
          orderBy === 'preco_unitario') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }
      
      if (orderBy === 'custo_reposicao') {
        aValue = (a.maximo - (a.quantidade_atual || 0)) * (a.preco_unitario || 0);
        bValue = (b.maximo - (b.quantidade_atual || 0)) * (b.preco_unitario || 0);
      }
      
      if (orderBy === 'reposicao') {
        aValue = a.maximo - (a.quantidade_atual || 0);
        bValue = b.maximo - (b.quantidade_atual || 0);
      }
      
      if (bValue < aValue) {
        return order === 'desc' ? -1 : 1;
      }
      if (bValue > aValue) {
        return order === 'desc' ? 1 : -1;
      }
      return 0;
    };
    
    return filtered.sort(comparator);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setShowBelowMinimum(false);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 3
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <SettingsIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Configuração de Controle de Estoque
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Gerencie níveis mínimos e máximos para monitoramento automático
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ 
              bgcolor: 'white',
              color: '#667eea',
              '&:hover': { bgcolor: '#f0f0f0' }
            }}
          >
            Adicionar Item
          </Button>
        </Box>
      </Paper>

      {/* Category Sync Toggle */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: syncCategories ? '#fff3e0' : '#f5f5f5' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={syncCategories}
                  onChange={handleSyncToggle}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    Sincronizar categorias com inventário automaticamente
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {syncCategories ? 
                      '⚠️ As categorias serão atualizadas automaticamente do inventário. Mudanças manuais podem ser sobrescritas.' : 
                      '✅ Você tem controle total sobre as categorias. As mudanças que você fizer serão preservadas.'}
                  </Typography>
                </Box>
              }
            />
          </Box>
          <Chip 
            label={syncCategories ? 'SINCRONIZAÇÃO ATIVA' : 'CONTROLE MANUAL'} 
            color={syncCategories ? 'warning' : 'success'}
            variant="filled"
          />
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Monitorado
                  </Typography>
                  <Typography variant="h4">
                    {configurations.length}
                  </Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 40, color: '#667eea' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Itens Ativos
                  </Typography>
                  <Typography variant="h4">
                    {configurations.filter(c => c.ativo).length}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Alertas Críticos
                  </Typography>
                  <Typography variant="h4">
                    {configurations.filter(c => c.ativo && (c.quantidade_atual || 0) < c.minimo * 0.25).length}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avisos Ativos
                  </Typography>
                  <Typography variant="h4">
                    {configurations.filter(c => c.ativo && (c.quantidade_atual || 0) < c.minimo).length}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cost Summary Box */}
      {costSummary && (
        <Card sx={{ mb: 3, bgcolor: '#f8f9ff', border: '2px solid #667eea' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#667eea', display: 'flex', alignItems: 'center', gap: 1 }}>
              💰 Resumo de Custos de Reposição
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    R$ {costSummary.custo_total.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Custo Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {costSummary.total_itens}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Itens p/ Restock
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {costSummary.total_quantidade}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Unidades Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    R$ {costSummary.preco_medio.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Preço Médio
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            {/* Category Breakdown */}
            {Object.keys(costSummary.itens_por_categoria).length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#667eea' }}>
                  Breakdown por Categoria:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Object.entries(costSummary.itens_por_categoria).map(([categoria, data]) => (
                    <Chip
                      key={categoria}
                      label={`${getCategoryLabel(categoria)}: R$ ${data.custo.toFixed(2)}`}
                      size="small"
                      sx={{ 
                        bgcolor: getCategoryColor(categoria),
                        color: 'white'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Buscar por nome ou ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    🔍
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoria</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Categoria"
              >
                <MenuItem value="all">
                  <em>Todas</em>
                </MenuItem>
                {availableCategories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="critical">🔴 Crítico</MenuItem>
                <MenuItem value="warning">🟡 Aviso</MenuItem>
                <MenuItem value="ok">🟢 OK</MenuItem>
                <MenuItem value="inactive">⚫ Inativo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={showBelowMinimum}
                  onChange={(e) => setShowBelowMinimum(e.target.checked)}
                  size="small"
                />
              }
              label="Apenas abaixo do mínimo"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={clearFilters}
              startIcon={<CloseIcon />}
            >
              Limpar Filtros
            </Button>
          </Grid>
        </Grid>
        
        {/* Filter summary */}
        {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || showBelowMinimum) && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="textSecondary">
              Filtros ativos:
            </Typography>
            {searchTerm && (
              <Chip
                size="small"
                label={`Busca: ${searchTerm}`}
                onDelete={() => setSearchTerm('')}
              />
            )}
            {categoryFilter !== 'all' && (
              <Chip
                size="small"
                label={`Categoria: ${getCategoryLabel(categoryFilter)}`}
                onDelete={() => setCategoryFilter('all')}
              />
            )}
            {statusFilter !== 'all' && (
              <Chip
                size="small"
                label={`Status: ${statusFilter}`}
                onDelete={() => setStatusFilter('all')}
              />
            )}
            {showBelowMinimum && (
              <Chip
                size="small"
                label="Abaixo do mínimo"
                onDelete={() => setShowBelowMinimum(false)}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Configurações de Estoque
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Mostrando {getFilteredAndSortedConfigurations().length} de {configurations.length} itens
        </Typography>
      </Box>

      {/* Configuration Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell>Status</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'nome_exibicao'}
                  direction={orderBy === 'nome_exibicao' ? order : 'asc'}
                  onClick={createSortHandler('nome_exibicao')}
                >
                  Item
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'categoria'}
                  direction={orderBy === 'categoria' ? order : 'asc'}
                  onClick={createSortHandler('categoria')}
                >
                  Categoria
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'quantidade_atual'}
                  direction={orderBy === 'quantidade_atual' ? order : 'asc'}
                  onClick={createSortHandler('quantidade_atual')}
                >
                  Estoque Atual
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'minimo'}
                  direction={orderBy === 'minimo' ? order : 'asc'}
                  onClick={createSortHandler('minimo')}
                >
                  Mínimo
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'maximo'}
                  direction={orderBy === 'maximo' ? order : 'asc'}
                  onClick={createSortHandler('maximo')}
                >
                  Máximo
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'reposicao'}
                  direction={orderBy === 'reposicao' ? order : 'asc'}
                  onClick={createSortHandler('reposicao')}
                >
                  Reposição
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'preco_unitario'}
                  direction={orderBy === 'preco_unitario' ? order : 'asc'}
                  onClick={createSortHandler('preco_unitario')}
                >
                  Preço Unit.
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'custo_reposicao'}
                  direction={orderBy === 'custo_reposicao' ? order : 'asc'}
                  onClick={createSortHandler('custo_reposicao')}
                >
                  Custo Reposição
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'ativo'}
                  direction={orderBy === 'ativo' ? order : 'asc'}
                  onClick={createSortHandler('ativo')}
                >
                  Ativo
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              const filteredAndSorted = getFilteredAndSortedConfigurations();
              
              if (configurations.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        Nenhum item configurado para monitoramento
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              }
              
              if (filteredAndSorted.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        Nenhum item corresponde aos filtros aplicados
                      </Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={clearFilters}
                        sx={{ mt: 1 }}
                      >
                        Limpar filtros
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }
              
              return filteredAndSorted.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(item)}
                      {getStatusLabel(item)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {item.nome_exibicao}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {item.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getCategoryLabel(item.categoria)}
                      size="small"
                      sx={{ 
                        bgcolor: getCategoryColor(item.categoria),
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={(item.quantidade_atual || 0) < item.minimo ? 'error' : 'textPrimary'}
                    >
                      {item.quantidade_atual || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      <TrendingDownIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                      {item.minimo}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      <TrendingUpIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                      {item.maximo}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`+${item.maximo - (item.quantidade_atual || 0)}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      R$ {(item.preco_unitario || 0).toFixed(2)}
                    </Typography>
                    {item.preco_fonte === 'price_list' && (
                      <Typography variant="caption" color="success.main">
                        Lista
                      </Typography>
                    )}
                    {item.preco_fonte === 'estimated' && (
                      <Typography variant="caption" color="warning.main">
                        Estimado
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const quantidadeRestock = Math.max(0, item.maximo - (item.quantidade_atual || 0));
                      const custoRestock = quantidadeRestock * (item.preco_unitario || 0);
                      return (
                        <Box>
                          <Typography variant="body1" fontWeight="bold" color={custoRestock > 100 ? 'error' : custoRestock > 50 ? 'warning.main' : 'success.main'}>
                            R$ {custoRestock.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {quantidadeRestock} × R$ {(item.preco_unitario || 0).toFixed(2)}
                          </Typography>
                        </Box>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={item.ativo}
                      onChange={() => handleToggleActive(item)}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1} justifyContent="center">
                      <Tooltip title="Editar">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(item)}
                          sx={{ color: '#667eea' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(item.id)}
                          sx={{ color: '#f44336' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Buttons for Cost Summary */}
      {costSummary && costSummary.itens_detalhados && costSummary.itens_detalhados.length > 0 && (
        <Box sx={{ mt: 3, mb: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const exportText = `LISTA DE COMPRAS - ${new Date().toLocaleDateString()}\n\n` +
                costSummary.itens_detalhados.map(item => 
                  `${item.nome}: ${item.quantidade_restock} un. × R$ ${item.preco_unitario.toFixed(2)} = R$ ${item.custo_total.toFixed(2)}`
                ).join('\n') +
                `\n\nTOTAL: R$ ${costSummary.custo_total.toFixed(2)}`;
              
              navigator.clipboard.writeText(exportText);
              showNotification('Lista copiada para a área de transferência!', 'success');
            }}
          >
            📋 Copiar Lista de Compras
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={loadCostSummary}
          >
            🔄 Atualizar Custos
          </Button>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {editMode ? <EditIcon /> : <AddIcon />}
            {editMode ? 'Editar Configuração' : 'Adicionar Item ao Controle'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!editMode && (
              <Autocomplete
                options={inventoryItems}
                getOptionLabel={(option) => {
                  if (!option) return '';
                  return `${option.nome} (${option.quantidade} em estoque)`;
                }}
                value={inventoryItems.find(item => item.id === formData.id) || null}
                onChange={async (event, newValue) => {
                  console.log('Selected item:', newValue);
                  if (newValue) {
                    setFormData({
                      ...formData,
                      id: newValue.id,
                      nome_exibicao: newValue.nome,
                      categoria: newValue.categoria || 'outros'
                    });
                    // Fetch pricing info for the selected item
                    await fetchPricingInfo(newValue.id);
                  }
                }}
                loading={loading}
                noOptionsText={
                  loading ? "Carregando inventário..." : 
                  inventoryItems.length === 0 ? "Nenhum item no inventário. Verifique a conexão com o servidor." : 
                  "Nenhum item encontrado"
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Selecionar Item do Inventário"
                    required
                    fullWidth
                    helperText={inventoryItems.length === 0 && !loading ? 
                      "Certifique-se de que o servidor está rodando em http://localhost:4050" : ""}
                    error={inventoryItems.length === 0 && !loading}
                  />
                )}
              />
            )}

            <TextField
              label="Nome de Exibição"
              value={formData.nome_exibicao}
              onChange={(e) => setFormData({ ...formData, nome_exibicao: e.target.value })}
              required
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                label="Categoria"
              >
                {availableCategories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Quantidade Mínima"
                  type="number"
                  value={formData.minimo}
                  onChange={(e) => setFormData({ ...formData, minimo: parseInt(e.target.value) || 0 })}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TrendingDownIcon color="warning" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Quantidade Máxima"
                  type="number"
                  value={formData.maximo}
                  onChange={(e) => setFormData({ ...formData, maximo: parseInt(e.target.value) || 0 })}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TrendingUpIcon color="success" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>

            {/* Pricing Section */}
            <Typography variant="h6" sx={{ mt: 2, mb: 1, color: '#667eea' }}>
              💰 Configuração de Preços
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Preço Unitário"
                  type="number"
                  value={formData.preco_unitario}
                  onChange={(e) => setFormData({ ...formData, preco_unitario: parseFloat(e.target.value) || 0 })}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon color="primary" />
                      </InputAdornment>
                    ),
                    inputProps: { min: 0, step: 0.01 }
                  }}
                  helperText="Preço usado para cálculos de custo"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Preço Mínimo"
                  type="number"
                  value={formData.preco_min}
                  disabled
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TrendingDownIcon color="warning" />
                      </InputAdornment>
                    )
                  }}
                  helperText={formData.preco_min > 0 ? "Da lista de preços" : "Estimado"}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Preço Máximo"
                  type="number"
                  value={formData.preco_max}
                  disabled
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TrendingUpIcon color="success" />
                      </InputAdornment>
                    )
                  }}
                  helperText={formData.preco_max > 0 ? "Da lista de preços" : "Estimado"}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
              }
              label="Monitoramento Ativo"
            />

            {formData.minimo >= formData.maximo && (
              <Alert severity="warning">
                O valor mínimo deve ser menor que o máximo
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!formData.id || !formData.nome_exibicao || formData.minimo >= formData.maximo}
          >
            {editMode ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
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

      {/* Refresh FAB */}
      <Zoom in={true}>
        <Fab
          color="primary"
          size="medium"
          onClick={loadData}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 24,
          }}
          aria-label="refresh"
        >
          <RefreshIcon />
        </Fab>
      </Zoom>
    </Container>
  );
};

export default StockConfiguration;