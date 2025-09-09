import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  AccountBalance as BalanceIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`analytics-tabpanel-${index}`}
    aria-labelledby={`analytics-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const Analytics = () => {
  const socket = useSocket();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    dashboard: {},
    inventory: {},
    users: {},
    financial: {}
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [dashboardRes, inventoryRes, usersRes, financialRes] = await Promise.all([
        fetch('http://localhost:8084/api/analytics/dashboard'),
        fetch('http://localhost:8084/api/analytics/inventory'),
        fetch('http://localhost:8084/api/analytics/users'),
        fetch('http://localhost:8084/api/analytics/financial')
      ]);

      const [dashboard, inventory, users, financial] = await Promise.all([
        dashboardRes.json(),
        inventoryRes.json(),
        usersRes.json(),
        financialRes.json()
      ]);

      setAnalytics({ dashboard, inventory, users, financial });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${(value || 0).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Dashboard Overview Tab
  const DashboardOverview = () => (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          📊 Métricas Principais
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InventoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Itens no Inventário
              </Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {analytics.dashboard.inventory?.totalItems || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {analytics.dashboard.inventory?.totalQuantity || 0} unidades totais
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PeopleIcon color="secondary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Usuários Ativos
              </Typography>
            </Box>
            <Typography variant="h4" color="secondary">
              {analytics.dashboard.users?.totalUsers || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {analytics.dashboard.users?.managers || 0} gerentes, {analytics.dashboard.users?.workers || 0} trabalhadores
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AssessmentIcon color="info" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Total de Transações
              </Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {analytics.dashboard.transactions?.total || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Últimas 24h: {(analytics.dashboard.transactions?.recent || []).length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <BalanceIcon color="success" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Saldo Atual
              </Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {formatCurrency(analytics.dashboard.balance?.current)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {(analytics.dashboard.balance?.recentActivity || []).length} transações recentes
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🕐 Atividade Recente
          </Typography>
          <List>
            {(analytics.dashboard.transactions?.recent || []).slice(0, 5).map((transaction, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {transaction.action === 'add' ? 
                    <TrendingUpIcon color="success" /> : 
                    <TrendingDownIcon color="error" />
                  }
                </ListItemIcon>
                <ListItemText
                  primary={`${transaction.action === 'add' ? 'Adicionado' : 'Removido'} ${transaction.quantity}x ${transaction.item}`}
                  secondary={`${transaction.author} - ${formatDate(transaction.timestamp)}`}
                />
              </ListItem>
            ))}
            {(analytics.dashboard.transactions?.recent || []).length === 0 && (
              <ListItem>
                <ListItemText primary="Nenhuma atividade recente" />
              </ListItem>
            )}
          </List>
        </Paper>
      </Grid>

      {/* Quick Stats */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Status do Sistema
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <StarIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Sistema Online"
                secondary="Funcionando normalmente"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ScheduleIcon color="info" />
              </ListItemIcon>
              <ListItemText
                primary="Última Atualização"
                secondary={formatDate(analytics.dashboard.inventory?.lastUpdated)}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <AssessmentIcon color="secondary" />
              </ListItemIcon>
              <ListItemText
                primary="Webhook Ativo"
                secondary="Conectado e funcionando"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  // Inventory Analytics Tab
  const InventoryAnalytics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          📦 Análise de Inventário
        </Typography>
      </Grid>

      {/* Inventory Summary */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Valor Total do Inventário
            </Typography>
            <Typography variant="h4" color="success.main">
              {formatCurrency(analytics.inventory.summary?.totalValue)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Itens com Estoque Baixo
            </Typography>
            <Typography variant="h4" color="warning.main">
              {(analytics.inventory.lowStockItems || []).length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Atividade (7 dias)
            </Typography>
            <Typography variant="h4" color="info.main">
              {(analytics.inventory.activityTrend || []).reduce((sum, day) => sum + day.transactions, 0)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Items */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🏆 Itens Mais Valiosos
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                  <TableCell align="right">Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(analytics.inventory.topItems || []).slice(0, 5).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Low Stock Alert */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            ⚠️ Estoque Baixo
          </Typography>
          {(analytics.inventory.lowStockItems || []).length > 0 ? (
            <List>
              {analytics.inventory.lowStockItems.slice(0, 5).map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={`Quantidade: ${item.quantity}`}
                  />
                  <Chip 
                    label="Baixo" 
                    color="warning" 
                    size="small" 
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="success">
              Todos os itens têm estoque adequado!
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  // User Analytics Tab
  const UserAnalytics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          👥 Análise de Usuários
        </Typography>
      </Grid>

      {/* User Summary */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Usuários Ativos
            </Typography>
            <Typography variant="h4" color="primary">
              {analytics.users.summary?.activeUsers || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total de Usuários
            </Typography>
            <Typography variant="h4" color="secondary">
              {analytics.users.summary?.totalUsers || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Gerentes
            </Typography>
            <Typography variant="h4" color="info.main">
              {analytics.users.summary?.managers || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Trabalhadores
            </Typography>
            <Typography variant="h4" color="success.main">
              {analytics.users.summary?.workers || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Active Users */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🌟 Usuários Mais Ativos
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell align="right">Transações</TableCell>
                  <TableCell align="center">Função</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(analytics.users.topActiveUsers || []).slice(0, 5).map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>{user.displayName}</TableCell>
                    <TableCell align="right">{user.totalTransactions}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={user.role === 'manager' ? 'Gerente' : 'Trabalhador'}
                        color={user.role === 'manager' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Recent User Activity */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🕐 Atividade Recente de Usuários
          </Typography>
          <List>
            {(analytics.users.recentActivity || []).slice(0, 5).map((user, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <PeopleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={user.displayName}
                  secondary={`Última atividade: ${formatDate(user.lastActivity)}`}
                />
                <Chip
                  label={user.role === 'manager' ? 'Gerente' : 'Trabalhador'}
                  color={user.role === 'manager' ? 'primary' : 'default'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  // Financial Analytics Tab
  const FinancialAnalytics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          💰 Análise Financeira
        </Typography>
      </Grid>

      {/* Financial Summary */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Saldo Atual
            </Typography>
            <Typography variant="h4" color="success.main">
              {formatCurrency(analytics.financial.summary?.currentBalance)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total de Depósitos
            </Typography>
            <Typography variant="h4" color="primary">
              {formatCurrency(analytics.financial.summary?.totalDeposits)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total de Saques
            </Typography>
            <Typography variant="h4" color="error.main">
              {formatCurrency(analytics.financial.summary?.totalWithdrawals)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Mudança Líquida
            </Typography>
            <Typography 
              variant="h4" 
              color={analytics.financial.summary?.netChange >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(analytics.financial.summary?.netChange)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Financial Activity */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            💳 Atividade Financeira Recente
          </Typography>
          {(analytics.financial.recentActivity || []).length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell>Descrição</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.financial.recentActivity.slice(0, 10).map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.action === 'deposit' ? 'Depósito' : 'Saque'}
                          color={transaction.action === 'deposit' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={transaction.action === 'deposit' ? 'success.main' : 'error.main'}
                          sx={{ fontWeight: 500 }}
                        >
                          {transaction.action === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{transaction.description || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              Nenhuma atividade financeira recente encontrada.
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          📈 Analíticas e Relatórios
        </Typography>
        <IconButton onClick={loadAnalytics} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="📊 Visão Geral" />
          <Tab label="📦 Inventário" />
          <Tab label="👥 Usuários" />
          <Tab label="💰 Financeiro" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <DashboardOverview />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <InventoryAnalytics />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <UserAnalytics />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <FinancialAnalytics />
      </TabPanel>
    </Box>
  );
};

export default Analytics;