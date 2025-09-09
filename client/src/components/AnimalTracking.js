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
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Pets as AnimalIcon,
  AssignmentTurnedIn as CheckoutIcon,
  Assignment as DeliveryIcon,
  AssignmentReturn as ReturnIcon,
  TrendingUp as StatsIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { SocketContext } from '../context/SocketContext';

const AnimalTracking = () => {
  const socket = useContext(SocketContext);
  const [tabValue, setTabValue] = useState(0);
  const [animalData, setAnimalData] = useState({});
  const [inventory, setInventory] = useState({});
  const [users, setUsers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Form states
  const [checkoutDialog, setCheckoutDialog] = useState({ open: false });
  const [returnDialog, setReturnDialog] = useState({ open: false });
  const [deliveryDialog, setDeliveryDialog] = useState({ open: false });
  
  const [checkoutForm, setCheckoutForm] = useState({
    worker_name: '',
    animal_type: '',
    quantity: 1,
    notes: ''
  });

  const [returnForm, setReturnForm] = useState({
    checkout_id: '',
    quantity_returned: 1,
    notes: ''
  });

  const [deliveryForm, setDeliveryForm] = useState({
    checkout_id: '',
    delivered_by: '',
    quantity_delivered: 1,
    cross_delivery_reason: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [animalRes, inventoryRes, usersRes] = await Promise.all([
        fetch('/api/animal-tracking/data'),
        fetch('/api/inventory/data'),
        fetch('/api/users/all')
      ]);

      if (animalRes.ok) {
        const animalData = await animalRes.json();
        setAnimalData(animalData);
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData.inventory || {});
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Erro ao carregar dados', 'error');
    }
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Animal checkout functions
  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/animal-tracking/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutForm)
      });

      if (response.ok) {
        showNotification('Animal retirado com sucesso!');
        setCheckoutDialog({ open: false });
        setCheckoutForm({ worker_name: '', animal_type: '', quantity: 1, notes: '' });
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Erro ao retirar animal', 'error');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      showNotification('Erro ao retirar animal', 'error');
    }
  };

  const handleReturn = async () => {
    try {
      const response = await fetch('/api/animal-tracking/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnForm)
      });

      if (response.ok) {
        showNotification('Animal devolvido com sucesso!');
        setReturnDialog({ open: false });
        setReturnForm({ checkout_id: '', quantity_returned: 1, notes: '' });
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Erro ao devolver animal', 'error');
      }
    } catch (error) {
      console.error('Error during return:', error);
      showNotification('Erro ao devolver animal', 'error');
    }
  };

  const handleDelivery = async () => {
    try {
      const response = await fetch('/api/animal-tracking/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryForm)
      });

      if (response.ok) {
        showNotification('Entrega registrada com sucesso!');
        setDeliveryDialog({ open: false });
        setDeliveryForm({ checkout_id: '', delivered_by: '', quantity_delivered: 1, cross_delivery_reason: '', notes: '' });
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Erro ao registrar entrega', 'error');
      }
    } catch (error) {
      console.error('Error during delivery:', error);
      showNotification('Erro ao registrar entrega', 'error');
    }
  };

  // Helper functions
  const getAnimalTypes = () => {
    return Object.keys(inventory).filter(item => 
      ['vaca', 'boi', 'porco', 'cabra', 'ovelha', 'galinha'].some(animal => 
        item.toLowerCase().includes(animal)
      )
    );
  };

  const getPendingCheckouts = () => {
    const checkouts = animalData.checkouts || {};
    return Object.values(checkouts).filter(checkout => checkout.status === 'pending');
  };

  const getCompletedDeliveries = () => {
    const deliveries = animalData.deliveries || {};
    return Object.values(deliveries);
  };

  const getWorkerStats = () => {
    const stats = {};
    const checkouts = animalData.checkouts || {};
    const deliveries = animalData.deliveries || {};
    const returns = animalData.returns || {};

    // Initialize stats for all users
    Object.keys(users).forEach(userId => {
      const user = users[userId];
      stats[userId] = {
        name: user.name || userId,
        role: user.role || 'worker',
        animals_checked_out: 0,
        animals_delivered: 0,
        animals_returned: 0,
        animals_pending: 0,
        animals_lost: 0,
        success_rate: 100,
        total_earnings: 0
      };
    });

    // Count checkouts
    Object.values(checkouts).forEach(checkout => {
      const workerId = checkout.worker_name;
      if (stats[workerId]) {
        stats[workerId].animals_checked_out += checkout.quantity;
        if (checkout.status === 'pending') {
          stats[workerId].animals_pending += checkout.quantity;
        }
      }
    });

    // Count deliveries
    Object.values(deliveries).forEach(delivery => {
      const workerId = delivery.delivered_by;
      if (stats[workerId]) {
        stats[workerId].animals_delivered += delivery.quantity;
        // Workers earn $60 per delivery, managers earn $0
        if (stats[workerId].role !== 'manager') {
          stats[workerId].total_earnings += 60;
        }
      }
    });

    // Count returns
    Object.values(returns).forEach(returnRecord => {
      const checkoutId = returnRecord.checkout_id;
      const checkout = checkouts[checkoutId];
      if (checkout && stats[checkout.worker_name]) {
        stats[checkout.worker_name].animals_returned += returnRecord.quantity;
      }
    });

    // Calculate success rate and lost animals
    Object.keys(stats).forEach(workerId => {
      const stat = stats[workerId];
      const totalAccounted = stat.animals_delivered + stat.animals_returned;
      stat.animals_lost = Math.max(0, stat.animals_checked_out - totalAccounted);
      stat.success_rate = stat.animals_checked_out > 0 ? 
        ((totalAccounted / stat.animals_checked_out) * 100) : 100;
    });

    return stats;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'warning',
      'delivered': 'success',
      'returned': 'info',
      'lost': 'error'
    };
    return colors[status] || 'default';
  };

  const pendingCheckouts = getPendingCheckouts();
  const completedDeliveries = getCompletedDeliveries();
  const workerStats = getWorkerStats();
  const animalTypes = getAnimalTypes();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🐄 Rastreamento de Animais
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Animais Pendentes
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {pendingCheckouts.reduce((sum, checkout) => sum + checkout.quantity, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Entregas Hoje
                </Typography>
                <Typography variant="h4" color="success.main">
                  {completedDeliveries.filter(d => 
                    new Date(d.timestamp).toDateString() === new Date().toDateString()
                  ).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Receita Hoje
                </Typography>
                <Typography variant="h4" color="primary.main">
                  R$ {(completedDeliveries.filter(d => 
                    new Date(d.timestamp).toDateString() === new Date().toDateString()
                  ).length * 160).toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Taxa de Sucesso
                </Typography>
                <Typography variant="h4" color="info.main">
                  {Object.values(workerStats).length > 0 ? 
                    (Object.values(workerStats).reduce((sum, stat) => sum + stat.success_rate, 0) / 
                     Object.values(workerStats).length).toFixed(1) : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<CheckoutIcon />}
              onClick={() => setCheckoutDialog({ open: true })}
              color="warning"
            >
              Retirar Animal
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<ReturnIcon />}
              onClick={() => setReturnDialog({ open: true })}
              color="info"
            >
              Devolver Animal
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<DeliveryIcon />}
              onClick={() => setDeliveryDialog({ open: true })}
              color="success"
            >
              Registrar Entrega
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<CheckoutIcon />} label="Animais Pendentes" />
          <Tab icon={<DeliveryIcon />} label="Entregas" />
          <Tab icon={<StatsIcon />} label="Estatísticas" />
        </Tabs>
      </Paper>

      {/* Pending Animals Tab */}
      {tabValue === 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            🐄 Animais Pendentes ({pendingCheckouts.length})
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Trabalhador</TableCell>
                  <TableCell>Animal</TableCell>
                  <TableCell>Quantidade</TableCell>
                  <TableCell>Data Retirada</TableCell>
                  <TableCell>Dias Pendente</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingCheckouts.map((checkout) => {
                  const daysPending = Math.floor((Date.now() - new Date(checkout.timestamp).getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysPending > 7;
                  
                  return (
                    <TableRow key={checkout.id}>
                      <TableCell>{checkout.id}</TableCell>
                      <TableCell>{users[checkout.worker_name]?.name || checkout.worker_name}</TableCell>
                      <TableCell>{checkout.animal_type}</TableCell>
                      <TableCell>{checkout.quantity}</TableCell>
                      <TableCell>
                        {new Date(checkout.timestamp).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${daysPending} dias`}
                          color={isOverdue ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Pendente"
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="success"
                          onClick={() => {
                            setDeliveryForm({
                              ...deliveryForm,
                              checkout_id: checkout.id,
                              delivered_by: checkout.worker_name,
                              quantity_delivered: checkout.quantity
                            });
                            setDeliveryDialog({ open: true });
                          }}
                        >
                          Entregar
                        </Button>
                        <Button
                          size="small"
                          color="info"
                          onClick={() => {
                            setReturnForm({
                              ...returnForm,
                              checkout_id: checkout.id,
                              quantity_returned: checkout.quantity
                            });
                            setReturnDialog({ open: true });
                          }}
                          sx={{ ml: 1 }}
                        >
                          Devolver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Deliveries Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            🚚 Entregas Realizadas ({completedDeliveries.length})
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Entregue Por</TableCell>
                  <TableCell>Animal</TableCell>
                  <TableCell>Quantidade</TableCell>
                  <TableCell>Receita Firma</TableCell>
                  <TableCell>Pagamento Trabalhador</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Observações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completedDeliveries.slice(0, 50).map((delivery) => {
                  const firmRevenue = delivery.quantity * 160;
                  const workerPayment = users[delivery.delivered_by]?.role === 'manager' ? 0 : 60;
                  
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>{delivery.id}</TableCell>
                      <TableCell>{users[delivery.delivered_by]?.name || delivery.delivered_by}</TableCell>
                      <TableCell>{delivery.animal_type}</TableCell>
                      <TableCell>{delivery.quantity}</TableCell>
                      <TableCell>R$ {firmRevenue.toFixed(2)}</TableCell>
                      <TableCell>
                        <Typography color={workerPayment > 0 ? 'success.main' : 'text.secondary'}>
                          R$ {workerPayment.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(delivery.timestamp).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{delivery.notes || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Statistics Tab */}
      {tabValue === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            📊 Estatísticas por Trabalhador
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Trabalhador</TableCell>
                  <TableCell>Função</TableCell>
                  <TableCell>Retirados</TableCell>
                  <TableCell>Entregues</TableCell>
                  <TableCell>Devolvidos</TableCell>
                  <TableCell>Pendentes</TableCell>
                  <TableCell>Perdidos</TableCell>
                  <TableCell>Taxa Sucesso</TableCell>
                  <TableCell>Ganhos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(workerStats)
                  .filter(([_, stat]) => stat.animals_checked_out > 0)
                  .sort(([,a], [,b]) => b.animals_delivered - a.animals_delivered)
                  .map(([userId, stat]) => (
                    <TableRow key={userId}>
                      <TableCell>{stat.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={stat.role === 'manager' ? 'Gerente' : 'Trabalhador'}
                          color={stat.role === 'manager' ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{stat.animals_checked_out}</TableCell>
                      <TableCell>{stat.animals_delivered}</TableCell>
                      <TableCell>{stat.animals_returned}</TableCell>
                      <TableCell>
                        <Chip
                          label={stat.animals_pending}
                          color={stat.animals_pending > 5 ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={stat.animals_lost}
                          color={stat.animals_lost > 0 ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={stat.success_rate}
                            sx={{ width: 60 }}
                            color={stat.success_rate >= 90 ? 'success' : stat.success_rate >= 70 ? 'warning' : 'error'}
                          />
                          <Typography variant="body2">
                            {stat.success_rate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography color="success.main">
                          R$ {stat.total_earnings.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog.open} onClose={() => setCheckoutDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>🐄 Retirar Animal</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Trabalhador</InputLabel>
                <Select
                  value={checkoutForm.worker_name}
                  onChange={(e) => setCheckoutForm({...checkoutForm, worker_name: e.target.value})}
                  label="Trabalhador"
                >
                  {Object.entries(users).map(([userId, user]) => (
                    <MenuItem key={userId} value={userId}>
                      {user.name || userId} ({user.role === 'manager' ? 'Gerente' : 'Trabalhador'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Animal</InputLabel>
                <Select
                  value={checkoutForm.animal_type}
                  onChange={(e) => setCheckoutForm({...checkoutForm, animal_type: e.target.value})}
                  label="Tipo de Animal"
                >
                  {animalTypes.map((animal) => (
                    <MenuItem key={animal} value={animal}>
                      {animal} (Estoque: {inventory[animal]?.quantity || 0})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Quantidade"
                type="number"
                value={checkoutForm.quantity}
                onChange={(e) => setCheckoutForm({...checkoutForm, quantity: parseInt(e.target.value) || 1})}
                inputProps={{ min: 1 }}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observações"
                value={checkoutForm.notes}
                onChange={(e) => setCheckoutForm({...checkoutForm, notes: e.target.value})}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialog({ open: false })}>
            Cancelar
          </Button>
          <Button onClick={handleCheckout} variant="contained">
            Retirar Animal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onClose={() => setReturnDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>🔄 Devolver Animal</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Animal Pendente</InputLabel>
                <Select
                  value={returnForm.checkout_id}
                  onChange={(e) => {
                    const checkout = pendingCheckouts.find(c => c.id === e.target.value);
                    setReturnForm({
                      ...returnForm,
                      checkout_id: e.target.value,
                      quantity_returned: checkout ? checkout.quantity : 1
                    });
                  }}
                  label="Animal Pendente"
                >
                  {pendingCheckouts.map((checkout) => (
                    <MenuItem key={checkout.id} value={checkout.id}>
                      {checkout.animal_type} x{checkout.quantity} - {users[checkout.worker_name]?.name || checkout.worker_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantidade a Devolver"
                type="number"
                value={returnForm.quantity_returned}
                onChange={(e) => setReturnForm({...returnForm, quantity_returned: parseInt(e.target.value) || 1})}
                inputProps={{ min: 1 }}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observações"
                value={returnForm.notes}
                onChange={(e) => setReturnForm({...returnForm, notes: e.target.value})}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialog({ open: false })}>
            Cancelar
          </Button>
          <Button onClick={handleReturn} variant="contained">
            Devolver Animal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={deliveryDialog.open} onClose={() => setDeliveryDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>🚚 Registrar Entrega</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Animal Pendente</InputLabel>
                <Select
                  value={deliveryForm.checkout_id}
                  onChange={(e) => {
                    const checkout = pendingCheckouts.find(c => c.id === e.target.value);
                    setDeliveryForm({
                      ...deliveryForm,
                      checkout_id: e.target.value,
                      delivered_by: checkout ? checkout.worker_name : '',
                      quantity_delivered: checkout ? checkout.quantity : 1
                    });
                  }}
                  label="Animal Pendente"
                >
                  {pendingCheckouts.map((checkout) => (
                    <MenuItem key={checkout.id} value={checkout.id}>
                      {checkout.animal_type} x{checkout.quantity} - {users[checkout.worker_name]?.name || checkout.worker_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Entregue Por</InputLabel>
                <Select
                  value={deliveryForm.delivered_by}
                  onChange={(e) => setDeliveryForm({...deliveryForm, delivered_by: e.target.value})}
                  label="Entregue Por"
                >
                  {Object.entries(users).map(([userId, user]) => (
                    <MenuItem key={userId} value={userId}>
                      {user.name || userId} ({user.role === 'manager' ? 'Gerente' : 'Trabalhador'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantidade Entregue"
                type="number"
                value={deliveryForm.quantity_delivered}
                onChange={(e) => setDeliveryForm({...deliveryForm, quantity_delivered: parseInt(e.target.value) || 1})}
                inputProps={{ min: 1 }}
                fullWidth
                required
              />
            </Grid>
            {deliveryForm.checkout_id && 
             pendingCheckouts.find(c => c.id === deliveryForm.checkout_id)?.worker_name !== deliveryForm.delivered_by && (
              <Grid item xs={12}>
                <TextField
                  label="Motivo da Entrega Cruzada"
                  value={deliveryForm.cross_delivery_reason}
                  onChange={(e) => setDeliveryForm({...deliveryForm, cross_delivery_reason: e.target.value})}
                  fullWidth
                  required
                  placeholder="Ex: Trabalhador original não disponível"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Observações"
                value={deliveryForm.notes}
                onChange={(e) => setDeliveryForm({...deliveryForm, notes: e.target.value})}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialog({ open: false })}>
            Cancelar
          </Button>
          <Button onClick={handleDelivery} variant="contained">
            Registrar Entrega
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

export default AnimalTracking;