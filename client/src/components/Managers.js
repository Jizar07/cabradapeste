import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SupervisorAccount as ManagerIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Grass as PlantIcon,
  Pets as AnimalIcon,
  Train as TrainIcon,
  Inventory2 as InventoryIcon,
  Warning as LiabilityIcon,
  Person as WorkerIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import MoneyFlowHistory from './MoneyFlowHistory';

const Managers = () => {
  const [managersData, setManagersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Manager liability viewing
  const [liabilityDialogOpen, setLiabilityDialogOpen] = useState(false);
  const [selectedManagerLiability, setSelectedManagerLiability] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    funcao: 'gerente',
    ativo: true,
    pagamento_semanal: ''
  });
  
  const [paymentForm, setPaymentForm] = useState({
    valor: '',
    descricao: 'Pagamento manual'
  });

  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  // Socket.io connection
  useEffect(() => {
    const socket = io(window.location.origin);
    
    socket.on('gerentes:atualizado', (data) => {
      console.log('Managers data updated via socket:', data);
      fetchManagersData();
    });

    socket.on('dashboard:atualizado', (data) => {
      if (data.saldo_atual !== undefined) {
        fetchManagersData();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch managers data
  const fetchManagersData = async () => {
    try {
      const response = await fetch('/api/managers');
      if (!response.ok) {
        throw new Error('Failed to fetch managers data');
      }
      const data = await response.json();
      if (data.success) {
        setManagersData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch managers data');
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      setError('Erro ao carregar dados dos gerentes');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchManagersData();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const method = editingManager ? 'PUT' : 'POST';
      const url = '/api/managers/add-edit';
      
      const submitData = {
        ...formData,
        userId: editingManager || 'manager_' + Date.now()
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(editingManager ? 'Gerente atualizado com sucesso!' : 'Gerente adicionado com sucesso!');
        setDialogOpen(false);
        setEditingManager(null);
        resetForm();
        fetchManagersData();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Erro ao processar solicitação');
      console.error('Error:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle payment
  const handlePayment = async (managerId, isAutomatic = false) => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const url = isAutomatic ? '/api/managers/payment/all' : '/api/managers/' + managerId + '/payment';
      const method = 'POST';
      const body = isAutomatic ? {} : paymentForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(result.message);
        if (!isAutomatic) {
          setPaymentDialogOpen(false);
          setPaymentForm({ valor: '', descricao: 'Pagamento manual' });
        }
        fetchManagersData();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Erro ao processar pagamento');
      console.error('Error:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Fetch payment history
  const fetchPaymentHistory = async (managerId) => {
    try {
      let url = '/api/managers/payment/history?limite=50';
      if (managerId) {
        url = '/api/managers/payment/history?managerId=' + managerId + '&limite=20';
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setPaymentHistory(result.data);
        setPaymentHistoryOpen(true);
      } else {
        setError('Erro ao carregar histórico de pagamentos');
      }
    } catch (error) {
      setError('Erro ao carregar histórico de pagamentos');
      console.error('Error:', error);
    }
  };


  // Fetch manager liability
  const fetchManagerLiability = async (managerId) => {
    try {
      const response = await fetch(`/api/managers/${managerId}/liability`);
      const result = await response.json();
      
      if (result.success) {
        setSelectedManagerLiability(result.data);
        setLiabilityDialogOpen(true);
      } else {
        setError('Erro ao carregar liability do gerente');
      }
    } catch (error) {
      setError('Erro ao carregar liability do gerente');
      console.error('Error:', error);
    }
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      nome: '',
      funcao: 'gerente',
      ativo: true,
      pagamento_semanal: ''
    });
  };


  const openEditDialog = (manager) => {
    setEditingManager(manager.id);
    setFormData({
      nome: manager.nome || '',
      funcao: manager.funcao || 'gerente',
      ativo: manager.ativo !== false,
      pagamento_semanal: manager.pagamento_semanal || ''
    });
    setDialogOpen(true);
  };

  const openPaymentDialog = (manager) => {
    setSelectedManager(manager);
    const suggestedAmount = managersData?.pagamentos?.[manager.id]?.valor_pagamento || 0;
    setPaymentForm({
      valor: suggestedAmount > 0.01 ? suggestedAmount.toFixed(2) : '',
      descricao: 'Pagamento baseado em workload'
    });
    setPaymentDialogOpen(true);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getServiceTypeIcon = (serviceType) => {
    switch (serviceType) {
      case 'plantacao': return <PlantIcon color="success" />;
      case 'animais': return <AnimalIcon color="primary" />;
      case 'ferroviaria': return <TrainIcon color="warning" />;
      case 'restock': return <InventoryIcon color="info" />;
      default: return <TrendingUpIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando dados dos gerentes...</Typography>
      </Box>
    );
  }

  if (!managersData) {
    return (
      <Box>
        <Alert severity="error">Erro ao carregar dados dos gerentes</Alert>
      </Box>
    );
  }

  const { 
    saldo_atual = 0, 
    capital_minimo = 10000, 
    fundos_disponiveis = 0, 
    workload_total = 0,
    gerentes = {},
    pagamentos = {},
    estatisticas = {}
  } = managersData;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center">
        <ManagerIcon sx={{ mr: 1 }} />
        Gerenciamento de Gerentes
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Saldo Fazenda</Typography>
              <Typography variant="h5" color={saldo_atual >= capital_minimo ? 'success.main' : 'error.main'}>
                {'$' + saldo_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2">Capital mínimo: {'$' + capital_minimo.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Fundos Disponíveis</Typography>
              <Typography variant="h5" color="primary">
                {'$' + fundos_disponiveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2">Para distribuição</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Gerentes Ativos</Typography>
              <Typography variant="h5">{estatisticas.gerentes_ativos || 0}</Typography>
              <Typography variant="body2">de {estatisticas.total_gerentes || 0} totais</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Workload Total</Typography>
              <Typography variant="h5" color="info.main">{workload_total.toFixed(1)}</Typography>
              <Typography variant="body2">pontos de atividade</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          Adicionar Gerente
        </Button>
        
        <Button
          variant="contained"
          color="success"
          startIcon={<PaymentIcon />}
          onClick={() => handlePayment(null, true)}
          disabled={processing || fundos_disponiveis < 0.01}
        >
          Pagar Todos ({fundos_disponiveis >= 0.01 ? '$' + fundos_disponiveis.toFixed(2) : 'Sem fundos'})
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => fetchPaymentHistory(null)}
        >
          Histórico Geral
        </Button>
      </Box>

      {/* Managers Cards */}
      <Grid container spacing={3}>
        {Object.values(gerentes).map((manager) => {
          const workload = manager.workload || {};
          const payment = pagamentos[manager.id] || {};
          
          return (
            <Grid item xs={12} key={manager.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" display="flex" alignItems="center">
                        <ManagerIcon sx={{ mr: 1 }} />
                        {manager.nome}
                        <Chip
                          label={manager.funcao}
                          color={manager.funcao === 'gerente' ? 'primary' : 'secondary'}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                        {manager.ativo === false && (
                          <Chip label="Inativo" color="error" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6} sm={4} md={2}>
                          <Typography variant="body2" color="textSecondary">Workload</Typography>
                          <Typography variant="h6">
                            {workload.pontos_total?.toFixed(1) || '0.0'} pts
                            {payment.percentual_workload > 0 && (
                              <Typography variant="caption" color="primary">
                                ({payment.percentual_workload}%)
                              </Typography>
                            )}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6} sm={4} md={2}>
                          <Typography variant="body2" color="textSecondary">Pagamento</Typography>
                          <Typography variant="h6" color={payment.valor_pagamento > 0 ? 'success.main' : 'text.secondary'}>
                            {'$' + (payment.valor_pagamento?.toFixed(2) || '0.00')}
                          </Typography>
                        </Grid>
                        
                        {/* New Ferrovia Profit Grid Item */}
                        <Grid item xs={6} sm={4} md={2}>
                          <Typography variant="body2" color="textSecondary">Lucro Ferrovia</Typography>
                          <Typography variant="h6" color={manager.ferrovia?.total_profit > 0 ? 'warning.main' : 'text.secondary'}>
                            {'$' + (manager.ferrovia?.total_profit?.toFixed(2) || '0.00')}
                          </Typography>
                          {manager.ferrovia?.transactions?.length > 0 && (
                            <Typography variant="caption" color="textSecondary">
                              {manager.ferrovia.transactions.length} transações
                            </Typography>
                          )}
                        </Grid>
                        
                        <Grid item xs={6} sm={4} md={2}>
                          <Typography variant="body2" color="textSecondary">Última Atividade</Typography>
                          <Typography variant="body2">
                            {workload.ultima_atividade ? 
                              formatTimestamp(workload.ultima_atividade) : 
                              'Nenhuma atividade'
                            }
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6} sm={4} md={2}>
                          <Typography variant="body2" color="textSecondary">Último Pagamento</Typography>
                          <Typography variant="body2">
                            {workload.ultimo_pagamento ? 
                              formatTimestamp(workload.ultimo_pagamento.timestamp) : 
                              'Nunca pago'
                            }
                          </Typography>
                        </Grid>
                        
                        {/* Ferrovia Last Transaction */}
                        <Grid item xs={6} sm={4} md={2}>
                          <Typography variant="body2" color="textSecondary">Último Ferrovia</Typography>
                          <Typography variant="body2">
                            {manager.ferrovia?.transactions?.[0] ? 
                              formatTimestamp(manager.ferrovia.transactions[0].timestamp) : 
                              'Nenhum'
                            }
                          </Typography>
                        </Grid>

                        {/* NEW: Money Flow Liability Indicator */}
                        <Grid item xs={6} sm={4} md={2}>
                          <Typography variant="body2" color="textSecondary">Liability</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" color={
                              manager.liability?.outstanding_amount > 500 ? 'error.main' :
                              manager.liability?.outstanding_amount > 200 ? 'warning.main' : 'success.main'
                            }>
                              ${manager.liability?.outstanding_amount?.toFixed(2) || '0.00'}
                            </Typography>
                            {manager.liability?.outstanding_amount > 200 && (
                              <LiabilityIcon 
                                color={manager.liability.outstanding_amount > 500 ? 'error' : 'warning'} 
                                fontSize="small" 
                              />
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => openEditDialog(manager)}
                      >
                        Editar
                      </Button>
                      
                      <Button
                        size="small"
                        startIcon={<PaymentIcon />}
                        color="success"
                        onClick={() => openPaymentDialog(manager)}
                        disabled={processing}
                      >
                        Pagar
                      </Button>
                      
                      
                      <Button
                        size="small"
                        startIcon={<LiabilityIcon />}
                        color="error"
                        onClick={() => fetchManagerLiability(manager.id)}
                        disabled={processing}
                      >
                        Liability
                      </Button>
                      
                      <Button
                        size="small"
                        startIcon={<HistoryIcon />}
                        onClick={() => fetchPaymentHistory(manager.id)}
                      >
                        Histórico
                      </Button>
                    </Box>
                  </Box>

                  {/* Ferrovia Transactions */}
                  {manager.ferrovia?.transactions?.length > 0 && (
                    <Accordion sx={{ mt: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <TrainIcon color="warning" />
                          <Typography>Transações Ferrovia ({manager.ferrovia.transactions.length})</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {manager.ferrovia.transactions.slice(0, 10).map((transaction, idx) => (
                            <ListItem key={transaction.id} sx={{ px: 0, py: 1 }}>
                              <ListItemText
                                primary={
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2">
                                      {transaction.numero_entregas} entregas • {transaction.caixas_utilizadas} caixas
                                    </Typography>
                                    <Typography variant="body2" color="warning.main" fontWeight="bold">
                                      ${transaction.profit_share.toFixed(2)}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="caption" color="textSecondary">
                                    {formatTimestamp(transaction.timestamp)} • Total profit: ${transaction.total_profit.toFixed(2)}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                          {manager.ferrovia.transactions.length > 10 && (
                            <Typography variant="caption" color="textSecondary" sx={{ px: 2 }}>
                              +{manager.ferrovia.transactions.length - 10} transações mais antigas...
                            </Typography>
                          )}
                        </List>
                        
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="warning.dark">
                            Total Acumulado: ${manager.ferrovia.total_profit.toFixed(2)}
                          </Typography>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Service Details */}
                  <Accordion sx={{ mt: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Detalhes dos Serviços</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {Object.entries(workload.servicos || {}).map(([serviceType, service]) => (
                          <Grid item xs={12} sm={6} md={3} key={serviceType}>
                            <Paper sx={{ p: 2 }}>
                              <Box display="flex" alignItems="center" mb={1}>
                                {getServiceTypeIcon(serviceType)}
                                <Typography variant="subtitle2" sx={{ ml: 1, textTransform: 'capitalize' }}>
                                  {serviceType}
                                </Typography>
                              </Box>
                              <Typography variant="h6">{service.quantidade || 0}</Typography>
                              <Typography variant="body2" color="textSecondary">
                                {service.pontos?.toFixed(1) || 0} pts
                              </Typography>
                              
                              {service.detalhes && service.detalhes.length > 0 && (
                                <List dense sx={{ mt: 1 }}>
                                  {service.detalhes.slice(0, 3).map((detalhe, idx) => (
                                    <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                                      <ListItemText
                                        primary={detalhe.item_display || detalhe.descricao || 'N/A'}
                                        secondary={(detalhe.quantidade || detalhe.valor || 'N/A') + ' - ' + formatTimestamp(detalhe.timestamp)}
                                        primaryTypographyProps={{ variant: 'caption' }}
                                        secondaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                                      />
                                    </ListItem>
                                  ))}
                                  {service.detalhes.length > 3 && (
                                    <Typography variant="caption" color="textSecondary">
                                      +{service.detalhes.length - 3} mais...
                                    </Typography>
                                  )}
                                </List>
                              )}
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Money Flow Transaction History */}
      <MoneyFlowHistory />

      {/* Add/Edit Manager Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingManager ? 'Editar Gerente' : 'Adicionar Gerente'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Função</InputLabel>
              <Select
                value={formData.funcao}
                onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                label="Função"
              >
                <MenuItem value="gerente">Gerente</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
              }
              label="Ativo"
              sx={{ mb: 2 }}
            />
            
            {formData.funcao === 'supervisor' && (
              <TextField
                fullWidth
                label="Pagamento Semanal ($)"
                type="number"
                value={formData.pagamento_semanal}
                onChange={(e) => setFormData({ ...formData, pagamento_semanal: e.target.value })}
                inputProps={{ step: '0.01', min: '0' }}
                sx={{ mb: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={processing}>
            {editingManager ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Processar Pagamento - {selectedManager?.nome}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Valor ($)"
            type="number"
            value={paymentForm.valor}
            onChange={(e) => setPaymentForm({ ...paymentForm, valor: e.target.value })}
            inputProps={{ step: '0.01', min: '0.01' }}
            required
            sx={{ mt: 2, mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Descrição"
            value={paymentForm.descricao}
            onChange={(e) => setPaymentForm({ ...paymentForm, descricao: e.target.value })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="body2" color="textSecondary">
            Fundos disponíveis: {'$' + fundos_disponiveis.toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => handlePayment(selectedManager?.id)}
            variant="contained"
            disabled={processing || !paymentForm.valor}
          >
            Processar Pagamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={paymentHistoryOpen} onClose={() => setPaymentHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Histórico de Pagamentos</DialogTitle>
        <DialogContent>
          {paymentHistory.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Gerente</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Descrição</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatTimestamp(payment.timestamp)}</TableCell>
                      <TableCell>{payment.manager_nome}</TableCell>
                      <TableCell>{'$' + payment.valor.toFixed(2)}</TableCell>
                      <TableCell>{payment.descricao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>Nenhum pagamento encontrado.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentHistoryOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>


      {/* Manager Liability Dialog */}
      <Dialog open={liabilityDialogOpen} onClose={() => setLiabilityDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LiabilityIcon color="error" />
            Liability - {selectedManagerLiability?.manager_nome}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedManagerLiability && (
            <Box>
              {/* Outstanding Amount */}
              <Card sx={{ mb: 3, bgcolor: selectedManagerLiability.outstanding_amount > 200 ? 'error.light' : 'success.light' }}>
                <CardContent>
                  <Typography variant="h4" color={selectedManagerLiability.outstanding_amount > 200 ? 'error.main' : 'success.main'}>
                    ${selectedManagerLiability.outstanding_amount?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="subtitle1">
                    Liability Pendente
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedManagerLiability.outstanding_amount > 500 && '🚨 Liability muito alta!'}
                    {selectedManagerLiability.outstanding_amount > 200 && selectedManagerLiability.outstanding_amount <= 500 && '⚠️ Liability moderada'}
                    {selectedManagerLiability.outstanding_amount <= 200 && '✅ Liability baixa'}
                  </Typography>
                </CardContent>
              </Card>

              {/* Outstanding Withdrawals */}
              {selectedManagerLiability.withdrawals?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Saques Pendentes</Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Valor</TableCell>
                          <TableCell>Razão</TableCell>
                          <TableCell>Pago para Workers</TableCell>
                          <TableCell>Restante</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedManagerLiability.withdrawals
                          .filter(w => w.remaining_liability > 0)
                          .map((withdrawal) => (
                          <TableRow key={withdrawal.withdrawal_id}>
                            <TableCell>{formatTimestamp(withdrawal.timestamp)}</TableCell>
                            <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                            <TableCell>{withdrawal.reason}</TableCell>
                            <TableCell>${withdrawal.amount_paid_to_workers.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                label={`$${withdrawal.remaining_liability.toFixed(2)}`}
                                color={withdrawal.remaining_liability > 100 ? 'error' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Recent Worker Payments */}
              {selectedManagerLiability.recent_payments?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Pagamentos Recentes para Workers</Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Worker</TableCell>
                          <TableCell>Valor</TableCell>
                          <TableCell>Saque Vinculado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedManagerLiability.recent_payments.slice(0, 5).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatTimestamp(payment.timestamp)}</TableCell>
                            <TableCell>{payment.worker_nome}</TableCell>
                            <TableCell>${payment.valor.toFixed(2)}</TableCell>
                            <TableCell>
                              {payment.withdrawal_id ? (
                                <Chip label="Vinculado" color="success" size="small" />
                              ) : (
                                <Chip label="Não vinculado" color="default" size="small" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Alerts */}
              {selectedManagerLiability.alerts?.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>Alertas</Typography>
                  {selectedManagerLiability.alerts.map((alert) => (
                    <Alert key={alert.id} severity="error" sx={{ mb: 1 }}>
                      {alert.message}
                    </Alert>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLiabilityDialogOpen(false)}>Fechar</Button>
          <Button 
            onClick={() => {
              setLiabilityDialogOpen(false);
              // Note: Money flow tracking is now handled by MoneyFlowHistory component
            }}
            variant="contained"
            color="secondary"
            startIcon={<WorkerIcon />}
            disabled
          >
            Ver MoneyFlowHistory
          </Button>
        </DialogActions>
      </Dialog>

      {processing && <LinearProgress sx={{ mt: 2 }} />}
    </Box>
  );
};

export default Managers;