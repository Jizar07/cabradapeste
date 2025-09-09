import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  TablePagination,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Edit as EditIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  AccountBalance as WithdrawIcon,
  AttachMoney as DepositIcon,
  Person as WorkerIcon,
  TrendingUp as AnalyticsIcon,
  CheckCircle as VerifiedIcon,
  Warning as PendingIcon,
  Error as DisputedIcon,
  Add as AddIcon
} from '@mui/icons-material';

const MoneyFlowHistory = () => {
  const socket = useContext(SocketContext);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Filtering
  const [filters, setFilters] = useState({
    search: '',
    manager: '',
    type: '',
    category: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc'); // newest first by default
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({
    razao: '',
    categoria: '',
    status: '',
    notes: ''
  });


  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalWithdrawals: 0,
    totalDeposits: 0,
    totalWorkerPayments: 0,
    outstandingLiability: 0,
    transactionsByCategory: {},
    managerSummary: {}
  });

  // Fetch Discord financial transactions directly
  const fetchMoneyFlowData = async () => {
    try {
      setLoading(true);
      
      // Fetch Discord transactions directly
      const response = await fetch('/api/discord-logs');
      const result = await response.json();

      // Fetch managers list to filter transactions
      const managersResponse = await fetch('/api/managers');
      const managersResult = await managersResponse.json();
      
      if (result.success && result.data.atividades_recentes && managersResult.success) {
        // Get list of manager names
        const managerNames = Object.values(managersResult.data.gerentes || {}).map(m => m.nome);
        
        // Filter for financial transactions from MANAGERS ONLY and EXCLUDE $160 animal deposits
        const financialTransactions = result.data.atividades_recentes
          .filter(t => t.categoria === 'financeiro' && (t.tipo === 'saque' || t.tipo === 'deposito'))
          .filter(t => !(t.tipo === 'deposito' && Math.abs(t.valor - 160) < 0.01)) // EXCLUDE $160 deposits completely
          .map(t => ({
            ...t,
            // Extract manager name from author field
            manager_nome: t.autor.split(' | ')[0].trim(),
            // Add custom editable fields if they don't exist
            custom_razao: t.custom_razao || '',
            custom_categoria: t.custom_categoria || (t.tipo === 'deposito' ? 'revenue' : 'outros'),
            custom_status: t.custom_status || 'pending',
            custom_notes: t.custom_notes || ''
          }))
          .filter(t => managerNames.includes(t.manager_nome)) // ONLY SHOW MANAGER TRANSACTIONS
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
        
        setTransactions(financialTransactions);
        setFilteredTransactions(financialTransactions);
        
        // Calculate analytics (all deposits are now regular since $160 are completely excluded)
        const withdrawals = financialTransactions.filter(t => t.tipo === 'saque');
        const deposits = financialTransactions.filter(t => t.tipo === 'deposito');
        
        const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.valor, 0);
        const totalDeposits = deposits.reduce((sum, t) => sum + t.valor, 0);
        
        // Calculate liability (withdrawals that haven't been justified)
        const unjustifiedWithdrawals = withdrawals.filter(t => 
          !t.custom_razao || t.custom_status === 'pending'
        );
        const outstandingLiability = unjustifiedWithdrawals.reduce((sum, t) => sum + t.valor, 0);
        
        // Calculate accountability percentage
        const justifiedWithdrawals = totalWithdrawals - outstandingLiability;
        const accountabilityPercentage = totalWithdrawals > 0 ? 
          (justifiedWithdrawals / totalWithdrawals) * 100 : 100;
        
        // Calculate manager-specific summaries
        const managerSummary = {};
        const activeManagerNames = [...new Set(financialTransactions.map(t => t.manager_nome))];
        
        activeManagerNames.forEach(managerName => {
          const managerTransactions = financialTransactions.filter(t => t.manager_nome === managerName);
          const managerWithdrawals = managerTransactions.filter(t => t.tipo === 'saque');
          const managerDeposits = managerTransactions.filter(t => t.tipo === 'deposito');
          
          const totalWithdrawn = managerWithdrawals.reduce((sum, t) => sum + t.valor, 0);
          const totalDeposited = managerDeposits.reduce((sum, t) => sum + t.valor, 0);
          
          // Calculate liability for this manager
          const unjustifiedWithdrawals = managerWithdrawals.filter(t => 
            !t.custom_razao || t.custom_status === 'pending'
          );
          const managerLiability = unjustifiedWithdrawals.reduce((sum, t) => sum + t.valor, 0);
          
          // Recent transactions (last 5)
          const recentTransactions = managerTransactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
          
          managerSummary[managerName] = {
            totalWithdrawn,
            totalDeposited,
            netFlow: totalDeposited - totalWithdrawn,
            liability: managerLiability,
            transactionCount: managerTransactions.length,
            recentTransactions,
            accountabilityPercentage: totalWithdrawn > 0 ? 
              ((totalWithdrawn - managerLiability) / totalWithdrawn) * 100 : 100
          };
        });

        setAnalytics({
          totalWithdrawals,
          totalDeposits,
          totalWorkerPayments: 0, // Not tracking separately yet
          outstandingLiability,
          accountabilityPercentage,
          managerSummary
        });
      } else {
        setError('Erro ao carregar dados do Discord');
      }
    } catch (error) {
      setError('Erro ao carregar histórico de transações');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoneyFlowData();

    // Set up real-time Socket.io listeners for SEAMLESS updates
    if (socket) {
      socket.on('discord_transaction:updated', (data) => {
        console.log('🔄 Discord transaction updated:', data);
        // Update specific transaction in-place instead of refetching everything
        setTransactions(prev => prev.map(t => 
          t.id === data.transactionId ? { ...t, ...data.transaction } : t
        ));
        setFilteredTransactions(prev => prev.map(t => 
          t.id === data.transactionId ? { ...t, ...data.transaction } : t
        ));
      });

      socket.on('atividades:atualizado', (data) => {
        console.log('📝 Discord activities updated:', data);
        // Only refresh if it's a financial transaction from a manager
        if (data.categoria === 'financeiro' && (data.tipo === 'saque' || data.tipo === 'deposito')) {
          // Check if it's a $160 deposit (exclude completely)
          if (data.tipo === 'deposito' && Math.abs(data.valor - 160) < 0.01) {
            return; // Ignore $160 deposits
          }
          
          // Only add if it's from a manager (we'll need to check this)
          fetchMoneyFlowData(); // Only fetch for new financial transactions
        }
      });

      // Cleanup listeners on unmount
      return () => {
        if (socket) {
          socket.off('discord_transaction:updated');
          socket.off('atividades:atualizado');
        }
      };
    }
  }, [socket]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...transactions];

    // Apply filters
    if (filters.search) {
      filtered = filtered.filter(t => 
        t.custom_razao?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.descricao?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.manager_nome?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.manager) {
      filtered = filtered.filter(t => t.manager_nome === filters.manager);
    }

    if (filters.type) {
      filtered = filtered.filter(t => t.tipo === filters.type);
    }

    if (filters.category) {
      filtered = filtered.filter(t => t.custom_categoria === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter(t => t.custom_status === filters.status);
    }

    // Date filtering
    if (filters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.timestamp) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(t => new Date(t.timestamp) <= new Date(filters.dateTo));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'manager_nome':
          comparison = a.manager_nome.localeCompare(b.manager_nome);
          break;
        case 'valor':
          comparison = a.valor - b.valor;
          break;
        case 'tipo':
          comparison = a.tipo.localeCompare(b.tipo);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredTransactions(filtered);
    setPage(0); // Reset to first page when filtering
  }, [transactions, filters, sortBy, sortOrder]);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  // Get transaction type icon
  const getTransactionIcon = (type) => {
    switch (type) {
      case 'saque': return <WithdrawIcon color="warning" />;
      case 'deposito': return <DepositIcon color="success" />;
      case 'worker_payment': return <WorkerIcon color="info" />;
      default: return <AnalyticsIcon />;
    }
  };

  // Get transaction type display name  
  const getTransactionTypeDisplay = (type) => {
    switch (type) {
      case 'saque': return 'Saque';
      case 'deposito': return 'Depósito';
      case 'worker_payment': return 'Pagamento Worker';
      default: return type;
    }
  };

  // Handle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Handle edit transaction
  const openEditDialog = (transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      razao: transaction.custom_razao || '',
      categoria: transaction.custom_categoria || '',
      status: transaction.custom_status || 'pending',
      notes: transaction.custom_notes || ''
    });
    setEditDialogOpen(true);
  };

  // Save transaction edit
  const saveTransactionEdit = async () => {
    try {
      const response = await fetch(`/api/discord-logs/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_razao: editForm.razao,
          custom_categoria: editForm.categoria,
          custom_status: editForm.status,
          custom_notes: editForm.notes
        })
      });

      const result = await response.json();
      if (result.success) {
        setEditDialogOpen(false);
        setEditingTransaction(null);
        fetchMoneyFlowData(); // Refresh data to show updates
      } else {
        setError(result.error || 'Erro ao salvar alterações');
      }
    } catch (error) {
      setError('Erro ao salvar alterações');
      console.error('Error:', error);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data/Hora', 'Gerente', 'Tipo', 'Valor', 'Razão', 'Categoria', 'Status'];
    const csvData = [
      headers,
      ...filteredTransactions.map(t => [
        formatTimestamp(t.timestamp),
        t.manager_nome,
        getTransactionTypeDisplay(t.type),
        t.valor.toFixed(2),
        t.razao || 'Sem razão',
        t.categoria || 'N/A',
        t.status || 'active'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_dinheiro_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <VerifiedIcon color="success" />;
      case 'pending': return <PendingIcon color="warning" />;
      case 'disputed': return <DisputedIcon color="error" />;
      default: return <PendingIcon color="action" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando histórico de transações...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AnalyticsIcon />
        Histórico de Fluxo de Dinheiro
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Analytics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Saques</Typography>
              <Typography variant="h5" color="warning.main">
                ${analytics.totalWithdrawals.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Depósitos</Typography>
              <Typography variant="h5" color="success.main">
                ${analytics.totalDeposits.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Liability Pendente</Typography>
              <Typography variant="h5" color="error.main">
                ${analytics.outstandingLiability.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Accountability</Typography>
              <Typography variant="h5" color={analytics.accountabilityPercentage > 80 ? 'success.main' : 'warning.main'}>
                {analytics.accountabilityPercentage.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manager Summaries */}
      {analytics.managerSummary && Object.keys(analytics.managerSummary).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Resumo por Gerente</Typography>
            <Grid container spacing={2}>
              {Object.entries(analytics.managerSummary).map(([managerName, summary]) => (
                <Grid item xs={12} md={6} lg={4} key={managerName}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>{managerName}</Typography>
                      
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Saques</Typography>
                          <Typography variant="h6" color="error.main">
                            ${summary.totalWithdrawn.toFixed(2)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Depósitos</Typography>
                          <Typography variant="h6" color="success.main">
                            ${summary.totalDeposited.toFixed(2)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Fluxo Líquido</Typography>
                          <Typography variant="h6" color={summary.netFlow >= 0 ? 'success.main' : 'error.main'}>
                            ${summary.netFlow.toFixed(2)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Liability</Typography>
                          <Typography variant="h6" color={summary.liability > 200 ? 'error.main' : 'warning.main'}>
                            ${summary.liability.toFixed(2)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="body2" color="textSecondary">Accountability</Typography>
                          <Typography variant="h6" color={summary.accountabilityPercentage > 80 ? 'success.main' : 'warning.main'}>
                            {summary.accountabilityPercentage.toFixed(1)}%
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="caption" color="textSecondary">
                            {summary.transactionCount} transações • 
                            Última: {summary.recentTransactions[0] ? 
                              formatTimestamp(summary.recentTransactions[0].timestamp) : 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Filtros</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Buscar"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="saque">Saque</MenuItem>
                  <MenuItem value="deposito">Depósito</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="verified">Verificado</MenuItem>
                  <MenuItem value="pending">Pendente</MenuItem>
                  <MenuItem value="disputed">Disputado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Data Inicial"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Data Final"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchMoneyFlowData}
              >
                Atualizar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Transações ({filteredTransactions.length})
            </Typography>
            <Button 
              startIcon={<ExportIcon />} 
              variant="outlined" 
              size="small"
              onClick={exportToCSV}
            >
              Exportar CSV
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    onClick={() => handleSort('timestamp')}
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <Box display="flex" alignItems="center">
                      Data/Hora
                      <SortIcon fontSize="small" />
                    </Box>
                  </TableCell>
                  
                  <TableCell 
                    onClick={() => handleSort('manager_nome')}
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <Box display="flex" alignItems="center">
                      Gerente
                      <SortIcon fontSize="small" />
                    </Box>
                  </TableCell>
                  
                  <TableCell>Tipo</TableCell>
                  
                  <TableCell 
                    onClick={() => handleSort('valor')}
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                    align="right"
                  >
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      Valor
                      <SortIcon fontSize="small" />
                    </Box>
                  </TableCell>
                  
                  <TableCell>Descrição Discord</TableCell>
                  <TableCell>Razão Customizada</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {filteredTransactions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatTimestamp(transaction.timestamp)}</TableCell>
                    <TableCell>
                      {transaction.manager_nome}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getTransactionIcon(transaction.tipo)}
                        {getTransactionTypeDisplay(transaction.tipo)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={transaction.tipo === 'saque' ? 'error.main' : 'success.main'}
                        fontWeight="bold"
                      >
                        ${transaction.valor.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {transaction.descricao}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {transaction.custom_razao ? (
                        <Typography variant="body2">
                          {transaction.custom_razao}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="textSecondary" fontStyle="italic">
                          Clique para adicionar razão
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.custom_categoria || 'N/A'} 
                        size="small" 
                        variant="outlined"
                        color="default"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(transaction.custom_status)}
                        <Typography variant="caption">
                          {transaction.custom_status || 'pending'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Editar Razão/Categoria">
                        <IconButton size="small" onClick={() => openEditDialog(transaction)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredTransactions.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Linhas por página:"
          />
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Transação</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Razão"
              value={editForm.razao}
              onChange={(e) => setEditForm({ ...editForm, razao: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={editForm.categoria}
                onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                label="Categoria"
              >
                <MenuItem value="worker_payments">Pagamentos para Workers</MenuItem>
                <MenuItem value="restock_animals">Restock - Animais</MenuItem>
                <MenuItem value="restock_seeds">Restock - Sementes</MenuItem>
                <MenuItem value="operational">Despesas Operacionais</MenuItem>
                <MenuItem value="outros">Outros</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="verified">Verificado</MenuItem>
                <MenuItem value="pending">Pendente</MenuItem>
                <MenuItem value="disputed">Disputado</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notas"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              multiline
              rows={2}
              placeholder="Adicionar notas ou justificativas..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={saveTransactionEdit} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default MoneyFlowHistory;