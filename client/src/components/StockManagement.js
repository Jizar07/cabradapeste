import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  AttachMoney as PricingIcon,
  Warehouse as CombinedIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';
import Inventory from './Inventory';
import Pricing from './Pricing';

const StockManagement = () => {
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const [inventory, setInventory] = useState({});
  const [pricing, setPricing] = useState({ itens: {}, categorias: {} });
  const [itemLinks, setItemLinks] = useState({ links: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [linkDialog, setLinkDialog] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [selectedPricingItem, setSelectedPricingItem] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [priceDialog, setPriceDialog] = useState(false);
  const [priceFormData, setPriceFormData] = useState({
    nomeItem: '',
    preco_min: '',
    preco_max: '',
    categoria: 'OUTROS'
  });
  const [editDialog, setEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    quantidade: '',
    preco_min: '',
    preco_max: '',
    categoria: 'OUTROS'
  });

  useEffect(() => {
    loadData();
    
    if (socket) {
      socket.on('inventario:atualizado', (inventoryData) => {
        setInventory(inventoryData);
      });

      socket.on('precos:atualizado', (pricingData) => {
        setPricing(pricingData);
      });

      return () => {
        socket.off('inventario:atualizado');
        socket.off('precos:atualizado');
      };
    }
  }, [socket]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load inventory, pricing, and item links data in parallel
      const [inventoryResponse, pricingResponse, linksResponse] = await Promise.all([
        fetch('/api/inventario'),
        fetch('/api/precos'),
        fetch('/api/item-links')
      ]);

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        if (inventoryData.sucesso) {
          setInventory(inventoryData.dados || {});
        }
      }

      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        if (pricingData.sucesso) {
          setPricing(pricingData.dados || { itens: {}, categorias: {} });
        }
      }

      if (linksResponse.ok) {
        const linksData = await linksResponse.json();
        if (linksData.sucesso) {
          setItemLinks(linksData.dados || { links: {} });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getCombinedData = () => {
    const combined = [];
    const inventoryItems = inventory.itens || {};
    const pricingItems = pricing.itens || {};
    const links = itemLinks.links || {};
    
    // Create a map of linked items
    const inventoryToPrice = {};
    const priceToInventory = {};
    
    Object.values(links).forEach(link => {
      inventoryToPrice[link.inventoryId] = link.pricingId;
      priceToInventory[link.pricingId] = link.inventoryId;
    });
    
    // Track processed items to avoid duplicates
    const processedItems = new Set();
    
    // Process inventory items first
    Object.keys(inventoryItems).forEach(inventoryId => {
      if (processedItems.has(inventoryId)) return;
      
      const inventoryItem = inventoryItems[inventoryId];
      const linkedPricingId = inventoryToPrice[inventoryId];
      const pricingItem = linkedPricingId ? pricingItems[linkedPricingId] : pricingItems[inventoryId];
      
      combined.push({
        id: inventoryId,
        linkedId: linkedPricingId || null,
        nome: inventoryItem?.nome || pricingItem?.nome || inventoryId,
        quantidade: inventoryItem?.quantidade || 0,
        categoria: inventoryItem?.categoria || pricingItem?.categoria || 'outros',
        preco_min: pricingItem?.preco_min || null,
        preco_max: pricingItem?.preco_max || null,
        hasInventory: true,
        hasPricing: !!pricingItem,
        isLinked: !!linkedPricingId,
        criado_em: inventoryItem?.criado_em || pricingItem?.criado_em,
        atualizado_em: inventoryItem?.atualizado_em || pricingItem?.atualizado_em
      });
      
      processedItems.add(inventoryId);
      if (linkedPricingId) processedItems.add(linkedPricingId);
    });
    
    // Process remaining pricing items (not linked)
    Object.keys(pricingItems).forEach(pricingId => {
      if (processedItems.has(pricingId)) return;
      
      const pricingItem = pricingItems[pricingId];
      
      combined.push({
        id: pricingId,
        linkedId: null,
        nome: pricingItem?.nome || pricingId,
        quantidade: 0,
        categoria: pricingItem?.categoria || 'outros',
        preco_min: pricingItem?.preco_min || null,
        preco_max: pricingItem?.preco_max || null,
        hasInventory: false,
        hasPricing: true,
        isLinked: false,
        criado_em: pricingItem?.criado_em,
        atualizado_em: pricingItem?.atualizado_em
      });
      
      processedItems.add(pricingId);
    });

    return combined;
  };

  const getFilteredCombinedData = () => {
    let data = getCombinedData();

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      data = data.filter(item => 
        item.nome.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search) ||
        item.categoria.toLowerCase().includes(search)
      );
    }

    if (selectedCategory !== 'todos') {
      data = data.filter(item => item.categoria === selectedCategory);
    }

    return data.sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const getStatistics = () => {
    const combined = getCombinedData();
    const totalItems = combined.length;
    const itemsWithBoth = combined.filter(item => item.hasInventory && item.hasPricing).length;
    const inventoryOnly = combined.filter(item => item.hasInventory && !item.hasPricing).length;
    const pricingOnly = combined.filter(item => !item.hasInventory && item.hasPricing).length;

    return {
      totalItems,
      itemsWithBoth,
      inventoryOnly,
      pricingOnly,
      completeness: totalItems > 0 ? (itemsWithBoth / totalItems * 100).toFixed(1) : 0
    };
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const createItemLink = async (inventoryId, pricingId, description = '') => {
    try {
      const response = await fetch('/api/item-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inventoryId,
          pricingId,
          description
        })
      });

      const result = await response.json();
      if (result.sucesso) {
        // Reload data to show the new link
        loadData();
        setError(null);
        return result;
      } else {
        setError(result.erro || 'Erro ao criar link');
        return null;
      }
    } catch (error) {
      console.error('Error creating item link:', error);
      setError('Erro ao criar link');
      return null;
    }
  };

  const deleteItemLink = async (linkId) => {
    try {
      const response = await fetch(`/api/item-links/${linkId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.sucesso) {
        // Reload data to remove the link
        loadData();
        setError(null);
        return true;
      } else {
        setError(result.erro || 'Erro ao remover link');
        return false;
      }
    } catch (error) {
      console.error('Error deleting item link:', error);
      setError('Erro ao remover link');
      return false;
    }
  };

  const handleCreateLink = async (inventoryId, pricingId) => {
    const result = await createItemLink(inventoryId, pricingId);
    if (result) {
      console.log('✅ Link criado:', result);
    }
  };

  const openLinkDialog = (inventoryItem) => {
    setSelectedInventoryItem(inventoryItem);
    setSelectedPricingItem(null);
    setLinkSearchTerm('');
    setLinkDialog(true);
  };

  const closeLinkDialog = () => {
    setLinkDialog(false);
    setSelectedInventoryItem(null);
    setSelectedPricingItem(null);
    setLinkSearchTerm('');
  };

  const handleConfirmLink = async () => {
    if (selectedInventoryItem && selectedPricingItem) {
      const result = await createItemLink(selectedInventoryItem.id, selectedPricingItem.id);
      if (result) {
        closeLinkDialog();
      }
    }
  };

  const openPriceDialog = (inventoryItem) => {
    setPriceFormData({
      nomeItem: inventoryItem?.nome || '',
      preco_min: '',
      preco_max: '',
      categoria: 'OUTROS'
    });
    setPriceDialog(true);
  };

  const closePriceDialog = () => {
    setPriceDialog(false);
    setPriceFormData({
      nomeItem: '',
      preco_min: '',
      preco_max: '',
      categoria: 'OUTROS'
    });
  };

  const handleAddPrice = async () => {
    try {
      if (!priceFormData.nomeItem || !priceFormData.preco_min || !priceFormData.preco_max) {
        setError('Nome, preço mínimo e preço máximo são obrigatórios');
        return;
      }

      const response = await fetch('/api/precos/item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nomeItem: priceFormData.nomeItem,
          preco_min: parseFloat(priceFormData.preco_min),
          preco_max: parseFloat(priceFormData.preco_max),
          categoria: priceFormData.categoria
        })
      });

      const result = await response.json();
      if (result.sucesso) {
        closePriceDialog();
        loadData(); // Reload to show new price
      } else {
        setError(result.erro || 'Erro ao adicionar preço');
      }
    } catch (error) {
      console.error('Error adding price:', error);
      setError('Erro ao adicionar preço');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('todos');
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setEditFormData({
      nome: item.nome || '',
      quantidade: item.quantidade || '',
      preco_min: item.preco_min || '',
      preco_max: item.preco_max || '',
      categoria: item.categoria || 'OUTROS'
    });
    setEditDialog(true);
  };

  const closeEditDialog = () => {
    setEditDialog(false);
    setEditingItem(null);
    setEditFormData({
      nome: '',
      quantidade: '',
      preco_min: '',
      preco_max: '',
      categoria: 'OUTROS'
    });
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingItem) return;

      // Update inventory if the item has inventory data
      if (editingItem.hasInventory) {
        const inventoryResponse = await fetch(`/api/inventario/${editingItem.id}/quantidade`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantidade: parseInt(editFormData.quantidade)
          })
        });

        if (!inventoryResponse.ok) {
          const error = await inventoryResponse.json();
          setError(error.erro || 'Erro ao atualizar quantidade');
          return;
        }

        // Update item name if changed
        if (editFormData.nome !== editingItem.nome) {
          const nameResponse = await fetch('/api/usuarios/global-item-update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              oldId: editingItem.id,
              newId: editingItem.id,
              newDisplayName: editFormData.nome
            })
          });

          if (!nameResponse.ok) {
            const error = await nameResponse.json();
            setError(error.erro || 'Erro ao atualizar nome');
            return;
          }
        }
      }

      // Update pricing if the item has pricing data
      if (editingItem.hasPricing) {
        const pricingId = editingItem.linkedId || editingItem.id;
        const pricingResponse = await fetch('/api/precos/item', {
          method: 'POST', // Using POST as it handles both create and update
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nomeItem: editFormData.nome,
            preco_min: parseFloat(editFormData.preco_min),
            preco_max: parseFloat(editFormData.preco_max),
            categoria: editFormData.categoria
          })
        });

        if (!pricingResponse.ok) {
          const error = await pricingResponse.json();
          setError(error.erro || 'Erro ao atualizar preço');
          return;
        }
      }

      closeEditDialog();
      loadData(); // Reload data to show changes
      setError(null);
      
    } catch (error) {
      console.error('Error saving edit:', error);
      setError('Erro ao salvar alterações');
    }
  };

  const handleDeleteItem = async (item) => {
    const confirmDelete = window.confirm(
      `⚠️ Tem certeza que deseja excluir o item "${item.nome}"?\n\n` +
      `Esta ação irá remover o item do inventário e dos preços permanentemente.\n\n` +
      `Esta ação não pode ser desfeita!`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setError(null);

      // Delete from inventory if exists
      if (item.hasInventory) {
        const inventoryResponse = await fetch(`/api/inventory/items/${item.id}`, {
          method: 'DELETE'
        });

        if (!inventoryResponse.ok) {
          const error = await inventoryResponse.json();
          setError(error.erro || 'Erro ao excluir item do inventário');
          return;
        }
      }

      // Delete from pricing if exists
      if (item.hasPricing) {
        const pricingResponse = await fetch(`/api/pricing/item/${item.id}`, {
          method: 'DELETE'
        });

        if (!pricingResponse.ok) {
          const error = await pricingResponse.json();
          setError(error.erro || 'Erro ao excluir preço do item');
          return;
        }
      }

      // Delete item link if exists
      const linkResponse = await fetch(`/api/item-links/${item.id}`, {
        method: 'DELETE'
      });

      // Don't fail if link deletion fails (link might not exist)
      if (!linkResponse.ok) {
        console.warn('Failed to delete item link, but continuing...');
      }

      loadData(); // Reload data to show changes
      alert(`✅ Item "${item.nome}" excluído com sucesso!`);
      
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Erro ao excluir item. Tente novamente.');
    }
  };

  const getAvailablePricingItems = () => {
    const pricingItems = pricing.itens || {};
    const links = itemLinks.links || {};
    
    // Get already linked pricing items
    const linkedPricingIds = Object.values(links).map(link => link.pricingId);
    
    // Filter out already linked items
    return Object.entries(pricingItems)
      .filter(([id]) => !linkedPricingIds.includes(id))
      .map(([id, item]) => ({
        id,
        ...item,
        label: `${item.nome} (${id}) - R$ ${item.preco_min?.toFixed(2)} - ${item.preco_max?.toFixed(2)}`
      }));
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        📦 Gestão de Estoque
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CombinedIcon fontSize="large" color="primary" />
              <Typography variant="h4" color="primary.main" sx={{ mt: 1 }}>
                {stats.totalItems}
              </Typography>
              <Typography color="textSecondary">
                Total de Itens
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckIcon fontSize="large" color="success" />
              <Typography variant="h4" color="success.main" sx={{ mt: 1 }}>
                {stats.itemsWithBoth}
              </Typography>
              <Typography color="textSecondary">
                Completos (Estoque + Preço)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <InventoryIcon fontSize="large" color="info" />
              <Typography variant="h4" color="info.main" sx={{ mt: 1 }}>
                {stats.inventoryOnly}
              </Typography>
              <Typography color="textSecondary">
                Só Inventário
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PricingIcon fontSize="large" color="warning" />
              <Typography variant="h4" color="warning.main" sx={{ mt: 1 }}>
                {stats.pricingOnly}
              </Typography>
              <Typography color="textSecondary">
                Só Preços
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tabs */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<InventoryIcon />} 
            label="Inventário" 
            iconPosition="start"
          />
          <Tab 
            icon={<PricingIcon />} 
            label="Lista de Preços" 
            iconPosition="start"
          />
          <Tab 
            icon={<CombinedIcon />} 
            label="Visão Combinada" 
            iconPosition="start"
          />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: 0 }}>
          {activeTab === 0 && (
            <Box>
              <Inventory />
            </Box>
          )}
          
          {activeTab === 1 && (
            <Box>
              <Pricing />
            </Box>
          )}
          
          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              {/* Combined View Filters */}
              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Pesquisar itens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchTerm('')}>
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 250 }}
                  />

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      label="Categoria"
                    >
                      <MenuItem value="todos">Todas</MenuItem>
                      <MenuItem value="plantas">Plantas</MenuItem>
                      <MenuItem value="sementes">Sementes</MenuItem>
                      <MenuItem value="animais">Animais</MenuItem>
                      <MenuItem value="comidas">Comidas</MenuItem>
                      <MenuItem value="bebidas">Bebidas</MenuItem>
                      <MenuItem value="ferramentas">Ferramentas</MenuItem>
                      <MenuItem value="materiais">Materiais</MenuItem>
                      <MenuItem value="outros">Outros</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                  >
                    Limpar Filtros
                  </Button>

                  <Typography variant="body2" color="textSecondary" sx={{ ml: 'auto' }}>
                    {getFilteredCombinedData().length} itens | {stats.completeness}% completos
                  </Typography>
                </Box>
              </Paper>

              {/* Combined Data Table */}
              <TableContainer component={Paper} elevation={1}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Nome do Item</strong></TableCell>
                      <TableCell><strong>Categoria</strong></TableCell>
                      <TableCell align="center"><strong>Quantidade</strong></TableCell>
                      <TableCell align="center"><strong>Preço Min</strong></TableCell>
                      <TableCell align="center"><strong>Preço Max</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Ações</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredCombinedData().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="textSecondary" sx={{ py: 4 }}>
                            Nenhum item encontrado
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredCombinedData().map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="body1" fontWeight="bold">
                              {item.nome}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {item.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.categoria} 
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {item.hasInventory ? (
                              <Chip
                                label={item.quantidade}
                                color={item.quantidade > 100 ? 'success' : item.quantidade > 10 ? 'warning' : 'error'}
                                size="small"
                              />
                            ) : (
                              <Typography color="textSecondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {item.hasPricing ? (
                              <Typography variant="body2" color="success.main">
                                R$ {item.preco_min?.toFixed(2) || '0,00'}
                              </Typography>
                            ) : (
                              <Typography color="textSecondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {item.hasPricing ? (
                              <Typography variant="body2" color="error.main">
                                R$ {item.preco_max?.toFixed(2) || '0,00'}
                              </Typography>
                            ) : (
                              <Typography color="textSecondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexDirection: 'column' }}>
                              {item.hasInventory && item.hasPricing ? (
                                <Tooltip title={item.isLinked ? "Itens vinculados" : "Completo: Inventário + Preço"}>
                                  <Chip 
                                    label={item.isLinked ? "VINCULADO" : "COMPLETO"} 
                                    color="success" 
                                    size="small"
                                    icon={<CheckIcon />}
                                  />
                                </Tooltip>
                              ) : item.hasInventory ? (
                                <Tooltip title="Falta preço">
                                  <Chip 
                                    label="SÓ ESTOQUE" 
                                    color="warning" 
                                    size="small"
                                    icon={<WarningIcon />}
                                  />
                                </Tooltip>
                              ) : (
                                <Tooltip title="Falta inventário">
                                  <Chip 
                                    label="SÓ PREÇO" 
                                    color="info" 
                                    size="small"
                                    icon={<WarningIcon />}
                                  />
                                </Tooltip>
                              )}
                              {item.linkedId && (
                                <Typography variant="caption" color="textSecondary">
                                  → {item.linkedId}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                              {/* Show Link button for items that have inventory but no pricing (need to be linked) */}
                              {item.hasInventory && !item.hasPricing && !item.isLinked && (
                                <Tooltip title="Vincular a item de preço existente">
                                  <Button 
                                    size="small" 
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => openLinkDialog(item)}
                                  >
                                    🔗 Vincular
                                  </Button>
                                </Tooltip>
                              )}
                              
                              {/* Show Unlink button for linked items */}
                              {item.isLinked && (
                                <Tooltip title="Desvincular itens">
                                  <Button 
                                    size="small" 
                                    variant="outlined"
                                    color="error"
                                    onClick={async () => {
                                      // Find the link and delete it
                                      const link = Object.values(itemLinks.links || {}).find(
                                        l => l.inventoryId === item.id
                                      );
                                      if (link) {
                                        await deleteItemLink(link.id);
                                      }
                                    }}
                                  >
                                    🔓 Desvincular
                                  </Button>
                                </Tooltip>
                              )}
                              
                              {/* Show standard action buttons */}
                              {!item.hasPricing && !item.isLinked && (
                                <Tooltip title="Adicionar preço diretamente">
                                  <Button 
                                    size="small" 
                                    startIcon={<PricingIcon />}
                                    onClick={() => openPriceDialog(item)}
                                  >
                                    + Preço
                                  </Button>
                                </Tooltip>
                              )}
                              
                              {!item.hasInventory && (
                                <Tooltip title="Adicionar ao inventário">
                                  <Button size="small" startIcon={<InventoryIcon />}>
                                    + Estoque
                                  </Button>
                                </Tooltip>
                              )}
                              
                              {item.hasInventory && item.hasPricing && (
                                <>
                                  <Tooltip title="Editar item">
                                    <Button 
                                      size="small" 
                                      variant="text" 
                                      startIcon={<EditIcon />}
                                      onClick={() => openEditDialog(item)}
                                      sx={{ mr: 1 }}
                                    >
                                      Editar
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Excluir item">
                                    <Button 
                                      size="small" 
                                      variant="text" 
                                      color="error"
                                      startIcon={<DeleteIcon />}
                                      onClick={() => handleDeleteItem(item)}
                                    >
                                      Excluir
                                    </Button>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Link Dialog */}
      <Dialog open={linkDialog} onClose={closeLinkDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Vincular Item: {selectedInventoryItem?.nome}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Escolha um item da lista de preços para vincular ao item "{selectedInventoryItem?.nome}" do inventário:
            </Typography>
            
            <Autocomplete
              options={getAvailablePricingItems()}
              getOptionLabel={(option) => option.label}
              value={selectedPricingItem}
              onChange={(event, newValue) => setSelectedPricingItem(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Procurar item para vincular"
                  placeholder="Digite o nome do item..."
                  helperText={`${getAvailablePricingItems().length} itens disponíveis para vincular`}
                />
              )}
              renderOption={(props, option) => (
                <ListItem {...props}>
                  <ListItemText
                    primary={option.nome}
                    secondary={`ID: ${option.id} | Preço: R$ ${option.preco_min?.toFixed(2)} - ${option.preco_max?.toFixed(2)} | Categoria: ${option.categoria}`}
                  />
                </ListItem>
              )}
              filterOptions={(options, { inputValue }) => {
                return options.filter(option =>
                  option.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
                  option.id.toLowerCase().includes(inputValue.toLowerCase()) ||
                  option.categoria.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
            />

            {selectedPricingItem && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                <Typography variant="h6" color="success.main">
                  ✓ Vincular selecionado:
                </Typography>
                <Typography variant="body2">
                  <strong>Inventário:</strong> {selectedInventoryItem?.nome} ({selectedInventoryItem?.id})
                </Typography>
                <Typography variant="body2">
                  <strong>Preços:</strong> {selectedPricingItem?.nome} ({selectedPricingItem?.id})
                </Typography>
                <Typography variant="body2">
                  <strong>Preço:</strong> R$ {selectedPricingItem?.preco_min?.toFixed(2)} - {selectedPricingItem?.preco_max?.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLinkDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmLink} 
            variant="contained"
            disabled={!selectedPricingItem}
          >
            🔗 Confirmar Vínculo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Price Dialog */}
      <Dialog open={priceDialog} onClose={closePriceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Adicionar Preço
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome do Item"
              value={priceFormData.nomeItem}
              onChange={(e) => setPriceFormData({ ...priceFormData, nomeItem: e.target.value })}
              sx={{ mb: 3 }}
              helperText="Nome do item para adicionar preço"
            />
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Preço Mínimo"
                  type="number"
                  value={priceFormData.preco_min}
                  onChange={(e) => setPriceFormData({ ...priceFormData, preco_min: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Preço mínimo"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Preço Máximo"
                  type="number"
                  value={priceFormData.preco_max}
                  onChange={(e) => setPriceFormData({ ...priceFormData, preco_max: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Preço máximo"
                />
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={priceFormData.categoria}
                onChange={(e) => setPriceFormData({ ...priceFormData, categoria: e.target.value })}
                label="Categoria"
              >
                <MenuItem value="ANIMAIS">Animais</MenuItem>
                <MenuItem value="SEMENTES">Sementes</MenuItem>
                <MenuItem value="PLANTAS">Plantas</MenuItem>
                <MenuItem value="MINERIOS">Minérios</MenuItem>
                <MenuItem value="ALIMENTACAO">Alimentação</MenuItem>
                <MenuItem value="FERRAMENTAS">Ferramentas</MenuItem>
                <MenuItem value="MATERIAIS">Materiais</MenuItem>
                <MenuItem value="OUTROS">Outros</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePriceDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddPrice} 
            variant="contained"
            disabled={!priceFormData.nomeItem || !priceFormData.preco_min || !priceFormData.preco_max}
          >
            💰 Adicionar Preço
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={closeEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Editar Item: {editingItem?.nome}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome do Item"
              value={editFormData.nome}
              onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
              sx={{ mb: 3 }}
              helperText="Nome de exibição do item"
            />

            {editingItem?.hasInventory && (
              <TextField
                fullWidth
                label="Quantidade em Estoque"
                type="number"
                value={editFormData.quantidade}
                onChange={(e) => setEditFormData({ ...editFormData, quantidade: e.target.value })}
                sx={{ mb: 3 }}
                inputProps={{ min: 0 }}
                helperText={`Quantidade atual no inventário (ID: ${editingItem?.id})`}
              />
            )}

            {editingItem?.hasPricing && (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Preço Mínimo"
                      type="number"
                      value={editFormData.preco_min}
                      onChange={(e) => setEditFormData({ ...editFormData, preco_min: e.target.value })}
                      inputProps={{ min: 0, step: 0.01 }}
                      helperText="Preço mínimo de venda"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Preço Máximo"
                      type="number"
                      value={editFormData.preco_max}
                      onChange={(e) => setEditFormData({ ...editFormData, preco_max: e.target.value })}
                      inputProps={{ min: 0, step: 0.01 }}
                      helperText="Preço máximo de venda"
                    />
                  </Grid>
                </Grid>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={editFormData.categoria}
                    onChange={(e) => setEditFormData({ ...editFormData, categoria: e.target.value })}
                    label="Categoria"
                  >
                    <MenuItem value="ANIMAIS">Animais</MenuItem>
                    <MenuItem value="SEMENTES">Sementes</MenuItem>
                    <MenuItem value="PLANTAS">Plantas</MenuItem>
                    <MenuItem value="MINERIOS">Minérios</MenuItem>
                    <MenuItem value="ALIMENTACAO">Alimentação</MenuItem>
                    <MenuItem value="FERRAMENTAS">Ferramentas</MenuItem>
                    <MenuItem value="MATERIAIS">Materiais</MenuItem>
                    <MenuItem value="OUTROS">Outros</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            {editingItem?.isLinked && (
              <Box sx={{ p: 2, backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" color="info.main">
                  ℹ️ Este item está vinculado. As alterações de preço serão aplicadas ao item de preço vinculado: {editingItem?.linkedId}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={!editFormData.nome}
          >
            💾 Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockManagement;