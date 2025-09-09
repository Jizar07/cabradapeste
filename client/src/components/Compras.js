import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  TrendingUp as ProfitIcon,
  Warning as WarningIcon,
  Inventory as StockIcon
} from '@mui/icons-material';
import { SocketContext } from '../context/SocketContext';

const Compras = () => {
  const socket = useContext(SocketContext);
  const [tabValue, setTabValue] = useState(0);
  const [purchaseLists, setPurchaseLists] = useState({});
  const [completedPurchases, setCompletedPurchases] = useState({});
  const [inventory, setInventory] = useState({});
  const [items, setItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Purchase list form state
  const [listDialog, setListDialog] = useState({ open: false, mode: 'add', list: null });
  const [listForm, setListForm] = useState({
    name: '',
    description: '',
    status: 'Planejando',
    target_date: ''
  });
  const [selectedItems, setSelectedItems] = useState([]);

  // Low stock suggestions
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [listsRes, completedRes, inventoryRes, itemsRes] = await Promise.all([
        fetch('/api/compras/lists'),
        fetch('/api/compras/completed'),
        fetch('/api/inventory/data'),
        fetch('/api/pricing/items')
      ]);

      if (listsRes.ok) {
        const listsData = await listsRes.json();
        setPurchaseLists(listsData);
      }

      if (completedRes.ok) {
        const completedData = await completedRes.json();
        setCompletedPurchases(completedData);
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData.inventory || {});
        // Calculate low stock items
        calculateLowStockItems(inventoryData.inventory || {});
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Erro ao carregar dados', 'error');
    }
  };

  const calculateLowStockItems = (inventoryData) => {
    const LOW_STOCK_THRESHOLD = 50; // Items with less than 50 units
    const lowStock = [];

    Object.entries(inventoryData).forEach(([itemName, itemData]) => {
      const quantity = typeof itemData === 'object' ? itemData.quantity : itemData;
      if (quantity < LOW_STOCK_THRESHOLD) {
        lowStock.push({
          item_name: itemName,
          current_stock: quantity,
          suggested_quantity: Math.max(100 - quantity, 25) // Suggest to bring to 100 or at least 25 more
        });
      }
    });

    setLowStockItems(lowStock.slice(0, 10)); // Show top 10 low stock items
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Purchase list management functions
  const handleListSave = async () => {
    try {
      const listData = {
        ...listForm,
        items: selectedItems,
        total_min_cost: selectedItems.reduce((sum, item) => sum + (item.min_price * item.quantity), 0),
        total_max_cost: selectedItems.reduce((sum, item) => sum + (item.max_price * item.quantity), 0),
        expected_profit: selectedItems.reduce((sum, item) => sum + ((item.sell_price - item.max_price) * item.quantity), 0)
      };

      const url = listDialog.mode === 'add' ? '/api/compras/lists' : `/api/compras/lists/${listForm.id}`;
      const method = listDialog.mode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listData)
      });

      if (response.ok) {
        showNotification(listDialog.mode === 'add' ? 'Lista de compras criada!' : 'Lista atualizada!');
        setListDialog({ open: false, mode: 'add', list: null });
        setListForm({ name: '', description: '', status: 'Planejando', target_date: '' });
        setSelectedItems([]);
        loadData();
      } else {
        showNotification('Erro ao salvar lista', 'error');
      }
    } catch (error) {
      console.error('Error saving list:', error);
      showNotification('Erro ao salvar lista', 'error');
    }
  };

  const handleListEdit = (list) => {
    setListForm(list);
    setSelectedItems(list.items || []);
    setListDialog({ open: true, mode: 'edit', list });
  };

  const handleListDelete = async (listId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta lista?')) return;

    try {
      const response = await fetch(`/api/compras/lists/${listId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('Lista excluída!');
        loadData();
      } else {
        showNotification('Erro ao excluir lista', 'error');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      showNotification('Erro ao excluir lista', 'error');
    }
  };

  const handleCompletePurchase = async (listId, actualCosts) => {
    try {
      const response = await fetch(`/api/compras/complete/${listId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_costs: actualCosts })
      });

      if (response.ok) {
        showNotification('Compra finalizada com sucesso!');
        loadData();
      } else {
        showNotification('Erro ao finalizar compra', 'error');
      }
    } catch (error) {
      console.error('Error completing purchase:', error);
      showNotification('Erro ao finalizar compra', 'error');
    }
  };

  const addItemToList = (item) => {
    if (!selectedItems.find(si => si.item_name === item.item_name)) {
      const currentStock = inventory[item.item_name]?.quantity || 0;
      const suggestedQuantity = Math.max(100 - currentStock, 25);
      
      setSelectedItems([...selectedItems, {
        item_name: item.item_name,
        quantity: suggestedQuantity,
        min_price: item.buy_price || 0,
        max_price: item.sell_price || 0,
        sell_price: item.sell_price || 0,
        current_stock: currentStock
      }]);
    }
  };

  const updateItemQuantity = (itemName, quantity) => {
    setSelectedItems(selectedItems.map(item =>
      item.item_name === itemName ? { ...item, quantity } : item
    ));
  };

  const removeItemFromList = (itemName) => {
    setSelectedItems(selectedItems.filter(item => item.item_name !== itemName));
  };

  const addLowStockItem = (lowStockItem) => {
    const item = items[lowStockItem.item_name];
    if (item) {
      addItemToList({
        ...item,
        suggested_quantity: lowStockItem.suggested_quantity
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Planejando': 'info',
      'Aprovada': 'warning',
      'Comprada': 'success',
      'Cancelada': 'error'
    };
    return colors[status] || 'default';
  };

  const filteredLists = Object.values(purchaseLists).filter(list =>
    list.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompleted = Object.values(completedPurchases).filter(purchase =>
    purchase.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🛒 Compras - Planejamento de Compras
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
          <TextField
            placeholder="Buscar listas de compras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
            sx={{ flexGrow: 1 }}
          />
        </Box>
      </Paper>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <Typography variant="h6" gutterBottom>
            ⚠️ Itens com Estoque Baixo ({lowStockItems.length})
          </Typography>
          <Grid container spacing={1}>
            {lowStockItems.slice(0, 5).map((item) => (
              <Grid item key={item.item_name}>
                <Chip
                  label={`${item.item_name}: ${item.current_stock}`}
                  color="warning"
                  size="small"
                  onClick={() => addLowStockItem(item)}
                  clickable
                  icon={<StockIcon />}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<CartIcon />} label="Listas Ativas" />
          <Tab icon={<CompleteIcon />} label="Compras Finalizadas" />
        </Tabs>
      </Paper>

      {/* Active Lists Tab */}
      {tabValue === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">📋 Listas de Compras Ativas ({filteredLists.length})</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setListDialog({ open: true, mode: 'add', list: null })}
            >
              Nova Lista
            </Button>
          </Box>

          <Grid container spacing={2}>
            {filteredLists.map((list) => (
              <Grid item xs={12} md={6} lg={4} key={list.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" noWrap>{list.name}</Typography>
                      <Chip
                        label={list.status}
                        color={getStatusColor(list.status)}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {list.description || 'Sem descrição'}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        📦 {list.items?.length || 0} itens
                      </Typography>
                      <Typography variant="body2">
                        💰 Custo: R$ {(list.total_min_cost || 0).toFixed(2)} - R$ {(list.total_max_cost || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        📈 Lucro esperado: R$ {(list.expected_profit || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton onClick={() => handleListEdit(list)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleListDelete(list.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                      {list.status === 'Aprovada' && (
                        <IconButton
                          onClick={() => handleCompletePurchase(list.id, {})}
                          size="small"
                          color="success"
                        >
                          <CompleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Completed Purchases Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            ✅ Compras Finalizadas ({filteredCompleted.length})
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Itens</TableCell>
                  <TableCell>Custo Planejado</TableCell>
                  <TableCell>Custo Real</TableCell>
                  <TableCell>Variação</TableCell>
                  <TableCell>ROI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompleted.map((purchase) => {
                  const variance = (purchase.actual_total_cost || 0) - (purchase.planned_total_cost || 0);
                  const roi = purchase.planned_total_cost > 0 ? 
                    ((purchase.expected_profit || 0) / purchase.planned_total_cost * 100) : 0;
                  
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell>{purchase.name}</TableCell>
                      <TableCell>
                        {new Date(purchase.completed_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{purchase.items?.length || 0} itens</TableCell>
                      <TableCell>R$ {(purchase.planned_total_cost || 0).toFixed(2)}</TableCell>
                      <TableCell>R$ {(purchase.actual_total_cost || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Typography
                          color={variance > 0 ? 'error.main' : 'success.main'}
                          variant="body2"
                        >
                          {variance > 0 ? '+' : ''}R$ {variance.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          color={roi > 20 ? 'success.main' : roi > 10 ? 'warning.main' : 'error.main'}
                          variant="body2"
                        >
                          {roi.toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Purchase List Dialog */}
      <Dialog open={listDialog.open} onClose={() => setListDialog({ open: false, mode: 'add', list: null })} maxWidth="lg" fullWidth>
        <DialogTitle>
          {listDialog.mode === 'add' ? '🛒 Nova Lista de Compras' : '✏️ Editar Lista de Compras'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome da Lista"
                value={listForm.name}
                onChange={(e) => setListForm({...listForm, name: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={listForm.status}
                  onChange={(e) => setListForm({...listForm, status: e.target.value})}
                  label="Status"
                >
                  <MenuItem value="Planejando">Planejando</MenuItem>
                  <MenuItem value="Aprovada">Aprovada</MenuItem>
                  <MenuItem value="Comprada">Comprada</MenuItem>
                  <MenuItem value="Cancelada">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descrição"
                value={listForm.description}
                onChange={(e) => setListForm({...listForm, description: e.target.value})}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Itens para Comprar</Typography>
              
              <Autocomplete
                options={Object.values(items)}
                getOptionLabel={(option) => `${option.item_name} - R$ ${option.buy_price} (Estoque: ${inventory[option.item_name]?.quantity || 0})`}
                onChange={(e, value) => value && addItemToList(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Adicionar Item" placeholder="Digite para buscar itens..." />
                )}
                sx={{ mb: 2 }}
              />
              
              {selectedItems.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Estoque Atual</TableCell>
                        <TableCell>Quantidade</TableCell>
                        <TableCell>Preço Min.</TableCell>
                        <TableCell>Preço Max.</TableCell>
                        <TableCell>Custo Total</TableCell>
                        <TableCell>Ação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedItems.map((item) => (
                        <TableRow key={item.item_name}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.current_stock}
                              color={item.current_stock < 50 ? 'error' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.item_name, parseInt(e.target.value) || 0)}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>R$ {item.min_price.toFixed(2)}</TableCell>
                          <TableCell>R$ {item.max_price.toFixed(2)}</TableCell>
                          <TableCell>
                            R$ {(item.min_price * item.quantity).toFixed(2)} - R$ {(item.max_price * item.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeItemFromList(item.item_name)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {selectedItems.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="subtitle1">
                    💰 Custo Total: R$ {selectedItems.reduce((sum, item) => sum + (item.min_price * item.quantity), 0).toFixed(2)} - 
                    R$ {selectedItems.reduce((sum, item) => sum + (item.max_price * item.quantity), 0).toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1" color="success.main">
                    📈 Lucro Esperado: R$ {selectedItems.reduce((sum, item) => sum + ((item.sell_price - item.max_price) * item.quantity), 0).toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setListDialog({ open: false, mode: 'add', list: null })}>
            Cancelar
          </Button>
          <Button onClick={handleListSave} variant="contained">
            Salvar Lista
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleNotificationClose} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Compras;