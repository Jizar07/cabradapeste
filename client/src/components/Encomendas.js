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
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  ShoppingCart as OrderIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CheckCircle as OnlineIcon,
  Star as StarIcon,
  Tooltip
} from '@mui/icons-material';
import { SocketContext } from '../context/SocketContext';

const Encomendas = () => {
  const socket = useContext(SocketContext);
  const [tabValue, setTabValue] = useState(0);
  const [clients, setClients] = useState({});
  const [orders, setOrders] = useState({});
  const [knownPlayers, setKnownPlayers] = useState({});
  const [items, setItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Client form state
  const [clientDialog, setClientDialog] = useState({ open: false, mode: 'add', client: null });
  const [clientForm, setClientForm] = useState({
    name: '',
    client_id: '',
    category: 'Regular',
    phone: '',
    email: '',
    notes: ''
  });

  // Order form state
  const [orderDialog, setOrderDialog] = useState({ open: false, mode: 'add', order: null });
  const [orderForm, setOrderForm] = useState({
    client_id: '',
    items: [],
    status: 'Pendente',
    notes: '',
    delivery_date: ''
  });
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, ordersRes, itemsRes, knownPlayersRes] = await Promise.all([
        fetch('/api/encomendas/clients'),
        fetch('/api/encomendas/orders'),
        fetch('/api/pricing/items'),
        fetch('/api/known-players')
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      if (knownPlayersRes.ok) {
        const knownPlayersData = await knownPlayersRes.json();
        setKnownPlayers(knownPlayersData.data?.players || {});
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

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  // Helper function to find known player by name or display name
  const findKnownPlayer = (clientName) => {
    if (!clientName) return null;
    
    // First try to match by name_id
    let knownPlayer = knownPlayers[clientName];
    if (knownPlayer) return knownPlayer;
    
    // Then try to match by display_name
    for (const player of Object.values(knownPlayers)) {
      if (player.display_name && player.display_name.toLowerCase() === clientName.toLowerCase()) {
        return player;
      }
    }
    
    return null;
  };

  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Client management functions
  const handleClientSave = async () => {
    try {
      const url = clientDialog.mode === 'add' ? '/api/encomendas/clients' : `/api/encomendas/clients/${clientForm.client_id}`;
      const method = clientDialog.mode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });

      if (response.ok) {
        showNotification(clientDialog.mode === 'add' ? 'Cliente adicionado!' : 'Cliente atualizado!');
        setClientDialog({ open: false, mode: 'add', client: null });
        setClientForm({ name: '', client_id: '', category: 'Regular', phone: '', email: '', notes: '' });
        loadData();
      } else {
        showNotification('Erro ao salvar cliente', 'error');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      showNotification('Erro ao salvar cliente', 'error');
    }
  };

  const handleClientEdit = (client) => {
    setClientForm(client);
    setClientDialog({ open: true, mode: 'edit', client });
  };

  const handleClientDelete = async (clientId) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const response = await fetch(`/api/encomendas/clients/${clientId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('Cliente excluído!');
        loadData();
      } else {
        showNotification('Erro ao excluir cliente', 'error');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      showNotification('Erro ao excluir cliente', 'error');
    }
  };

  // Order management functions
  const handleOrderSave = async () => {
    try {
      const orderData = {
        ...orderForm,
        items: selectedItems,
        total_cost: selectedItems.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0),
        total_price: selectedItems.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0)
      };

      const url = orderDialog.mode === 'add' ? '/api/encomendas/orders' : `/api/encomendas/orders/${orderForm.id}`;
      const method = orderDialog.mode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        showNotification(orderDialog.mode === 'add' ? 'Pedido criado!' : 'Pedido atualizado!');
        setOrderDialog({ open: false, mode: 'add', order: null });
        setOrderForm({ client_id: '', items: [], status: 'Pendente', notes: '', delivery_date: '' });
        setSelectedItems([]);
        loadData();
      } else {
        showNotification('Erro ao salvar pedido', 'error');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      showNotification('Erro ao salvar pedido', 'error');
    }
  };

  const handleOrderDelete = async (orderId) => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      const response = await fetch(`/api/encomendas/orders/${orderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('Pedido excluído!');
        loadData();
      } else {
        showNotification('Erro ao excluir pedido', 'error');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      showNotification('Erro ao excluir pedido', 'error');
    }
  };

  const addItemToOrder = (item) => {
    if (!selectedItems.find(si => si.item_name === item.item_name)) {
      setSelectedItems([...selectedItems, {
        item_name: item.item_name,
        quantity: 1,
        cost_price: item.buy_price || 0,
        sell_price: item.sell_price || 0
      }]);
    }
  };

  const updateItemQuantity = (itemName, quantity) => {
    setSelectedItems(selectedItems.map(item =>
      item.item_name === itemName ? { ...item, quantity } : item
    ));
  };

  const removeItemFromOrder = (itemName) => {
    setSelectedItems(selectedItems.filter(item => item.item_name !== itemName));
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pendente': 'warning',
      'Em Produção': 'info',
      'Pronto': 'success',
      'Entregue': 'primary',
      'Cancelado': 'error'
    };
    return colors[status] || 'default';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'VIP': 'error',
      'Premium': 'warning',
      'Regular': 'default'
    };
    return colors[category] || 'default';
  };

  const filteredClients = Object.values(clients).filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.client_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  const filteredOrders = Object.values(orders).filter(order => {
    const client = clients[order.client_id];
    return client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           order.status?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          📋 Encomendas - Gestão de Clientes e Pedidos
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
          <TextField
            placeholder="Buscar clientes ou pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
            sx={{ flexGrow: 1 }}
          />
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<PersonIcon />} label="Clientes" />
          <Tab icon={<OrderIcon />} label="Pedidos" />
        </Tabs>
      </Paper>

      {/* Clients Tab */}
      {tabValue === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">👥 Clientes ({filteredClients.length})</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setClientDialog({ open: true, mode: 'add', client: null })}
            >
              Novo Cliente
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Total Gasto</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.client_id}>
                    <TableCell>{client.client_id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="action" />
                        {client.name}
                        {(() => {
                          const knownPlayer = findKnownPlayer(client.name);
                          if (knownPlayer) {
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Tooltip title={`Known Player: ${knownPlayer.display_name || knownPlayer.name_id}`}>
                                  <StarIcon color="warning" fontSize="small" />
                                </Tooltip>
                                {knownPlayer.is_online && (
                                  <Tooltip title={`Online - Boot ID: ${knownPlayer.last_seen_id}`}>
                                    <OnlineIcon color="success" fontSize="small" />
                                  </Tooltip>
                                )}
                                {knownPlayer.job && (
                                  <Chip label={knownPlayer.job} size="small" variant="outlined" />
                                )}
                              </Box>
                            );
                          }
                          return null;
                        })()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={client.category}
                        color={getCategoryColor(client.category)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {client.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" />
                          {client.phone}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={client.priority_score || 0}
                        color={client.priority_score > 100 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>R$ {(client.total_spent || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleClientEdit(client)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleClientDelete(client.client_id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Orders Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">🛒 Pedidos ({filteredOrders.length})</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOrderDialog({ open: true, mode: 'add', order: null })}
            >
              Novo Pedido
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Itens</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Lucro</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((order) => {
                  const client = clients[order.client_id];
                  return (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {client?.name || 'Cliente Desconhecido'}
                          {(() => {
                            const knownPlayer = findKnownPlayer(client?.name);
                            if (knownPlayer) {
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Tooltip title={`Known Player: ${knownPlayer.display_name || knownPlayer.name_id}`}>
                                    <StarIcon color="warning" fontSize="small" />
                                  </Tooltip>
                                  {knownPlayer.is_online && (
                                    <Tooltip title={`Online - Boot ID: ${knownPlayer.last_seen_id}`}>
                                      <OnlineIcon color="success" fontSize="small" />
                                    </Tooltip>
                                  )}
                                  {knownPlayer.job && (
                                    <Chip label={knownPlayer.job} size="small" variant="outlined" />
                                  )}
                                </Box>
                              );
                            }
                            return null;
                          })()}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          color={getStatusColor(order.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{order.items?.length || 0} itens</TableCell>
                      <TableCell>R$ {(order.total_price || 0).toFixed(2)}</TableCell>
                      <TableCell>R$ {(order.profit || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(order.created_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleOrderDelete(order.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Client Dialog */}
      <Dialog open={clientDialog.open} onClose={() => setClientDialog({ open: false, mode: 'add', client: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          {clientDialog.mode === 'add' ? '👤 Novo Cliente' : '✏️ Editar Cliente'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome"
                value={clientForm.name}
                onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="ID do Cliente"
                value={clientForm.client_id}
                onChange={(e) => setClientForm({...clientForm, client_id: e.target.value})}
                fullWidth
                required
                disabled={clientDialog.mode === 'edit'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={clientForm.category}
                  onChange={(e) => setClientForm({...clientForm, category: e.target.value})}
                  label="Categoria"
                >
                  <MenuItem value="Regular">Regular</MenuItem>
                  <MenuItem value="Premium">Premium</MenuItem>
                  <MenuItem value="VIP">VIP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Telefone"
                value={clientForm.phone}
                onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                value={clientForm.email}
                onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                fullWidth
                type="email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observações"
                value={clientForm.notes}
                onChange={(e) => setClientForm({...clientForm, notes: e.target.value})}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientDialog({ open: false, mode: 'add', client: null })}>
            Cancelar
          </Button>
          <Button onClick={handleClientSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={orderDialog.open} onClose={() => setOrderDialog({ open: false, mode: 'add', order: null })} maxWidth="lg" fullWidth>
        <DialogTitle>
          {orderDialog.mode === 'add' ? '🛒 Novo Pedido' : '✏️ Editar Pedido'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={orderForm.client_id}
                  onChange={(e) => setOrderForm({...orderForm, client_id: e.target.value})}
                  label="Cliente"
                >
                  {Object.values(clients).map((client) => (
                    <MenuItem key={client.client_id} value={client.client_id}>
                      {client.name} ({client.client_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm({...orderForm, status: e.target.value})}
                  label="Status"
                >
                  <MenuItem value="Pendente">Pendente</MenuItem>
                  <MenuItem value="Em Produção">Em Produção</MenuItem>
                  <MenuItem value="Pronto">Pronto</MenuItem>
                  <MenuItem value="Entregue">Entregue</MenuItem>
                  <MenuItem value="Cancelado">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Itens do Pedido</Typography>
              <Autocomplete
                options={Object.values(items)}
                getOptionLabel={(option) => `${option.item_name} - R$ ${option.sell_price}`}
                onChange={(e, value) => value && addItemToOrder(value)}
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
                        <TableCell>Quantidade</TableCell>
                        <TableCell>Preço Unit.</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Ação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedItems.map((item) => (
                        <TableRow key={item.item_name}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.item_name, parseInt(e.target.value) || 0)}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>R$ {item.sell_price.toFixed(2)}</TableCell>
                          <TableCell>R$ {(item.sell_price * item.quantity).toFixed(2)}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeItemFromOrder(item.item_name)}
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
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observações"
                value={orderForm.notes}
                onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog({ open: false, mode: 'add', order: null })}>
            Cancelar
          </Button>
          <Button onClick={handleOrderSave} variant="contained">
            Salvar Pedido
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

export default Encomendas;