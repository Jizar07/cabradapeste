import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, IconButton, FormControl, InputLabel, Select, MenuItem, TextField, Alert, Grid
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  ContentCopy as ContentCopyIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiptDialog, setReceiptDialog] = useState({ open: false, receipt: '', payment: null });
  const [userFilter, setUserFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usuarios/pagamentos');
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.dados || []);
      } else {
        setError('Erro ao carregar histórico de pagamentos');
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setError('Erro ao carregar histórico de pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const updateHistoricalReceipts = async () => {
    try {
      const response = await fetch('/api/usuarios/pagamentos/atualizar-recibos', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.mensagem);
        await loadPayments(); // Reload to show updated receipts
      } else {
        alert('Erro ao atualizar recibos');
      }
    } catch (error) {
      console.error('Error updating receipts:', error);
      alert('Erro ao atualizar recibos');
    }
  };

  const handleShowReceipt = (payment) => {
    setReceiptDialog({
      open: true,
      receipt: payment.recibo_discord || 'Recibo não disponível',
      payment: payment
    });
  };

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(receiptDialog.receipt)
      .then(() => {
        alert('Recibo copiado para a área de transferência!');
      })
      .catch(err => {
        console.error('Failed to copy receipt:', err);
        alert('Erro ao copiar recibo');
      });
  };

  const getServiceTypeLabel = (tipo) => {
    const types = {
      'plantacao': '🌾 Plantação',
      'plantacao_individual': '🌱 Plantação (Individual)',
      'animais': '🐄 Animais',
      'animais_individual': '🐮 Animais (Individual)',
      'todos': '📦 Todos os Serviços'
    };
    return types[tipo] || tipo;
  };

  const getServiceTypeColor = (tipo) => {
    if (tipo.includes('plantacao')) return 'success';
    if (tipo.includes('animais')) return 'warning';
    if (tipo === 'todos') return 'primary';
    return 'default';
  };

  const getFilteredPayments = () => {
    return payments.filter(payment => {
      const matchesUser = !userFilter || 
        (payment.usuario_id && payment.usuario_id.toLowerCase().includes(userFilter.toLowerCase()));
      const matchesService = serviceFilter === 'all' || 
        payment.tipo_servico === serviceFilter;
      const matchesDate = !dateFilter || 
        (payment.timestamp && payment.timestamp.includes(dateFilter));
      
      return matchesUser && matchesService && matchesDate;
    });
  };

  const totalPaid = getFilteredPayments().reduce((sum, p) => sum + (p.valor || 0), 0);

  if (loading) return <Typography>Carregando histórico...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        💰 Histórico de Pagamentos
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ReceiptIcon fontSize="large" color="primary" />
              <Typography variant="h4" color="primary.main" sx={{ mt: 1 }}>
                {getFilteredPayments().length}
              </Typography>
              <Typography color="textSecondary">
                Total de Pagamentos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MoneyIcon fontSize="large" color="success" />
              <Typography variant="h4" color="success.main" sx={{ mt: 1 }}>
                ${totalPaid.toFixed(2)}
              </Typography>
              <Typography color="textSecondary">
                Total Pago
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon fontSize="large" color="info" />
              <Typography variant="h4" color="info.main" sx={{ mt: 1 }}>
                {[...new Set(getFilteredPayments().map(p => p.usuario_id))].length}
              </Typography>
              <Typography color="textSecondary">
                Usuários Únicos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CalendarIcon fontSize="large" color="warning" />
              <Typography variant="h4" color="warning.main" sx={{ mt: 1 }}>
                {getFilteredPayments().filter(p => p.recibo_discord).length}
              </Typography>
              <Typography color="textSecondary">
                Com Recibos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>🔍 Filtros</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Filtrar por Usuário"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="ID ou nome do usuário"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Serviço</InputLabel>
                <Select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  label="Tipo de Serviço"
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="plantacao">Plantação</MenuItem>
                  <MenuItem value="animais">Animais</MenuItem>
                  <MenuItem value="todos">Todos os Serviços</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Filtrar por Data"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadPayments}
                  size="small"
                >
                  Atualizar
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={updateHistoricalReceipts}
                  size="small"
                >
                  Gerar Recibos
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Data</strong></TableCell>
                <TableCell><strong>Usuário</strong></TableCell>
                <TableCell><strong>Serviço</strong></TableCell>
                <TableCell align="right"><strong>Valor</strong></TableCell>
                <TableCell><strong>Transações</strong></TableCell>
                <TableCell align="center"><strong>Recibo</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredPayments().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary" sx={{ py: 4 }}>
                      Nenhum pagamento encontrado com os filtros aplicados
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredPayments().map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {payment.data_formatada || new Date(payment.timestamp).toLocaleString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {payment.usuario_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getServiceTypeLabel(payment.tipo_servico)}
                        color={getServiceTypeColor(payment.tipo_servico)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        ${(payment.valor || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {payment.detalhes?.length || 0} itens
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {payment.recibo_discord ? (
                        <IconButton
                          color="primary"
                          onClick={() => handleShowReceipt(payment)}
                          title="Ver Recibo"
                        >
                          <ReceiptIcon />
                        </IconButton>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Sem recibo
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Receipt Dialog */}
      <Dialog 
        open={receiptDialog.open} 
        onClose={() => setReceiptDialog({ open: false, receipt: '', payment: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          💰 Recibo de Pagamento
          {receiptDialog.payment && (
            <Typography variant="subtitle2" color="textSecondary">
              ID: {receiptDialog.payment.id}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            backgroundColor: '#2e2e2e', 
            color: '#ffffff', 
            p: 2, 
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre',
            overflowX: 'auto'
          }}>
            {receiptDialog.receipt.replace(/```/g, '')}
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Copie este recibo e cole no Discord para registro oficial do pagamento.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCopyReceipt}
            variant="contained"
            color="primary"
            startIcon={<ContentCopyIcon />}
          >
            Copiar Recibo
          </Button>
          <Button onClick={() => setReceiptDialog({ open: false, receipt: '', payment: null })}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentHistory;