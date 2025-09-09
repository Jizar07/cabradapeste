import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, IconButton, Alert, Grid, Divider
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  ContentCopy as ContentCopyIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const UserPaymentHistory = ({ userId, userName }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiptDialog, setReceiptDialog] = useState({ open: false, receipt: '', payment: null });

  useEffect(() => {
    if (userId) {
      loadUserPayments();
    }
  }, [userId]);

  const loadUserPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/usuarios/pagamentos?userId=${encodeURIComponent(userId)}`);
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.dados || []);
      } else {
        setError('Erro ao carregar histórico de pagamentos');
      }
    } catch (error) {
      console.error('Error loading user payments:', error);
      setError('Erro ao carregar histórico de pagamentos');
    } finally {
      setLoading(false);
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

  const totalPaid = payments.reduce((sum, p) => sum + (p.valor || 0), 0);

  if (loading) return <Typography>Carregando histórico de pagamentos...</Typography>;

  return (
    <Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        💰 Histórico de Pagamentos - {userName}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ bgcolor: 'primary.light', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ReceiptIcon fontSize="large" />
              <Typography variant="h5" sx={{ mt: 1 }}>
                {payments.length}
              </Typography>
              <Typography variant="body2">
                Pagamentos Totais
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ bgcolor: 'success.light', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <MoneyIcon fontSize="large" />
              <Typography variant="h5" sx={{ mt: 1 }}>
                ${totalPaid.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Total Recebido
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ bgcolor: 'warning.light', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <CalendarIcon fontSize="large" />
              <Typography variant="h5" sx={{ mt: 1 }}>
                {payments.filter(p => p.recibo_discord).length}
              </Typography>
              <Typography variant="body2">
                Com Recibos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadUserPayments}
        >
          Atualizar
        </Button>
      </Box>

      {/* Payment Table */}
      {payments.length === 0 ? (
        <Alert severity="info">
          Nenhum pagamento encontrado para este usuário.
        </Alert>
      ) : (
        <Paper elevation={1}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Data</strong></TableCell>
                  <TableCell><strong>Serviço</strong></TableCell>
                  <TableCell align="right"><strong>Valor</strong></TableCell>
                  <TableCell><strong>Itens</strong></TableCell>
                  <TableCell align="center"><strong>Recibo</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Typography variant="caption">
                        {payment.data_formatada || new Date(payment.timestamp).toLocaleString('pt-BR')}
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
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        ${(payment.valor || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="textSecondary">
                        {payment.detalhes?.length || 0} transações
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {payment.recibo_discord ? (
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleShowReceipt(payment)}
                          title="Ver Recibo"
                        >
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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
              {receiptDialog.payment.data_formatada || new Date(receiptDialog.payment.timestamp).toLocaleString('pt-BR')}
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

export default UserPaymentHistory;