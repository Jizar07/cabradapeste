import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Snackbar,
  TableSortLabel,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
  Divider,
  Collapse,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as AttachMoneyIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ViewList as ViewListIcon,
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon,
  Receipt as ReceiptIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';
import PlantTracker from './PlantTracker';
import TransactionAnalysis from './TransactionAnalysis';

// Enhanced MetricCard Component for Professional Look
const MetricCard = ({ title, value, icon, color = 'primary', loading = false, subtitle, trend }) => (
  <Card 
    elevation={3}
    component="article"
    role="img"
    aria-label={`${title}: ${value}`}
    sx={{ 
      height: '100%',
      background: `linear-gradient(135deg, ${color === 'primary' ? '#1976d2' : 
                                                color === 'secondary' ? '#9c27b0' :
                                                color === 'success' ? '#2e7d32' :
                                                color === 'warning' ? '#ed6c02' : 
                                                color === 'error' ? '#d32f2f' : '#1976d2'}20 0%, transparent 100%)`,
      border: `1px solid ${color === 'primary' ? '#1976d2' : 
                          color === 'secondary' ? '#9c27b0' :
                          color === 'success' ? '#2e7d32' :
                          color === 'warning' ? '#ed6c02' : 
                          color === 'error' ? '#d32f2f' : '#1976d2'}30`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 25px ${color === 'primary' ? '#1976d2' : 
                                  color === 'secondary' ? '#9c27b0' :
                                  color === 'success' ? '#2e7d32' :
                                  color === 'warning' ? '#ed6c02' : 
                                  color === 'error' ? '#d32f2f' : '#1976d2'}40`
      }
    }}
  >
    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="overline" 
            component="h3"
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 600, 
              letterSpacing: '0.5px',
              lineHeight: 1
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h3" 
            component="div" 
            sx={{ 
              color: `${color}.main`, 
              fontWeight: 700,
              mt: 1,
              lineHeight: 1.2
            }}
          >
            {loading ? <CircularProgress size={32} thickness={4} /> : value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ 
          color: `${color}.main`, 
          opacity: 0.8,
          ml: 2,
          fontSize: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '48px',
          minHeight: '48px'
        }}>
          {icon}
        </Box>
      </Box>
      {trend && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          backgroundColor: trend.type === 'up' ? 'success.light' : 
                          trend.type === 'down' ? 'error.light' : 'info.light',
          color: trend.type === 'up' ? 'success.contrastText' : 
                 trend.type === 'down' ? 'error.contrastText' : 'info.contrastText',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          {trend.type === 'up' ? '↗' : trend.type === 'down' ? '↘' : '→'} {trend.value}
        </Box>
      )}
    </CardContent>
  </Card>
);

const Users = () => {
  const socket = useSocket();
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    funcao: 'trabalhador'
  });
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userServices, setUserServices] = useState([]);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [showPaidTransactions, setShowPaidTransactions] = useState(false);
  const [showPlantPaidTransactions, setShowPlantPaidTransactions] = useState(false);
  const [showAnimalPaidTransactions, setShowAnimalPaidTransactions] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [abuseActions, setAbuseActions] = useState({}); // Track ignored/charged items
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [paidTransactionsSortBy, setPaidTransactionsSortBy] = useState('date');
  const [paidTransactionsSortOrder, setPaidTransactionsSortOrder] = useState('desc');
  const [receiptDialog, setReceiptDialog] = useState({ open: false, receipt: '' });
  const [animalServicesSortBy, setAnimalServicesSortBy] = useState('date');
  const [animalServicesSortOrder, setAnimalServicesSortOrder] = useState('desc');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editData, setEditData] = useState({});
  const [addingActivity, setAddingActivity] = useState(false);
  const [expandedPerformance, setExpandedPerformance] = useState(true);
  const [newActivityData, setNewActivityData] = useState({
    autor: '',
    tipo: 'adicionar',
    item: '',
    quantidade: '',
    valor: '',
    categoria: 'inventario',
    timestamp: new Date().toISOString().slice(0, 16)
  });
  
  // Tab state for user detail dialog
  const [userDetailTab, setUserDetailTab] = useState(0);
  
  // NEW: Search and filter functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'trabalhador', 'gerente'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [selectedWorkers, setSelectedWorkers] = useState(new Set()); // For bulk actions
  
  // NEW: Bot data integration
  const [botActivities, setBotActivities] = useState([]);
  const [workerMetrics, setWorkerMetrics] = useState({}); // Performance metrics per worker
  
  // Recent Activities state
  const [recentActivitiesSortBy, setRecentActivitiesSortBy] = useState('date');
  const [recentActivitiesSortOrder, setRecentActivitiesSortOrder] = useState('desc');
  const [editingActivity, setEditingActivity] = useState(null);
  const [activitiesNameFilter, setActivitiesNameFilter] = useState('');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [activitiesDateFrom, setActivitiesDateFrom] = useState('');
  const [activitiesDateTo, setActivitiesDateTo] = useState('');

  // Transaction Analysis state
  const [transactionAnalysis, setTransactionAnalysis] = useState(null);
  const [loadingTransactionAnalysis, setLoadingTransactionAnalysis] = useState(false);
  const [newRecentActivityData, setNewRecentActivityData] = useState({
    tipo: 'adicionar',
    item: '',
    quantidade: '',
    valor: '',
    timestamp: new Date().toISOString().slice(0, 16),
    categoria: 'inventario'
  });
  
  // Transaction viewer state
  const [transactionViewerOpen, setTransactionViewerOpen] = useState(false);
  const [selectedUserTransactions, setSelectedUserTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionUserId, setTransactionUserId] = useState(null);
  const [transactionUserName, setTransactionUserName] = useState('');
  const [transactionSortBy, setTransactionSortBy] = useState('timestamp');
  const [transactionSortOrder, setTransactionSortOrder] = useState('desc');
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  
  // Simplified automation state
  const [automationProcessing, setAutomationProcessing] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState({});
  
  // Sorting state
  const [sortBy, setSortBy] = useState('nome');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // User earnings state
  const [userEarnings, setUserEarnings] = useState({});
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  
  // Missing state variables for automation panel
  const [showAutomationPanel, setShowAutomationPanel] = useState(false);
  const [workerRatings, setWorkerRatings] = useState([]);
  const [abuseReport, setAbuseReport] = useState([]);
  const [expandedRecentActivities, setExpandedRecentActivities] = useState({});
  const [addingRecentActivity, setAddingRecentActivity] = useState(false);

  // Utility function to normalize text display
  const normalizeText = (text) => {
    if (!text) return 'Item';
    
    return text
      .replace(/_/g, ' ')                    // Replace underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')   // Add space between camelCase
      .split(' ')                            // Split into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' ');                            // Join back together
  };

  useEffect(() => {
    console.log('👥 Users component mounted, loading users...');
    loadUsers();
    loadBotActivities(); // Load bot data for worker metrics
    
    if (socket) {
      // FIXED: Updated for new bot_data pipeline
      socket.on('usuarios:atualizado', (usersData) => {
        console.log('📡 Users data updated via socket:', Object.keys(usersData).length, 'users');
        setUsers(usersData);
        setLoading(false);
      });
      
      // NEW: Listen for bot data updates
      socket.on('bot_data:updated', (data) => {
        console.log('📡 Bot data updated, refreshing worker metrics');
        loadBotActivities();
        calculateWorkerMetrics(data.activities || []);
      });

      // Listen for automation completion
      socket.on('automation:complete', (stats) => {
        console.log('🤖 Automation completed:', stats);
        setMessage(`✅ Auto-processed ${stats.activities_processed} activities, found ${stats.new_workers || 0} new workers`);
        setSeverity('success');
        setSnackbarOpen(true);
      });

      return () => {
        socket.off('usuarios:atualizado');
        socket.off('bot_data:updated');
        socket.off('automation:complete');
      };
    }
  }, [socket]);
  
  // Load earnings when users change 
  useEffect(() => {
    if (Object.keys(users).length > 0) {
      console.log('🔄 Loading user earnings for', Object.keys(users).length, 'users');
      loadUserEarnings();
    }
  }, [users]);
  
  // Load transaction analysis when Analysis tab is selected (now tab 1)
  useEffect(() => {
    if (userDetailTab === 1 && selectedUserDetail && !transactionAnalysis && !loadingTransactionAnalysis) {
      loadTransactionAnalysis(selectedUserDetail.id);
    }
  }, [userDetailTab, selectedUserDetail]);

  const loadUsers = async () => {
    try {
      console.log('📥 Loading users from API...');
      setLoading(true);
      const response = await fetch('/api/usuarios');
      if (response.ok) {
        const data = await response.json();
        console.log('👥 Users API response:', data);
        if (data.sucesso) {
          console.log('✅ Users loaded successfully:', Object.keys(data.dados || {}).length, 'users');
          setUsers(data.dados || {});
        } else {
          console.warn('❌ Users API returned success=false:', data);
        }
      } else {
        console.error('❌ Users API failed with status:', response.status);
        setError('Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const loadUserEarnings = async () => {
    try {
      console.log('💰 Starting loadUserEarnings...');
      setLoadingEarnings(true);
      
      // NEW SYSTEM: Use payments API instead of old performance API
      try {
        console.log('💰 Using NEW payments API...');
        const response = await fetch('/api/payments/unpaid');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.unpaid_balances) {
            console.log('✅ Payments API successful:', Object.keys(data.unpaid_balances).length, 'users with unpaid balances');
            
            const earnings = {};
            
            // Process all users, including those with no payments
            Object.keys(users).forEach(userId => {
              const unpaidData = data.unpaid_balances[userId];
              if (unpaidData) {
                earnings[userId] = {
                  naoPago: unpaidData.total_pendente || 0,
                  pago: 0, // We don't have paid data in this API yet
                  total: unpaidData.total_pendente || 0
                };
              } else {
                earnings[userId] = {
                  naoPago: 0,
                  pago: 0, 
                  total: 0
                };
              }
            });
            
            console.log('💰 NEW SYSTEM: Earnings loaded for', Object.keys(earnings).length, 'users');
            setUserEarnings(earnings);
            setLoadingEarnings(false);
            return; // Success!
          }
        }
        console.warn('❌ Payments API failed, falling back to old system');
      } catch (paymentsError) {
        console.warn('❌ Payments API error, falling back to old system:', paymentsError);
      }
      
      // FALLBACK: Use old performance API (will show mostly zeros now)
      const earnings = {};
      
      // ⚡ PERFORMANCE FIX: Try bulk ranking API first, fallback to individual calls
      try {
        console.log('📊 Trying bulk ranking API...');
        const rankingResponse = await fetch('/api/usuarios/ranking/performance');
        if (rankingResponse.ok) {
          const rankingData = await rankingResponse.json();
          console.log('📊 Ranking API response:', rankingData);
          console.log('📊 Ranking data type:', typeof rankingData.dados, 'isArray:', Array.isArray(rankingData.dados));
          if (rankingData.dados) {
            console.log('📊 First few ranking items:', rankingData.dados.slice ? rankingData.dados.slice(0, 3) : 'Not an array');
          }
          
          if (rankingData.sucesso && rankingData.dados) {
            // Handle both array and object formats
            let rankingUsers = [];
            if (Array.isArray(rankingData.dados)) {
              rankingUsers = rankingData.dados;
            } else if (typeof rankingData.dados === 'object') {
              // Convert object to array of values
              rankingUsers = Object.values(rankingData.dados);
            }
            
            if (rankingUsers.length > 0) {
              console.log('✅ Using bulk data for', rankingUsers.length, 'users');
              // Use ranking data to populate earnings quickly
              rankingUsers.forEach(user => {
                console.log('📊 Processing ranking user:', user.nome, 'struktur:', Object.keys(user));
                // The ranking structure spreads performance data, so servicos should be at root level
                const servicos = user.servicos;
                if (user.usuario_id && servicos) {
                  console.log('📊 User servicos found:', user.nome, servicos);
                  const totalGanhos = servicos.total_ganhos || 0;
                  const totalPago = servicos.total_pago || 0;
                  const naoPago = totalGanhos - totalPago;
                  
                  earnings[user.usuario_id] = {
                    naoPago: naoPago > 0 ? naoPago : 0,
                    pago: totalPago,
                    total: totalGanhos
                  };
                } else {
                  console.log('📊 No servicos for user:', user.nome, 'checking if user_id exists:', !!user.usuario_id);
                }
              });
              
              console.log('💰 Bulk earnings loaded:', Object.keys(earnings).length, 'users');
              setUserEarnings(earnings);
              setLoadingEarnings(false);
              return; // Exit early - bulk data loaded successfully
            }
          }
        } else {
          console.warn('❌ Ranking API responded with status:', rankingResponse.status);
        }
      } catch (bulkError) {
        console.warn('❌ Bulk ranking API failed, falling back to individual calls:', bulkError);
      }
      
      // Final fallback: Return zeros for all users
      console.log('🔄 Final fallback: setting all users to zero earnings');
      Object.keys(users).forEach(userId => {
        earnings[userId] = { naoPago: 0, pago: 0, total: 0 };
      });
      
    } catch (error) {
      console.error('Error loading user earnings:', error);
    } finally {
      setLoadingEarnings(false);
    }
  };

  // FIXED: Load bot activities for worker metrics with proper data handling
  const loadBotActivities = async () => {
    try {
      const response = await fetch('/api/dashboard/atividades?limite=100');
      if (response.ok) {
        const data = await response.json();
        console.log('🤖 Bot activities response:', data);
        
        // FIXED: Handle nested data structure from dashboard API
        if (data.sucesso) {
          let activities = [];
          
          // Handle different possible data structures
          if (Array.isArray(data.dados)) {
            // dados is directly an array
            activities = data.dados;
          } else if (data.dados && Array.isArray(data.dados.atividades)) {
            // dados contains an atividades array (current structure)
            activities = data.dados.atividades;
            console.log('📋 Found activities in dados.atividades:', activities.length, 'activities');
          } else if (data.dados && typeof data.dados === 'object') {
            // Try to extract activities from object
            activities = Object.values(data.dados).filter(Array.isArray).flat();
          }
          
          setBotActivities(activities);
          calculateWorkerMetrics(activities);
        } else {
          console.warn('⚠️ Bot activities request was not successful:', data);
          setBotActivities([]);
          calculateWorkerMetrics([]);
        }
      } else {
        console.error('❌ Failed to load bot activities:', response.status);
        setBotActivities([]);
        calculateWorkerMetrics([]);
      }
    } catch (error) {
      console.error('Error loading bot activities:', error);
      setBotActivities([]);
      calculateWorkerMetrics([]);
    }
  };

  // FIXED: Calculate worker performance metrics from bot data with proper author extraction
  const calculateWorkerMetrics = (activities) => {
    console.log('📋 Calculating worker metrics from:', activities.length, 'activities');
    const metrics = {};
    
    if (!Array.isArray(activities)) {
      console.warn('⚠️ Activities is not an array:', activities);
      setWorkerMetrics({});
      return;
    }
    
    activities.forEach((activity) => {
      // Multiple ways to extract author name from dashboard API response
      let authorName = null;
      let authorId = null;
      
      // Method 1: From direct 'autor' field (Portuguese format from dashboard API)
      if (activity.autor) {
        // Handle both formats: "Name | FIXO: ID" and just "Name"
        const parts = activity.autor.split(' | ');
        authorName = parts[0]?.trim();
        
        // Extract FIXO ID if present
        if (parts[1] && parts[1].includes('FIXO:')) {
          authorId = parts[1].replace('FIXO:', '').replace('FIXO', '').trim();
        }
        
        // Skip system authors
        if (authorName === 'Captain Hook' || authorName === 'Sistema' || authorName === 'System') {
          return;
        }
      }
      
      // Method 2: From 'author' field (English format)
      if (!authorName && activity.author && activity.author !== 'Captain Hook' && activity.author !== 'Sistema') {
        authorName = activity.author.trim();
        
        // Try to extract FIXO ID from content if available
        if (activity.content && activity.content.includes('FIXO:')) {
          const fixoMatch = activity.content.match(/FIXO:\s*(\d+)/);
          if (fixoMatch) {
            authorId = fixoMatch[1];
          }
        }
      }
      
      // Method 3: Extract from embed fields if available
      if (!authorName && activity.raw_message?.raw_embeds?.[0]?.fields) {
        const fields = activity.raw_message.raw_embeds[0].fields;
        const acaoField = fields.find(f => f.name.includes('Ação:'));
        const autorField = fields.find(f => f.name.includes('Autor:'));
        
        if (acaoField && acaoField.value) {
          const match = acaoField.value.match(/```prolog\n(.+?)\s+(vendeu|depositou|sacou|comprou)/);
          if (match) authorName = match[1];
        } else if (autorField && autorField.value) {
          const match = autorField.value.match(/```prolog\n(.+?)\s+\|/);
          if (match) authorName = match[1];
        }
      }
      
      if (!authorName) {
        return; // Skip activities without identifiable author
      }
      
      // Store metrics by both name and ID for better matching
      const metricsKey = authorName;
      
      if (!metrics[metricsKey]) {
        metrics[metricsKey] = {
          authorId: authorId,
          totalActivities: 0,
          inventoryActivities: 0,
          financialActivities: 0,
          depositsCount: 0,
          withdrawalsCount: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          efficiency: 0,
          lastActivity: null
        };
      }
      
      const userMetrics = metrics[authorName];
      userMetrics.totalActivities++;
      
      // Determine activity type from dashboard response
      const isFinancial = activity.type === 'deposit' || activity.type === 'withdrawal' || 
                         activity.categoria === 'financeiro' ||
                         (activity.details && (activity.details.action === 'deposit' || activity.details.action === 'withdrawal'));
      
      if (isFinancial) {
        userMetrics.financialActivities++;
        
        const isDeposit = activity.type === 'deposit' || 
                         activity.tipo === 'deposito' ||
                         activity.details?.action === 'deposit';
        
        const amount = activity.details?.amount || activity.valor || 0;
        
        if (isDeposit) {
          userMetrics.depositsCount++;
          userMetrics.totalDeposited += amount;
        } else {
          userMetrics.withdrawalsCount++;
          userMetrics.totalWithdrawn += amount;
        }
      } else {
        userMetrics.inventoryActivities++;
      }
      
      // Update last activity
      const activityDate = new Date(activity.timestamp);
      if (!userMetrics.lastActivity || activityDate > new Date(userMetrics.lastActivity)) {
        userMetrics.lastActivity = activity.timestamp;
      }
      
      // Calculate efficiency (ratio of inventory to total activities)
      userMetrics.efficiency = userMetrics.totalActivities > 0 
        ? (userMetrics.inventoryActivities / userMetrics.totalActivities) * 100 
        : 0;
    });
    
    const workerNames = Object.keys(metrics);
    console.log('✅ Worker metrics calculated for', workerNames.length, 'workers:', workerNames.length > 0 ? workerNames.join(', ') : 'None');
    setWorkerMetrics(metrics);
  };

  // NEW: Bulk action handlers
  const handleSelectWorker = (workerId, checked) => {
    const newSelection = new Set(selectedWorkers);
    if (checked) {
      newSelection.add(workerId);
    } else {
      newSelection.delete(workerId);
    }
    setSelectedWorkers(newSelection);
  };

  const handleSelectAllWorkers = (checked) => {
    if (checked) {
      const allWorkerIds = getFilteredUsers().map(user => user.id);
      setSelectedWorkers(new Set(allWorkerIds));
    } else {
      setSelectedWorkers(new Set());
    }
  };

  const handleBulkPayWorkers = async () => {
    if (selectedWorkers.size === 0) return;
    
    if (!window.confirm(`Pagar todos os trabalhadores selecionados (${selectedWorkers.size})?`)) {
      return;
    }
    
    try {
      const promises = Array.from(selectedWorkers).map(workerId => 
        fetch(`/api/usuarios/${workerId}/pay-all`, { method: 'POST' })
      );
      
      await Promise.all(promises);
      setMessage(`${selectedWorkers.size} trabalhadores pagos com sucesso!`);
      setSeverity('success');
      setSnackbarOpen(true);
      setSelectedWorkers(new Set());
      loadUserEarnings();
    } catch (error) {
      setMessage('Erro ao pagar trabalhadores selecionados');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleOpenDialog = (user = null) => {
    setEditMode(!!user);
    setSelectedUser(user);
    if (user) {
      setFormData({
        id: user.id || '',
        nome: user.nome || '',
        funcao: user.funcao || 'trabalhador'
      });
    } else {
      setFormData({
        id: '',
        nome: '',
        funcao: 'trabalhador'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setEditMode(false);
  };

  const handleSaveUser = async () => {
    try {
      if (!formData.id || !formData.nome) {
        setError('ID e nome são obrigatórios');
        return;
      }

      let response;
      
      if (editMode) {
        // Update user role
        response = await fetch(`/api/usuarios/${encodeURIComponent(formData.id)}/funcao`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            funcao: formData.funcao
          })
        });
      } else {
        // Create new user
        response = await fetch('/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: formData.id,
            nome: formData.nome,
            funcao: formData.funcao
          })
        });
      }

      if (response.ok) {
        handleCloseDialog();
        loadUsers();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao salvar usuário');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Erro ao salvar usuário');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) {
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadUsers();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao remover usuário');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Erro ao remover usuário');
    }
  };

  // Service management functions

  const handleUnpayTransaction = async (userId, serviceType, activityId) => {
    try {
      const response = await fetch(`/api/usuarios/${userId}/unpay/${serviceType}/${activityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setMessage('Transação despaga com sucesso!');
        setSeverity('success');
        setSnackbarOpen(true);
        
        // Reload user details
        if (selectedUserDetail) {
          await handleViewUserDetail(selectedUserDetail.id, selectedUserDetail.nome);
        }
      } else {
        throw new Error('Falha ao despagar transação');
      }
    } catch (error) {
      console.error('Error unpaying transaction:', error);
      setMessage('Erro ao despagar transação');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Recent Activities handlers
  const handleEditActivity = (activity) => {
    setEditingTransaction(activity.id_atividade || activity.id);
    setEditData({
      tipo: activity.tipo,
      item: activity.item || '',
      quantidade: activity.quantidade || '',
      valor: activity.valor || '',
      timestamp: new Date(activity.timestamp).toISOString().slice(0, 16)
    });
  };

  const handleSaveActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/usuarios/atividade/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setMessage('Atividade editada com sucesso!');
        setSeverity('success');
        setSnackbarOpen(true);
        setEditingTransaction(null);
        
        // Reload user details
        if (selectedUserDetail) {
          await handleViewUserDetail(selectedUserDetail.id, selectedUserDetail.nome);
        }
      } else {
        const errorData = await response.json();
        setMessage(errorData.erro || 'Erro ao editar atividade');
        setSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error editing activity:', error);
      setMessage('Erro ao editar atividade');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta atividade?')) return;
    
    try {
      const response = await fetch(`/api/usuarios/atividade/${activityId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Atividade excluída com sucesso!');
        setSeverity('success');
        setSnackbarOpen(true);
        
        // Reload user details
        if (selectedUserDetail) {
          await handleViewUserDetail(selectedUserDetail.id, selectedUserDetail.nome);
        }
      } else {
        const errorData = await response.json();
        setMessage(errorData.erro || 'Erro ao excluir atividade');
        setSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      setMessage('Erro ao excluir atividade');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleAddRecentActivity = async () => {
    try {
      const activityData = {
        ...newRecentActivityData,
        autor: selectedUserDetail.nome,
        quantidade: parseInt(newRecentActivityData.quantidade) || null,
        valor: parseFloat(newRecentActivityData.valor) || null,
        timestamp: new Date(newRecentActivityData.timestamp).toISOString()
      };

      const response = await fetch('/api/usuarios/atividade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });

      if (response.ok) {
        setMessage('Atividade adicionada com sucesso!');
        setSeverity('success');
        setSnackbarOpen(true);
        // Activity adding removed
        
        // Reset form
        setNewRecentActivityData({
          tipo: 'adicionar',
          item: '',
          quantidade: '',
          valor: '',
          timestamp: new Date().toISOString().slice(0, 16),
          categoria: 'inventario'
        });
        
        // Reload user details
        if (selectedUserDetail) {
          await handleViewUserDetail(selectedUserDetail.id, selectedUserDetail.nome);
        }
      } else {
        const errorData = await response.json();
        setMessage(errorData.erro || 'Erro ao adicionar atividade');
        setSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      setMessage('Erro ao adicionar atividade');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleUnpayAllTransactions = async (userId, serviceType) => {
    if (!window.confirm('Tem certeza que deseja despagar TODAS as transações deste serviço?')) {
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${userId}/unpay-all/${serviceType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setMessage('Todas as transações foram despagas!');
        setSeverity('success');
        setSnackbarOpen(true);
        
        // Reload user details
        if (selectedUserDetail) {
          await handleViewUserDetail(selectedUserDetail.id, selectedUserDetail.nome);
        }
      } else {
        throw new Error('Falha ao despagar todas as transações');
      }
    } catch (error) {
      console.error('Error unpaying all transactions:', error);
      setMessage('Erro ao despagar todas as transações');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSaveEdit = async (activityId) => {
    try {
      // Find the original activity
      const originalActivity = selectedUserDetail.servicos.detalhes_plantacao.concat(
        selectedUserDetail.servicos.detalhes_animais.map(a => a.itens).flat()
      ).find(a => a.id_atividade === activityId);
      
      const originalItemId = originalActivity?.item;
      const newItemId = editData.item;
      
      // Check if item name changed
      const itemChanged = originalItemId !== newItemId;
      
      if (itemChanged) {
        console.log(`🌍 Item changed: ${originalItemId} → ${newItemId}. Performing GLOBAL update.`);
        
        // Perform global update for item name change
        const globalResponse = await fetch('/api/usuarios/global-item-update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            oldId: originalItemId,
            newId: newItemId,
            newDisplayName: newItemId // Use the new ID as display name for now
          })
        });
        
        if (globalResponse.ok) {
          const globalResult = await globalResponse.json();
          console.log('🎉 Global update result:', globalResult);
          setMessage(`Item atualizado GLOBALMENTE: ${originalItemId} → ${newItemId}. ${globalResult.dados.updatedCount} itens atualizados.`);
          setSeverity('success');
        } else {
          setMessage('Erro ao atualizar item globalmente');
          setSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }
      
      // Update other fields (quantity, value, timestamp) if changed
      const updateData = {
        item: newItemId, // Always include the item field
        quantidade: parseFloat(editData.quantidade) || null,
        valor: parseFloat(editData.valor) || null,
        timestamp: editData.timestamp ? new Date(editData.timestamp).toISOString() : undefined
      };

      const response = await fetch(`/api/usuarios/atividade/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        if (!itemChanged) {
          setMessage('Atividade editada com sucesso!');
        }
        setSeverity('success');
        setSnackbarOpen(true);
        setEditingTransaction(null);
        setEditData({});
        
        // Reload user details
        if (selectedUserDetail) {
          await handleViewUserDetail(selectedUserDetail.id, selectedUserDetail.nome);
        }
      } else {
        const errorData = await response.json();
        setMessage(`Erro: ${errorData.erro}`);
        setSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error editing activity:', error);
      setMessage('Erro ao editar atividade');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditData({});
  };

  const handleAddActivity = async () => {
    try {
      const activityData = {
        ...newActivityData,
        quantidade: parseFloat(newActivityData.quantidade) || null,
        valor: parseFloat(newActivityData.valor) || null,
        timestamp: new Date(newActivityData.timestamp).toISOString()
      };

      console.log('🌱 Sending plantation activity:', activityData);

      const response = await fetch('/api/usuarios/atividade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });

      const responseData = await response.json();
      console.log('🌱 Server response:', responseData);

      if (response.ok) {
        setMessage('Atividade adicionada com sucesso!');
        setSeverity('success');
        setSnackbarOpen(true);
        setAddingActivity(false);
        setNewActivityData({
          autor: '',
          tipo: 'adicionar',
          item: '',
          quantidade: '',
          valor: '',
          categoria: 'inventario',
          timestamp: new Date().toISOString().slice(0, 16)
        });
        
        // Reload user details after a small delay to ensure server has processed the activity
        if (selectedUserDetail) {
          setTimeout(async () => {
            console.log('🌱 Reloading user details for:', selectedUserDetail.id);
            await handleViewUserDetail(selectedUserDetail.id, selectedUserDetail.nome);
          }, 500);
        }
      } else {
        const errorData = await response.json();
        setMessage(`Erro: ${errorData.erro}`);
        setSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      setMessage('Erro ao adicionar atividade');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ENHANCED: Get filtered and sorted users array with search and filtering
  const getFilteredUsers = () => {
    let usersArray = Object.entries(users)
      .map(([id, userData]) => ({
        id,
        ...userData,
        displayName: normalizeText(userData.nome),
        // Ensure function defaults to 'trabalhador' for consistency
        funcao: userData.funcao || 'trabalhador'
      }));

    // Apply role filter
    if (filterRole !== 'all') {
      usersArray = usersArray.filter(user => user.funcao === filterRole);
    }
    
    // Apply status filter
    if (filterStatus === 'active') {
      usersArray = usersArray.filter(user => user.ativo !== false);
    } else if (filterStatus === 'inactive') {
      usersArray = usersArray.filter(user => user.ativo === false);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      usersArray = usersArray.filter(user => 
        user.id.toLowerCase().includes(term) ||
        user.displayName.toLowerCase().includes(term) ||
        (user.nome && user.nome.toLowerCase().includes(term))
      );
    }

    // Sort users
    usersArray.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'id':
          aValue = a.id.toLowerCase();
          bValue = b.id.toLowerCase();
          break;
        case 'funcao':
          aValue = a.funcao;
          bValue = b.funcao;
          break;
        case 'ativo':
          aValue = a.ativo ? 1 : 0;
          bValue = b.ativo ? 1 : 0;
          break;
        case 'criado_em':
          aValue = new Date(a.criado_em || 0);
          bValue = new Date(b.criado_em || 0);
          break;
        case 'nome':
        default:
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return usersArray;
  };
  
  // DEPRECATED: Keep for backward compatibility, but use getFilteredUsers for new features
  const getUsersArray = () => {
    // For backward compatibility with existing code
    return getFilteredUsers().filter(user => user.funcao !== 'gerente');
  };
  
  // Memoized calculations for performance
  const userStats = useMemo(() => {
    const allUsers = getFilteredUsers();
    const workers = allUsers.filter(u => u.funcao === 'trabalhador');
    const managers = allUsers.filter(u => u.funcao === 'gerente');
    const activeUsers = allUsers.filter(u => u.ativo !== false);
    
    return {
      total: allUsers.length,
      workers: workers.length,
      managers: managers.length,
      active: activeUsers.length,
      inactive: allUsers.length - activeUsers.length
    };
  }, [users, filterRole, filterStatus, searchTerm]);
  
  const totalEarnings = useMemo(() => {
    if (!userEarnings || Object.keys(userEarnings).length === 0) {
      return { unpaid: 0, paid: 0, total: 0 };
    }
    
    return Object.values(userEarnings).reduce(
      (acc, earnings) => ({
        unpaid: acc.unpaid + (earnings.naoPago || 0),
        paid: acc.paid + (earnings.pago || 0),
        total: acc.total + (earnings.total || 0)
      }),
      { unpaid: 0, paid: 0, total: 0 }
    );
  }, [userEarnings]);
  
  const handleViewUserDetail = async (userId, userName) => {
    try {
      setLoadingUserDetail(true);
      setSelectedUserDetail({ id: userId, nome: userName });
      setUserDetailTab(0); // Reset to first tab
      setTransactionAnalysis(null); // Clear previous analysis
      
      // Load user performance and services
      console.log('🔍 Frontend: Loading user details for:', userId);
      const apiUrl = `/api/usuarios/${encodeURIComponent(userId)}/performance`;
      console.log('🌐 Frontend: API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Frontend: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Frontend: Received data:', data);
        setUserServices(data.dados || {});
      } else {
        console.error('❌ Frontend: API response not ok:', response.status, response.statusText);
      }
      
      setUserDetailOpen(true);
      
      // Don't load transaction analysis immediately - wait for tab selection
    } catch (error) {
      console.error('Error loading user detail:', error);
      setError('Erro ao carregar detalhes do usuário');
    } finally {
      setLoadingUserDetail(false);
    }
  };

  // ENHANCED: Load transaction analysis for user with bot data integration
  const loadTransactionAnalysis = async (userId) => {
    setLoadingTransactionAnalysis(true);
    setTransactionAnalysis(null); // Clear previous data
    
    try {
      console.log('🔍 ANALYSIS DEBUG: Starting analysis for user:', userId, 'Type:', typeof userId);
      
      if (!userId) {
        console.error('❌ ANALYSIS DEBUG: User ID is empty or null');
        setTransactionAnalysis(null);
        return;
      }
      
      // NEW: Try to get user analysis from bot data first
      const userName = users[userId]?.nome || userId;
      const userMetrics = workerMetrics[userName];
      
      if (userMetrics) {
        // Create analysis from bot data
        const botAnalysis = {
          totalTransacoes: userMetrics.totalActivities,
          transacoesFinanceiras: userMetrics.financialActivities,
          transacoesInventario: userMetrics.inventoryActivities,
          totalDepositado: userMetrics.totalDeposited,
          totalSacado: userMetrics.totalWithdrawn,
          eficiencia: userMetrics.efficiency,
          ultimaAtividade: userMetrics.lastActivity,
          analiseDetalhada: {
            summary: {
              suspiciousActivity: userMetrics.efficiency < 50,
              honestScore: Math.min(100, userMetrics.efficiency + (userMetrics.depositsCount * 5)),
              riskLevel: userMetrics.withdrawalsCount > userMetrics.depositsCount ? 'high' : 'low'
            },
            financial: {
              deposits: userMetrics.depositsCount,
              withdrawals: userMetrics.withdrawalsCount,
              netBalance: userMetrics.totalDeposited - userMetrics.totalWithdrawn
            }
          }
        };
        
        console.log('✅ BOT DATA ANALYSIS: Generated analysis from bot metrics:', botAnalysis);
        setTransactionAnalysis(botAnalysis);
        setLoadingTransactionAnalysis(false);
        return;
      }
      
      // Fallback to legacy API
      const url = `/api/usuarios/${encodeURIComponent(userId)}/transacoes-analise`;
      console.log('🌐 ANALYSIS DEBUG: Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('📡 ANALYSIS DEBUG: Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('📋 ANALYSIS DEBUG: Full API response:', result);
      
      if (result.sucesso) {
        console.log('✅ ANALYSIS DEBUG: Success! Data structure:', {
          totalTransacoes: result.dados?.totalTransacoes,
          hasAnaliseDetalhada: !!result.dados?.analiseDetalhada,
          hasKeys: Object.keys(result.dados || {})
        });
        setTransactionAnalysis(result.dados);
      } else {
        console.error('❌ ANALYSIS DEBUG: API returned error:', result.erro);
        console.error('❌ ANALYSIS DEBUG: Error details:', result.detalhes);
        setTransactionAnalysis(null);
      }
    } catch (error) {
      console.error('❌ ANALYSIS DEBUG: Network/parsing error:', error);
      setTransactionAnalysis(null);
    } finally {
      setLoadingTransactionAnalysis(false);
    }
  };

  // Handle opening transaction viewer for a user
  const handleViewAllTransactions = async (userId, userName) => {
    try {
      setLoadingTransactions(true);
      setTransactionUserId(userId);
      setTransactionUserName(userName);
      
      console.log('🔍 Loading all transactions for user:', userId);
      const response = await fetch(`/api/usuarios/${encodeURIComponent(userId)}/transactions`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Received transactions:', data);
        setSelectedUserTransactions(data.transactions || []);
      } else {
        console.error('❌ Failed to load transactions:', response.status);
        setSelectedUserTransactions([]);
      }
      
      setTransactionViewerOpen(true);
    } catch (error) {
      console.error('Error loading user transactions:', error);
      setError('Erro ao carregar transações do usuário');
      setSelectedUserTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Handle closing transaction viewer
  const handleCloseTransactionViewer = () => {
    setTransactionViewerOpen(false);
    setSelectedUserTransactions([]);
    setTransactionUserId(null);
    setTransactionUserName('');
    setEditingTransactionId(null);
    setEditTransactionData({});
  };

  // Handle editing a transaction
  const handleEditTransaction = (transaction) => {
    setEditingTransactionId(transaction.id);
    setEditTransactionData({
      item: transaction.item,
      quantidade: transaction.quantidade,
      valor: transaction.valor || '',
      timestamp: transaction.timestamp.slice(0, 16) // Format for datetime-local input
    });
  };

  // Handle saving edited transaction - GLOBAL UPDATE
  const handleSaveEditedTransaction = async (transactionId) => {
    try {
      const originalTransaction = selectedUserTransactions.find(t => t.id === transactionId);
      const originalItemId = originalTransaction?.item;
      const newItemId = editTransactionData.item;
      
      // Check if item name changed
      const itemChanged = originalItemId !== newItemId;
      
      if (itemChanged) {
        console.log(`🌍 Item changed: ${originalItemId} → ${newItemId}. Performing GLOBAL update.`);
        
        // Perform global update for item name change
        const globalResponse = await fetch('/api/usuarios/global-item-update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            oldId: originalItemId,
            newId: newItemId,
            newDisplayName: newItemId // Use the new ID as display name for now
          })
        });
        
        if (globalResponse.ok) {
          const globalResult = await globalResponse.json();
          console.log('🎉 Global update result:', globalResult);
          setMessage(`Item atualizado GLOBALMENTE: ${originalItemId} → ${newItemId}. ${globalResult.dados.updatedCount} itens atualizados.`);
          setSeverity('success');
        } else {
          setMessage('Erro ao atualizar item globalmente');
          setSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }
      
      // Update other transaction fields (quantity, value) if changed
      const fieldsToUpdate = {};
      if (editTransactionData.quantidade !== originalTransaction.quantidade) {
        fieldsToUpdate.quantidade = editTransactionData.quantidade;
      }
      if (editTransactionData.valor !== originalTransaction.valor) {
        fieldsToUpdate.valor = editTransactionData.valor;
      }
      
      if (Object.keys(fieldsToUpdate).length > 0) {
        const response = await fetch(`/api/usuarios/atividade/${transactionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fieldsToUpdate)
        });

        if (!response.ok) {
          setMessage('Erro ao atualizar outros campos da transação');
          setSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }

      // Refresh the transaction list
      await handleViewAllTransactions(transactionUserId, transactionUserName);
      setEditingTransactionId(null);
      setEditTransactionData({});
      
      if (!itemChanged) {
        setMessage('Transação atualizada com sucesso');
        setSeverity('success');
      }
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error updating transaction:', error);
      setMessage('Erro ao atualizar transação');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle deleting a transaction
  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Tem certeza que deseja remover esta transação?')) {
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/atividade/${transactionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the transaction list
        await handleViewAllTransactions(transactionUserId, transactionUserName);
        setMessage('Transação removida com sucesso');
        setSeverity('success');
        setSnackbarOpen(true);
      } else {
        setMessage('Erro ao remover transação');
        setSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setMessage('Erro ao remover transação');
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle canceling edit
  const handleCancelEditTransaction = () => {
    setEditingTransactionId(null);
    setEditTransactionData({});
  };
  
  const closeUserDetail = () => {
    setUserDetailOpen(false);
    setSelectedUserDetail(null);
    setUserServices([]);
    setShowPaidTransactions(false);
    setPaymentHistory([]);
    // Expanded states removed
  };
  
  const handlePayService = async (userId, tipoServico) => {
    try {
      const response = await fetch(`/api/usuarios/${encodeURIComponent(userId)}/pagar/${tipoServico}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Show receipt dialog if available
        if (data.recibo_discord) {
          setReceiptDialog({ open: true, receipt: data.recibo_discord });
        } else {
          alert(`Pagamento processado: ${data.mensagem}`);
        }
        
        // Reload user details
        await handleViewUserDetail(userId, selectedUserDetail.nome);
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.erro}`);
      }
    } catch (error) {
      console.error('Error paying service:', error);
      alert('Erro ao processar pagamento');
    }
  };
  
  const handlePayIndividualTransaction = async (userId, tipoServico, idTransacao, valor) => {
    try {
      const response = await fetch(`/api/usuarios/${encodeURIComponent(userId)}/pagar-transacao/${tipoServico}/${idTransacao}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Show receipt dialog if available
        if (data.recibo_discord) {
          setReceiptDialog({ open: true, receipt: data.recibo_discord });
        } else {
          alert(`Transação paga: $${valor}`);
        }
        
        // Reload user details
        await handleViewUserDetail(userId, selectedUserDetail.nome);
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.erro}`);
      }
    } catch (error) {
      console.error('Error paying individual transaction:', error);
      alert('Erro ao processar pagamento de transação');
    }
  };
  
  const handleAbuseAction = async (userId, action, category, index, item) => {
    try {
      const actionKey = `${userId}_${category}_${index}`;
      
      // Update local state to track the action
      setAbuseActions(prev => ({
        ...prev,
        [actionKey]: {
          action: action, // 'charge' or 'ignore'
          item: item,
          timestamp: new Date().toISOString()
        }
      }));

      // Call API to record the action
      const response = await fetch(`/api/usuarios/${userId}/abuse-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          category: category,
          index: index,
          item: item
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setMessage(`${action === 'charge' ? 'Cobrança aplicada' : 'Item ignorado'} com sucesso!`);
          setSeverity('success');
          setSnackbarOpen(true);
          
          // Reload user data to update the display
          loadUsers();
        } else {
          throw new Error(data.erro || 'Erro ao processar ação');
        }
      } else {
        throw new Error('Erro na comunicação com o servidor');
      }
    } catch (error) {
      console.error('Error handling abuse action:', error);
      setMessage('Erro ao processar ação: ' + error.message);
      setSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const loadPaymentHistory = async (userId) => {
    try {
      const response = await fetch(`/api/usuarios/${encodeURIComponent(userId)}/pagamentos`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.dados || []);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  // Function to sort paid transactions
  const sortPaidTransactions = (transactions, sortBy, sortOrder) => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'type':
          // Sort by item name (plant names, animal names, etc.)
          comparison = (a.item || '').localeCompare(b.item || '');
          break;
        case 'quantity':
          comparison = (a.quantidade || 0) - (b.quantidade || 0);
          break;
        case 'value':
          comparison = (a.valor_total || 0) - (b.valor_total || 0);
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Function to sort recent activities
  const sortRecentActivities = (activities, sortBy, sortOrder) => {
    return [...activities].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'name':
          comparison = (a.item || '').localeCompare(b.item || '');
          break;
        case 'quantity':
          comparison = (a.quantidade || 0) - (b.quantidade || 0);
          break;
        case 'type':
          // Sort by activity type (adicionar, remover, deposito, saque)
          comparison = (a.tipo || '').localeCompare(b.tipo || '');
          break;
        case 'added_removed':
          // Sort by type where 'adicionar' comes first, then 'remover'
          const typeOrder = { 'adicionar': 1, 'remover': 2, 'deposito': 3, 'saque': 4 };
          comparison = (typeOrder[a.tipo] || 5) - (typeOrder[b.tipo] || 5);
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Function to filter activities by date range
  const filterActivitiesByDate = (activities) => {
    if (!activitiesDateFrom && !activitiesDateTo) {
      return activities;
    }
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      const fromDate = activitiesDateFrom ? new Date(activitiesDateFrom) : null;
      const toDate = activitiesDateTo ? new Date(activitiesDateTo + 'T23:59:59') : null; // Include end of day
      
      if (fromDate && activityDate < fromDate) return false;
      if (toDate && activityDate > toDate) return false;
      return true;
    });
  };

  // Function to filter activities by name (exact match)
  const filterActivitiesByName = (activities) => {
    if (!activitiesNameFilter.trim()) {
      return activities;
    }
    
    const searchTerm = activitiesNameFilter.trim().toLowerCase();
    
    return activities.filter(activity => {
      // Get the display name used in the UI
      const displayName = activity.displayName || activity.item || '';
      
      // Exact match on display name (case insensitive)
      return displayName.toLowerCase() === searchTerm;
    });
  };

  // Function to get filtered and limited activities
  const getDisplayedActivities = (activities) => {
    if (!activities || activities.length === 0) return [];
    
    // First filter by date range
    const dateFiltered = filterActivitiesByDate(activities);
    
    // Then filter by name
    const nameFiltered = filterActivitiesByName(dateFiltered);
    
    // Then sort
    const sorted = sortRecentActivities(nameFiltered, recentActivitiesSortBy, recentActivitiesSortOrder);
    
    // Finally limit if not showing all
    return showAllActivities ? sorted : sorted.slice(0, 20);
  };

  // Function to sort animal services/deliveries
  const sortAnimalServices = (deliveries, sortBy, sortOrder) => {
    return [...deliveries].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'type':
          // Sort by animal types delivered
          const aAnimals = a.animais_detalhes ? a.animais_detalhes.join(', ') : 'Animais';
          const bAnimals = b.animais_detalhes ? b.animais_detalhes.join(', ') : 'Animais';
          comparison = aAnimals.localeCompare(bAnimals);
          break;
        case 'quantity':
          comparison = (a.total_animais || 4) - (b.total_animais || 4); // Default 4 animals per delivery
          break;
        case 'value':
          comparison = (a.pagamento_worker || 0) - (b.pagamento_worker || 0);
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };
  
  const loadRanking = async () => {
    try {
      const response = await fetch('/api/usuarios/ranking');
      if (response.ok) {
        const data = await response.json();
        // Ranking removed
      }
    } catch (error) {
      console.error('Error loading ranking:', error);
    }
  };
  
  const getRankingColor = (categoria) => {
    switch (categoria) {
      case 'gerente': return 'error'; // Red for managers
      case 'elite': return 'primary';
      case 'avancado': return 'secondary';
      case 'intermediario': return 'success';
      case 'iniciante': return 'warning';
      default: return 'default';
    }
  };
  
  const getEspecialidadeLabel = (especialidade) => {
    switch (especialidade) {
      case 'especialista_plantacao': return '🌱 Plantação';
      case 'especialista_animais': return '🐄 Animais';
      case 'generalista': return '⚖️ Generalista';
      case 'iniciante': return '🆕 Iniciante';
      default: return '❓ Indefinido';
    }
  };
  
  // Automation handlers
  
  const evaluateWorker = async (workerId) => {
    try {
      const response = await fetch(`/api/automation/worker/${workerId}/evaluate`);
      const data = await response.json();
      
      if (data.success) {
        setMessage(`Worker evaluated: ${data.evaluation.star_rating} stars`);
        setSeverity('success');
        // Worker ratings removed
      } else {
        setMessage(data.error || 'Evaluation failed');
        setSeverity('error');
      }
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Worker evaluation error:', error);
    }
  };

  const handlePayAllServices = async (userId) => {
    try {
      const response = await fetch(`/api/usuarios/${encodeURIComponent(userId)}/pagar-todos`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Show receipt dialog if available
        if (data.recibo_discord) {
          setReceiptDialog({ open: true, receipt: data.recibo_discord });
        } else {
          alert(`Pagamento processado: ${data.mensagem}`);
        }
        
        // Reload user details
        await handleViewUserDetail(userId, selectedUserDetail.nome);
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.erro}`);
      }
    } catch (error) {
      console.error('Error paying all services:', error);
      alert('Erro ao processar pagamento');
    }
  };
  
  // Copy receipt to clipboard
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

  const getStatusColor = (ativo) => {
    return ativo ? 'success' : 'default';
  };

  const getRoleColor = (funcao) => {
    // FIXED: Ensure consistent role handling
    const role = funcao || 'trabalhador';
    switch (role) {
      case 'gerente':
        return 'primary';
      case 'trabalhador':
        return 'info';
      default:
        return 'default';
    }
  };
  
  // NEW: Helper function to get role display name
  const getRoleDisplayName = (funcao) => {
    const role = funcao || 'trabalhador';
    switch (role) {
      case 'gerente':
        return 'Gerente';
      case 'trabalhador':
        return 'Trabalhador';
      default:
        return 'Trabalhador';
    }
  };

  if (loading && Object.keys(users).length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        👥 Gerenciamento de Trabalhadores
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ENHANCED: Search and Filter Controls */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Função</InputLabel>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                label="Função"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="trabalhador">Trabalhadores</MenuItem>
                <MenuItem value="gerente">Gerentes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Ativos</MenuItem>
                <MenuItem value="inactive">Inativos</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedWorkers.size > 0 && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={handleBulkPayWorkers}
                    startIcon={<AttachMoneyIcon />}
                  >
                    Pagar Selecionados ({selectedWorkers.size})
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedWorkers(new Set())}
                  >
                    Limpar Seleção
                  </Button>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* OPTIMIZED: Professional Metric Cards with Memoized Data */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total de Usuários"
            value={userStats.total}
            icon={<PeopleIcon />}
            color="primary"
            subtitle={`${userStats.managers} gerentes, ${userStats.workers} trabalhadores`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Usuários Ativos"
            value={userStats.active}
            icon={<CheckCircleIcon />}
            color="success"
            subtitle={`${userStats.inactive} inativos`}
            trend={{ type: 'up', value: `${userStats.total > 0 ? Math.round((userStats.active/userStats.total)*100) : 0}% ativo` }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Ganhos Não Pagos"
            value={`$${loadingEarnings ? '...' : totalEarnings.unpaid.toFixed(2)}`}
            icon={<AttachMoneyIcon />}
            color="warning"
            loading={loadingEarnings}
            subtitle="Pendentes para pagamento"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Pago"
            value={`$${loadingEarnings ? '...' : totalEarnings.paid.toFixed(2)}`}
            icon={<CheckCircleIcon />}
            color="success"
            loading={loadingEarnings}
            subtitle="Total processado"
          />
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Adicionar Usuário
        </Button>
        
        {/* Automation Status - Now truly automated! */}
        <Chip
          icon={<CheckCircleIcon />}
          label="🤖 Auto-Processing Enabled"
          color="success"
          variant="outlined"
          sx={{ fontSize: '0.875rem', px: 1 }}
        />
      </Box>




      {/* ENHANCED: Users Table with Bulk Selection */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedWorkers.size === getFilteredUsers().length && getFilteredUsers().length > 0}
                    onChange={(e) => handleSelectAllWorkers(e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'id'}
                    direction={sortBy === 'id' ? sortOrder : 'asc'}
                    onClick={() => handleSort('id')}
                  >
                    <strong>ID do Usuário</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'nome'}
                    direction={sortBy === 'nome' ? sortOrder : 'asc'}
                    onClick={() => handleSort('nome')}
                  >
                    <strong>Nome</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'funcao'}
                    direction={sortBy === 'funcao' ? sortOrder : 'asc'}
                    onClick={() => handleSort('funcao')}
                  >
                    <strong>Função</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'ativo'}
                    direction={sortBy === 'ativo' ? sortOrder : 'asc'}
                    onClick={() => handleSort('ativo')}
                  >
                    <strong>Status</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'criado_em'}
                    direction={sortBy === 'criado_em' ? sortOrder : 'asc'}
                    onClick={() => handleSort('criado_em')}
                  >
                    <strong>Criado em</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right"><strong>Não Pago</strong></TableCell>
                <TableCell align="right"><strong>Pago</strong></TableCell>
                <TableCell align="right"><strong>Total Ganhos</strong></TableCell>
                <TableCell align="center"><strong>Ações</strong></TableCell>
                <TableCell align="center"><strong>Métricas</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredUsers().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography color="textSecondary">
                      {searchTerm || filterRole !== 'all' || filterStatus !== 'all' 
                        ? 'Nenhum usuário encontrado com os filtros aplicados'
                        : 'Nenhum usuário encontrado'
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredUsers().map((user) => (
                  <TableRow key={user.id} selected={selectedWorkers.has(user.id)}>                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedWorkers.has(user.id)}
                        onChange={(e) => handleSelectWorker(user.id, e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {user.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        color="primary"
                        onClick={() => handleViewUserDetail(user.id, user.nome)}
                        sx={{ p: 0, textTransform: 'none', justifyContent: 'flex-start' }}
                      >
                        <Typography variant="body1">
                          {user.displayName || normalizeText(user.nome)}
                        </Typography>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleDisplayName(user.funcao)}
                        color={getRoleColor(user.funcao)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.ativo ? 'Ativo' : 'Inativo'}
                        color={getStatusColor(user.ativo)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {user.criado_em ? new Date(user.criado_em).toLocaleDateString('pt-BR') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {loadingEarnings ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Typography variant="body2" color="error.main" fontWeight="bold">
                          ${userEarnings[user.id]?.naoPago?.toFixed(2) || '0.00'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {loadingEarnings ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          ${userEarnings[user.id]?.pago?.toFixed(2) || '0.00'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {loadingEarnings ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                          ${userEarnings[user.id]?.total?.toFixed(2) || '0.00'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            startIcon={<ViewListIcon />}
                            onClick={() => handleViewAllTransactions(user.id, user.nome)}
                            variant="outlined"
                          >
                            Transações
                          </Button>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenDialog(user)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Remover
                          </Button>
                        </Box>
                        
                        {/* Automation Controls */}
                        {showAutomationPanel && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="secondary"
                              onClick={() => evaluateWorker(user.id)}
                              sx={{ fontSize: '0.7rem' }}
                            >
                              📊 Evaluate
                            </Button>
                            
                            {/* Show rating if available */}
                            {workerRatings.find(r => r.worker_id === user.id) && (
                              <Chip
                                label={`${'⭐'.repeat(workerRatings.find(r => r.worker_id === user.id)?.current_rating || 0)}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            
                            {/* Show abuse flag if any */}
                            {abuseReport.find(a => a.worker_id === user.id) && (
                              <Chip
                                label="🚨"
                                size="small"
                                color="error"
                                title={`${abuseReport.find(a => a.worker_id === user.id)?.total_incidents} incidents`}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    
                    {/* NEW: Worker Metrics Column */}
                    <TableCell align="center">
                      {(() => {
                        // Get metrics for this user dynamically
                        const metrics = workerMetrics[user.nome] || 
                                      workerMetrics[user.displayName] || 
                                      workerMetrics[user.id] ||
                                      Object.values(workerMetrics).find(m => m?.authorId === user.id) ||
                                      null;
                        
                        if (metrics) {
                          return (
                            <Box>
                              <Typography variant="caption" color="primary">
                                📊 {metrics.totalActivities || 0} atividades
                              </Typography>
                              <br/>
                              <Typography variant="caption" color="success.main">
                                🌱 {(metrics.efficiency || 0).toFixed(0)}% eficiência
                              </Typography>
                              {metrics.lastActivity && (
                                <>
                                  <br/>
                                  <Typography variant="caption" color="text.secondary">
                                    🕜 {new Date(metrics.lastActivity).toLocaleDateString('pt-BR')}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          );
                        } else {
                          return (
                            <Typography variant="caption" color="text.secondary">
                              Sem dados
                            </Typography>
                          );
                        }
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Editar Usuário' : 'Adicionar Usuário'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="ID do Usuário"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={editMode}
              sx={{ mb: 3 }}
              helperText={editMode ? "ID não pode ser alterado" : "Identificador único do usuário"}
            />
            <TextField
              fullWidth
              label="Nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              disabled={editMode}
              sx={{ mb: 3 }}
              helperText={editMode ? "Nome não pode ser alterado" : "Nome completo do usuário"}
            />
            <FormControl fullWidth>
              <InputLabel>Função</InputLabel>
              <Select
                value={formData.funcao}
                onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                label="Função"
              >
                <MenuItem value="trabalhador">Trabalhador</MenuItem>
                <MenuItem value="gerente">Gerente</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editMode ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Viewer Dialog */}
      <Dialog open={transactionViewerOpen} onClose={handleCloseTransactionViewer} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Todas as Transações - {transactionUserName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedUserTransactions.length} transações
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingTransactions ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={transactionSortBy === 'timestamp'}
                        direction={transactionSortBy === 'timestamp' ? transactionSortOrder : 'asc'}
                        onClick={() => {
                          const isAsc = transactionSortBy === 'timestamp' && transactionSortOrder === 'asc';
                          setTransactionSortOrder(isAsc ? 'desc' : 'asc');
                          setTransactionSortBy('timestamp');
                        }}
                      >
                        Data/Hora
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={transactionSortBy === 'categoria'}
                        direction={transactionSortBy === 'categoria' ? transactionSortOrder : 'asc'}
                        onClick={() => {
                          const isAsc = transactionSortBy === 'categoria' && transactionSortOrder === 'asc';
                          setTransactionSortOrder(isAsc ? 'desc' : 'asc');
                          setTransactionSortBy('categoria');
                        }}
                      >
                        Categoria
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={transactionSortBy === 'tipo'}
                        direction={transactionSortBy === 'tipo' ? transactionSortOrder : 'asc'}
                        onClick={() => {
                          const isAsc = transactionSortBy === 'tipo' && transactionSortOrder === 'asc';
                          setTransactionSortOrder(isAsc ? 'desc' : 'asc');
                          setTransactionSortBy('tipo');
                        }}
                      >
                        Tipo
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={transactionSortBy === 'item'}
                        direction={transactionSortBy === 'item' ? transactionSortOrder : 'asc'}
                        onClick={() => {
                          const isAsc = transactionSortBy === 'item' && transactionSortOrder === 'asc';
                          setTransactionSortOrder(isAsc ? 'desc' : 'asc');
                          setTransactionSortBy('item');
                        }}
                      >
                        Item
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={transactionSortBy === 'quantidade'}
                        direction={transactionSortBy === 'quantidade' ? transactionSortOrder : 'asc'}
                        onClick={() => {
                          const isAsc = transactionSortBy === 'quantidade' && transactionSortOrder === 'asc';
                          setTransactionSortOrder(isAsc ? 'desc' : 'asc');
                          setTransactionSortBy('quantidade');
                        }}
                      >
                        Quantidade
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell>Fonte</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedUserTransactions
                    .sort((a, b) => {
                      let aVal = a[transactionSortBy];
                      let bVal = b[transactionSortBy];
                      
                      if (transactionSortBy === 'timestamp') {
                        aVal = new Date(aVal);
                        bVal = new Date(bVal);
                      }
                      
                      if (transactionSortOrder === 'asc') {
                        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                      } else {
                        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                      }
                    })
                    .map((transaction, index) => (
                    <TableRow key={transaction.id || index}>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.categoria === 'inventario' ? 'Inventário' : 'Financeiro'}
                          color={transaction.categoria === 'inventario' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.tipo === 'adicionar' ? 'Adicionar' : 
                                transaction.tipo === 'remover' ? 'Remover' : 
                                transaction.tipo === 'deposito' ? 'Depósito' : 'Retirada'}
                          color={transaction.tipo === 'adicionar' || transaction.tipo === 'deposito' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {editingTransactionId === transaction.id ? (
                          <TextField
                            size="small"
                            value={editTransactionData.item || ''}
                            onChange={(e) => setEditTransactionData({...editTransactionData, item: e.target.value})}
                            placeholder="Nome do item (ex: milho, junco, trigo)"
                            helperText="corn=milho, bulrush=junco"
                          />
                        ) : (
                          <Typography variant="body2">
                            {transaction.displayName || transaction.item || '-'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {editingTransactionId === transaction.id ? (
                          <TextField
                            size="small"
                            type="number"
                            value={editTransactionData.quantidade || ''}
                            onChange={(e) => setEditTransactionData({...editTransactionData, quantidade: parseInt(e.target.value) || 0})}
                            sx={{ width: 100 }}
                          />
                        ) : (
                          <Typography variant="body2">
                            {transaction.quantidade || '-'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {editingTransactionId === transaction.id ? (
                          <TextField
                            size="small"
                            type="number"
                            step="0.01"
                            value={editTransactionData.valor || ''}
                            onChange={(e) => setEditTransactionData({...editTransactionData, valor: parseFloat(e.target.value) || 0})}
                            sx={{ width: 100 }}
                          />
                        ) : (
                          <Typography variant="body2">
                            {transaction.valor ? `$${transaction.valor.toFixed(2)}` : '-'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {transaction.fonte || 'Sistema'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {editingTransactionId === transaction.id ? (
                          <>
                            <Button
                              size="small"
                              startIcon={<SaveIcon />}
                              onClick={() => handleSaveEditedTransaction(transaction.id)}
                              sx={{ mr: 1 }}
                              variant="contained"
                              color="primary"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="small"
                              startIcon={<CancelIcon />}
                              onClick={handleCancelEditTransaction}
                              color="secondary"
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditTransaction(transaction)}
                              sx={{ mr: 1 }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              Remover
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<AddIcon />}
            onClick={() => {/* TODO: Add new transaction */}}
            variant="outlined"
          >
            Adicionar Transação
          </Button>
          <Button onClick={handleCloseTransactionViewer}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onClose={closeUserDetail} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalhes do Usuário: {selectedUserDetail?.nome}
        </DialogTitle>
        <DialogContent>
          {loadingUserDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Tabs for different sections */}
              <Tabs value={userDetailTab} onChange={(e, v) => setUserDetailTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="📊 Performance" />
                <Tab label={
                  <Badge badgeContent="NEW" color="primary">
                    🔍 Analysis
                  </Badge>
                } />
              </Tabs>
              
              {/* Tab Panel - Performance */}
              {userDetailTab === 0 && (
                <Grid container spacing={3}>
              {/* Performance Summary */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Performance Geral</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">Total de Atividades</Typography>
                        <Typography variant="h6">{userServices.total_atividades || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">Atividades Hoje</Typography>
                        <Typography variant="h6">{userServices.atividades_hoje || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">Itens Adicionados</Typography>
                        <Typography variant="h6" color="success.main">{userServices.itens_adicionados || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">Total a Receber</Typography>
                        <Typography variant="h6" color="success.main">
                          ${(userServices.servicos?.plantacao?.total_a_pagar || 0) + (userServices.servicos?.animais?.total_a_pagar || 0)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Services Details */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">🌱 Serviço de Plantação</Typography>
                      <Button
                        size="small"
                        disabled
                      >
                        Detalhes
                      </Button>
                    </Box>
                    
                    {selectedUserDetail?.funcao === 'gerente' ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <strong>👑 Gerente</strong><br/>
                        Este usuário é um gerente e tem sistema de compensação diferente dos trabalhadores.
                        As atividades são rastreadas para fins administrativos.
                      </Alert>
                    ) : true ? (
                      <>
                        <Typography variant="body1">Total de Plantas: {userServices.servicos?.plantacao?.total_plantas || 0}</Typography>
                        <Typography variant="h6" color="success.main">
                          Total a Pagar: ${(() => {
                            const detalhes = userServices.servicos?.plantacao?.detalhes_por_item || {};
                            return Object.values(detalhes)
                              .reduce((total, item) => {
                                const unpaidTransactions = item.transacoes?.filter(t => !t.pago) || [];
                                return total + unpaidTransactions.reduce((sum, t) => sum + (t.valor || 0), 0);
                              }, 0).toFixed(2);
                          })()}
                        </Typography>
                        
                        {/* Show paid transactions in collapsed view when toggled */}
                        {showPlantPaidTransactions && userServices.servicos?.plantacao?.detalhes_por_item && (
                          <Box sx={{ mt: 2, p: 1, backgroundColor: '#f0f8ff', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                              Transações Pagas:
                            </Typography>
                            {Object.values(userServices.servicos.plantacao.detalhes_por_item).map((item, idx) => {
                              const paidTransactions = item.transacoes?.filter(trans => trans.pago) || [];
                              return paidTransactions.map((trans, tidx) => (
                                <Box key={`${idx}-${tidx}`} sx={{ pl: 2, mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'success.main' }}>
                                    • {item.nome}: {trans.quantidade}x - ${trans.valor.toFixed(2)} ({new Date(trans.timestamp).toLocaleString('pt-BR')})
                                  </Typography>
                                </Box>
                              ));
                            })}
                          </Box>
                        )}
                        
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button 
                            variant="contained" 
                            color="primary" 
                            size="small"
                            disabled={!userServices.servicos?.plantacao?.valor_total}
                            onClick={() => handlePayService(selectedUserDetail.id, 'plantacao')}
                          >
                            Pagar Toda Plantação
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="secondary" 
                            size="small"
                            onClick={() => setShowPlantPaidTransactions(!showPlantPaidTransactions)}
                          >
                            {showPlantPaidTransactions ? 'Ocultar' : 'Mostrar'} Transações Pagas
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            onClick={() => handleUnpayAllTransactions(selectedUserDetail.id, 'plantacao')}
                          >
                            Despagar Todas
                          </Button>
                        </Box>
                      </>
                    ) : (
                      <>
                        {/* Plantas a $0.15 */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Plantas Premium ($0.15 cada)
                          </Typography>
                          {userServices.servicos?.plantacao?.detalhes_por_item && 
                           Object.values(userServices.servicos.plantacao.detalhes_por_item)
                             .filter(item => item.valor_unitario === 0.15)
                             .map((item, idx) => {
                               const unpaidTransactions = item.transacoes?.filter(trans => !trans.pago) || [];
                               const paidTransactions = item.transacoes?.filter(trans => trans.pago) || [];
                               
                               return (
                              <Box key={idx} sx={{ mb: 1, pl: 2 }}>
                                <Typography variant="body2">
                                  {item.nome}: {item.quantidade_total} unidades = ${item.valor_total.toFixed(2)}
                                </Typography>
                                
                                {/* Unpaid Transactions */}
                                {unpaidTransactions.map((trans, tidx) => (
                                  <Box key={tidx} sx={{ pl: 2, mb: 1, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                                    {editingTransaction === trans.id_atividade ? (
                                      // Edit mode
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                          <TextField
                                            size="small"
                                            label="Item"
                                            value={editData.item}
                                            onChange={(e) => setEditData({...editData, item: e.target.value})}
                                            sx={{ flex: 1 }}
                                          />
                                          <TextField
                                            size="small"
                                            label="Quantidade"
                                            type="number"
                                            value={editData.quantidade}
                                            onChange={(e) => setEditData({...editData, quantidade: e.target.value})}
                                            sx={{ width: 100 }}
                                          />
                                          <TextField
                                            size="small"
                                            label="Valor"
                                            type="number"
                                            value={editData.valor}
                                            onChange={(e) => setEditData({...editData, valor: e.target.value})}
                                            sx={{ width: 100 }}
                                          />
                                        </Box>
                                        <TextField
                                          size="small"
                                          label="Data/Hora"
                                          type="datetime-local"
                                          value={editData.timestamp}
                                          onChange={(e) => setEditData({...editData, timestamp: e.target.value})}
                                          InputLabelProps={{ shrink: true }}
                                          fullWidth
                                        />
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            onClick={() => handleSaveEdit(trans.id_atividade)}
                                            startIcon={<SaveIcon />}
                                          >
                                            Salvar
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleCancelEdit}
                                            startIcon={<CancelIcon />}
                                          >
                                            Cancelar
                                          </Button>
                                        </Box>
                                      </Box>
                                    ) : (
                                      // View mode
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography 
                                          variant="caption" 
                                          sx={{
                                            color: 'text.secondary',
                                            flex: 1
                                          }}
                                        >
                                          • {trans.quantidade}x - ${trans.valor.toFixed(2)} ({new Date(trans.timestamp).toLocaleString('pt-BR')})
                                          {trans.pago && ' ✓'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                          {!trans.pago && (
                                            <>
                                              <Button
                                                size="small"
                                                variant="text"
                                                color="primary"
                                                onClick={() => handlePayIndividualTransaction(selectedUserDetail.id, 'plantacao', trans.id_atividade, trans.valor)}
                                                startIcon={<AttachMoneyIcon fontSize="small" />}
                                              >
                                                Pagar
                                              </Button>
                                              <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => handleEditActivity(trans)}
                                                startIcon={<EditIcon fontSize="small" />}
                                              >
                                                Editar
                                              </Button>
                                              <Button
                                                size="small"
                                                variant="text"
                                                color="error"
                                                onClick={() => handleDeleteActivity(trans.id_atividade)}
                                                startIcon={<DeleteIcon fontSize="small" />}
                                              >
                                                Deletar
                                              </Button>
                                            </>
                                          )}
                                          {trans.pago && (
                                            <Chip 
                                              label="Pago" 
                                              size="small" 
                                              color="success" 
                                              variant="outlined"
                                            />
                                          )}
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                ))}
                                
                                {/* Paid Transactions - Show when toggled */}
                                {showPlantPaidTransactions && paidTransactions.length > 0 && (
                                  <Box sx={{ mt: 2, p: 1, backgroundColor: '#f0f8ff', borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                      Transações Pagas:
                                    </Typography>
                                    {paidTransactions.map((trans, pidx) => (
                                      <Box key={pidx} sx={{ pl: 2, mb: 1, border: '1px solid #c8e6c9', borderRadius: 1, p: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <Typography 
                                            variant="caption" 
                                            sx={{
                                              color: 'success.main',
                                              flex: 1
                                            }}
                                          >
                                            • {trans.quantidade}x - ${trans.valor.toFixed(2)} ({new Date(trans.timestamp).toLocaleString('pt-BR')}) ✓
                                          </Typography>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            onClick={() => handleUnpayTransaction(selectedUserDetail.id, 'plantacao', trans.id_atividade)}
                                            sx={{ ml: 1, minWidth: 'auto', px: 1 }}
                                          >
                                            Despagar
                                          </Button>
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            );
                           })}
                          <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                            Subtotal ($0.15): ${userServices.servicos?.plantacao?.valor_total_015 || 0}
                          </Typography>
                        </Box>
                        
                        {/* Plantas a $0.20 */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Outras Plantas ($0.20 cada)
                          </Typography>
                          {userServices.servicos?.plantacao?.detalhes_por_item && 
                           Object.values(userServices.servicos.plantacao.detalhes_por_item)
                             .filter(item => item.valor_unitario === 0.20)
                             .map((item, idx) => (
                              <Box key={idx} sx={{ mb: 1, pl: 2 }}>
                                <Typography variant="body2">
                                  {item.nome}: {item.quantidade_total} unidades = ${item.valor_total.toFixed(2)}
                                </Typography>
                                {item.transacoes && item.transacoes.map((trans, tidx) => (
                                  <Box key={tidx} sx={{ pl: 2, mb: 1, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                                    {editingTransaction === trans.id_atividade ? (
                                      // Edit mode
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                          <TextField
                                            size="small"
                                            label="Item"
                                            value={editData.item}
                                            onChange={(e) => setEditData({...editData, item: e.target.value})}
                                            sx={{ flex: 1 }}
                                          />
                                          <TextField
                                            size="small"
                                            label="Quantidade"
                                            type="number"
                                            value={editData.quantidade}
                                            onChange={(e) => setEditData({...editData, quantidade: e.target.value})}
                                            sx={{ width: 100 }}
                                          />
                                          <TextField
                                            size="small"
                                            label="Valor"
                                            type="number"
                                            value={editData.valor}
                                            onChange={(e) => setEditData({...editData, valor: e.target.value})}
                                            sx={{ width: 100 }}
                                          />
                                        </Box>
                                        <TextField
                                          size="small"
                                          label="Data/Hora"
                                          type="datetime-local"
                                          value={editData.timestamp}
                                          onChange={(e) => setEditData({...editData, timestamp: e.target.value})}
                                          InputLabelProps={{ shrink: true }}
                                          fullWidth
                                        />
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            onClick={() => handleSaveEdit(trans.id_atividade)}
                                            startIcon={<SaveIcon />}
                                          >
                                            Salvar
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleCancelEdit}
                                            startIcon={<CancelIcon />}
                                          >
                                            Cancelar
                                          </Button>
                                        </Box>
                                      </Box>
                                    ) : (
                                      // View mode
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography 
                                          variant="caption" 
                                          sx={{
                                            color: 'text.secondary',
                                            flex: 1
                                          }}
                                        >
                                          • {trans.quantidade}x - ${trans.valor.toFixed(2)} ({new Date(trans.timestamp).toLocaleString('pt-BR')})
                                          {trans.pago && ' ✓'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                          {!trans.pago && (
                                            <>
                                              <Button
                                                size="small"
                                                variant="text"
                                                color="primary"
                                                onClick={() => handlePayIndividualTransaction(selectedUserDetail.id, 'plantacao', trans.id_atividade, trans.valor)}
                                                startIcon={<AttachMoneyIcon fontSize="small" />}
                                              >
                                                Pagar
                                              </Button>
                                              <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => handleEditActivity(trans)}
                                                startIcon={<EditIcon fontSize="small" />}
                                              >
                                                Editar
                                              </Button>
                                              <Button
                                                size="small"
                                                variant="text"
                                                color="error"
                                                onClick={() => handleDeleteActivity(trans.id_atividade)}
                                                startIcon={<DeleteIcon fontSize="small" />}
                                              >
                                                Deletar
                                              </Button>
                                            </>
                                          )}
                                          {trans.pago && (
                                            <Chip 
                                              label="Pago" 
                                              size="small" 
                                              color="success" 
                                              variant="outlined"
                                            />
                                          )}
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                          ))}
                          <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                            Subtotal ($0.20): ${userServices.servicos?.plantacao?.valor_total_020 || 0}
                          </Typography>
                        </Box>
                        
                        {/* Add New Activity */}
                        <Box sx={{ mb: 3, p: 2, border: '2px dashed #ddd', borderRadius: 1 }}>
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setAddingActivity(true);
                              setNewActivityData({
                                ...newActivityData,
                                autor: selectedUserDetail.id,
                                tipo: 'remover',
                                categoria: 'plantacao'
                              });
                            }}
                            disabled={addingActivity}
                          >
                            Adicionar Nova Atividade de Plantação
                          </Button>
                          
                          {addingActivity && (
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <strong>Adicionar Serviço de Plantação:</strong><br/>
                                • <strong>Trabalhador:</strong> Nome do trabalhador que entregou as plantas<br/>
                                • <strong>Valor por Unidade:</strong> $0.15 (milho, junco, trigo) ou $0.20 (outras plantas)<br/>
                                • <strong>Valor Total:</strong> Deixe vazio - será calculado automaticamente
                              </Alert>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                  size="small"
                                  label="Trabalhador"
                                  value={users[newActivityData.autor]?.nome || newActivityData.autor}
                                  disabled
                                  sx={{ flex: 1 }}
                                  helperText="Trabalhador selecionado"
                                />
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                  size="small"
                                  label="Tipo de Planta"
                                  value={newActivityData.item}
                                  onChange={(e) => setNewActivityData({...newActivityData, item: e.target.value})}
                                  sx={{ flex: 1 }}
                                  helperText="Ex: milho, junco, trigo, tomate, etc."
                                  placeholder="Digite o nome da planta"
                                />
                                <TextField
                                  size="small"
                                  label="Quantidade Total"
                                  type="number"
                                  value={newActivityData.quantidade}
                                  onChange={(e) => setNewActivityData({...newActivityData, quantidade: e.target.value})}
                                  sx={{ width: 120 }}
                                  helperText="Número de plantas"
                                />
                                <TextField
                                  size="small"
                                  label="Valor Total ($)"
                                  type="number"
                                  value={newActivityData.valor}
                                  onChange={(e) => setNewActivityData({...newActivityData, valor: e.target.value})}
                                  sx={{ width: 120 }}
                                  helperText="Deixe vazio para calcular automaticamente"
                                  placeholder="Opcional"
                                />
                              </Box>
                              <TextField
                                size="small"
                                label="Data/Hora"
                                type="datetime-local"
                                value={newActivityData.timestamp}
                                onChange={(e) => setNewActivityData({...newActivityData, timestamp: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={handleAddActivity}
                                  startIcon={<SaveIcon />}
                                >
                                  Salvar Atividade
                                </Button>
                                <Button
                                  variant="outlined"
                                  onClick={() => setAddingActivity(false)}
                                  startIcon={<CancelIcon />}
                                >
                                  Cancelar
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </Box>

                        {/* Total */}
                        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                          <Typography variant="h6" color="success.main">
                            Total Geral: ${userServices.servicos?.plantacao?.valor_total || 0}
                          </Typography>
                          <Button 
                            variant="contained" 
                            color="primary" 
                            size="small" 
                            sx={{ mt: 1 }}
                            disabled={!userServices.servicos?.plantacao?.valor_total}
                            onClick={() => handlePayService(selectedUserDetail.id, 'plantacao')}
                          >
                            Pagar Toda Plantação
                          </Button>
                        </Box>
                      </>
                    )}
                    
                    {/* Plantation Service Form - Available regardless of expanded state */}
                    {addingActivity && selectedUserDetail && newActivityData.categoria === 'inventario' && (
                      <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, bgcolor: 'background.paper' }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <strong>Adicionar Serviço de Plantação:</strong><br/>
                          • <strong>Trabalhador:</strong> Nome do trabalhador que entregou as plantas<br/>
                          • <strong>Valor por Unidade:</strong> $0.15 (milho, junco, trigo) ou $0.20 (outras plantas)<br/>
                          • <strong>Valor Total:</strong> Deixe vazio - será calculado automaticamente
                        </Alert>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <TextField
                            size="small"
                            label="Trabalhador"
                            value={users[newActivityData.autor]?.nome || newActivityData.autor}
                            disabled
                            sx={{ flex: 1 }}
                            helperText="Trabalhador selecionado"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <TextField
                            size="small"
                            label="Tipo de Planta"
                            value={newActivityData.item}
                            onChange={(e) => setNewActivityData({...newActivityData, item: e.target.value})}
                            sx={{ flex: 1 }}
                            helperText="Ex: milho, junco, trigo, tomate, etc."
                            placeholder="Digite o nome da planta"
                          />
                          <TextField
                            size="small"
                            label="Quantidade Total"
                            type="number"
                            value={newActivityData.quantidade}
                            onChange={(e) => setNewActivityData({...newActivityData, quantidade: e.target.value})}
                            sx={{ width: 120 }}
                            helperText="Número de plantas"
                          />
                          <TextField
                            size="small"
                            label="Valor Total ($)"
                            type="number"
                            value={newActivityData.valor}
                            onChange={(e) => setNewActivityData({...newActivityData, valor: e.target.value})}
                            sx={{ width: 120 }}
                            helperText="Deixe vazio para calcular automaticamente"
                            placeholder="Opcional"
                          />
                        </Box>
                        <TextField
                          size="small"
                          label="Data/Hora"
                          type="datetime-local"
                          value={newActivityData.timestamp}
                          onChange={(e) => setNewActivityData({...newActivityData, timestamp: e.target.value})}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={handleAddActivity}
                            startIcon={<SaveIcon />}
                          >
                            Salvar Atividade
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setAddingActivity(false)}
                            startIcon={<CancelIcon />}
                          >
                            Cancelar
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">🐄 Serviço de Animais</Typography>
                      <Button
                        size="small"
                        disabled
                      >
                        Detalhes
                      </Button>
                    </Box>
                    
                    {selectedUserDetail?.funcao === 'gerente' ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <strong>👑 Gerente</strong><br/>
                        Este usuário é um gerente e tem sistema de compensação diferente dos trabalhadores.
                        As atividades são rastreadas para fins administrativos.
                      </Alert>
                    ) : true ? (
                      <>
                        <Typography variant="body1">Total de Entregas: {userServices.servicos?.animais?.total_entregas || 0}</Typography>
                        <Typography variant="h6" color="success.main">
                          Total a Pagar: ${(() => {
                            const detalhes = userServices.servicos?.animais?.detalhes || [];
                            return detalhes
                              .filter(d => !d.pago)
                              .reduce((total, d) => total + (d.valor || 0), 0)
                              .toFixed(2);
                          })()}
                        </Typography>
                        
                        {/* Show paid transactions in collapsed view when toggled */}
                        {showAnimalPaidTransactions && userServices.servicos?.animais?.detalhes && (
                          <Box sx={{ mt: 2, p: 1, backgroundColor: '#f0f8ff', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                              Transações Pagas:
                            </Typography>
                            {userServices.servicos.animais.detalhes
                              .filter(entrega => entrega.pago)
                              .map((entrega, idx) => (
                                <Box key={idx} sx={{ pl: 2, mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'success.main' }}>
                                    • {entrega.quantidade || 4} animais - ${entrega.valor || 160} ({new Date(entrega.timestamp).toLocaleString('pt-BR')})
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                        )}
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small" 
                          sx={{ mt: 1, mr: 1 }}
                          disabled={!userServices.servicos?.animais?.valor_total}
                          onClick={() => handlePayService(selectedUserDetail.id, 'animais')}
                        >
                          Pagar Todos Animais
                        </Button>
                        <Button
                          variant="outlined"
                          color="info"
                          size="small"
                          sx={{ mt: 1, mr: 1 }}
                          onClick={() => setShowAnimalPaidTransactions(!showAnimalPaidTransactions)}
                          startIcon={<CheckCircleIcon />}
                        >
                          {showAnimalPaidTransactions ? 'Ocultar' : 'Mostrar'} Transações Pagas
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          sx={{ mt: 1 }}
                          onClick={() => handleUnpayAllTransactions(selectedUserDetail.id, 'animais')}
                          startIcon={<CancelIcon />}
                        >
                          Despagar Todas
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          sx={{ mt: 1, ml: 1 }}
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setAddingActivity(true);
                            setNewActivityData({
                              ...newActivityData,
                              autor: selectedUserDetail.id,
                              tipo: 'deposito',
                              categoria: 'financeiro',
                              item: 'Entrega de Animais',
                              quantidade: 4,
                              valor: 160
                            });
                          }}
                          disabled={addingActivity}
                        >
                          Adicionar Entrega
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Animal Services Sort Controls */}
                        {userServices.servicos?.animais?.detalhes && userServices.servicos.animais.detalhes.length > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Entregas de Animais
                            </Typography>
                            
                            {/* Sort Controls */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <FormControl size="small" sx={{ minWidth: 100 }}>
                                <InputLabel>Ordenar por</InputLabel>
                                <Select
                                  value={animalServicesSortBy}
                                  label="Ordenar por"
                                  onChange={(e) => setAnimalServicesSortBy(e.target.value)}
                                >
                                  <MenuItem value="date">Data</MenuItem>
                                  <MenuItem value="type">Tipo</MenuItem>
                                  <MenuItem value="quantity">Quantidade</MenuItem>
                                  <MenuItem value="value">Valor</MenuItem>
                                </Select>
                              </FormControl>
                              
                              <FormControl size="small" sx={{ minWidth: 80 }}>
                                <InputLabel>Ordem</InputLabel>
                                <Select
                                  value={animalServicesSortOrder}
                                  label="Ordem"
                                  onChange={(e) => setAnimalServicesSortOrder(e.target.value)}
                                >
                                  <MenuItem value="asc">↑ Crescente</MenuItem>
                                  <MenuItem value="desc">↓ Decrescente</MenuItem>
                                </Select>
                              </FormControl>
                            </Box>
                          </Box>
                        )}
                        
                        {userServices.servicos?.animais?.detalhes && userServices.servicos.animais.detalhes.length > 0 ? (
                          sortAnimalServices(userServices.servicos.animais.detalhes, animalServicesSortBy, animalServicesSortOrder).map((entrega, idx) => (
                            <Box key={idx} sx={{ 
                              mb: 3, 
                              p: 2, 
                              border: 1, 
                              borderColor: entrega.pago ? 'grey.300' : 'divider', 
                              borderRadius: 1,
                              backgroundColor: entrega.pago ? 'grey.50' : 'background.paper'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography 
                                  variant="subtitle1" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: entrega.pago ? 'text.disabled' : 'text.primary',
                                    textDecoration: entrega.pago ? 'line-through' : 'none'
                                  }}
                                >
                                  Entrega #{idx + 1} - {new Date(entrega.timestamp).toLocaleString('pt-BR')}
                                  {entrega.pago && ' ✓'}
                                </Typography>
                                {entrega.status === 'completa' && !entrega.pago && (
                                  <Chip label="COMPLETA" size="small" color="success" sx={{ ml: 1 }} />
                                )}
                                {entrega.status === 'incompleta' && (
                                  <Chip label="INCOMPLETA" size="small" color="warning" sx={{ ml: 1 }} />
                                )}
                              </Box>
                              
                              {/* Status and Problems */}
                              {entrega.problemas && entrega.problemas.length > 0 && (
                                <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#856404', mb: 1 }}>
                                    ⚠️ Problemas Detectados:
                                  </Typography>
                                  {entrega.problemas.map((problema, pidx) => (
                                    <Typography key={pidx} variant="body2" sx={{ display: 'block', pl: 1, color: '#856404' }}>
                                      • {problema}
                                    </Typography>
                                  ))}
                                </Box>
                              )}
                              
                              {/* Honesty Score */}
                              {entrega.honesty_score !== undefined && (
                                <Box sx={{ 
                                  mb: 2, 
                                  p: 1.5, 
                                  backgroundColor: entrega.honesty_score < 50 ? '#f8d7da' : entrega.honesty_score < 80 ? '#fff3cd' : '#d1edff',
                                  border: `1px solid ${entrega.honesty_score < 50 ? '#f5c6cb' : entrega.honesty_score < 80 ? '#ffeaa7' : '#bee5eb'}`,
                                  borderRadius: 1 
                                }}>
                                  <Typography variant="body2" fontWeight="bold" sx={{
                                    color: entrega.honesty_score < 50 ? '#721c24' : entrega.honesty_score < 80 ? '#856404' : '#0c5460'
                                  }}>
                                    📊 Pontuação de Honestidade: {entrega.honesty_score}%
                                  </Typography>
                                </Box>
                              )}
                              
                              {/* Inventory Withdrawn */}
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                                  📦 Inventário Retirado:
                                </Typography>
                                
                                {/* Combined Animals and Feed List */}
                                <Box sx={{ pl: 1, mb: 2 }}>
                                  {/* Animals */}
                                  {entrega.animais_retirados && entrega.animais_retirados.length > 0 ? (
                                    entrega.animais_retirados.map((animal, aidx) => (
                                      <Typography key={`animal-${aidx}`} variant="body2" sx={{ display: 'block', mb: 0.5, color: 'text.primary' }}>
                                        • {animal.quantidade}x {animal.displayName} retirados em {new Date(animal.timestamp).toLocaleString('pt-BR')}
                                      </Typography>
                                    ))
                                  ) : null}
                                  
                                  {/* Feed */}
                                  {entrega.racao_retirado && entrega.racao_retirado.length > 0 ? (
                                    entrega.racao_retirado.map((racao, ridx) => (
                                      <Typography key={`feed-${ridx}`} variant="body2" sx={{ display: 'block', mb: 0.5, color: 'text.primary' }}>
                                        • {racao.quantidade}x {racao.displayName} retirado em {new Date(racao.timestamp).toLocaleString('pt-BR')}
                                      </Typography>
                                    ))
                                  ) : null}
                                  
                                  {/* Returns to inventory */}
                                  {((entrega.animais_devolvidos && entrega.animais_devolvidos.length > 0) ||
                                    (entrega.racao_devolvido && entrega.racao_devolvido.length > 0)) && (
                                    <Box sx={{ mt: 1, pl: 1, borderLeft: '3px solid #4caf50' }}>
                                      <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ mb: 0.5 }}>
                                        ✅ Devolvido ao Estoque:
                                      </Typography>
                                      {entrega.animais_devolvidos && entrega.animais_devolvidos.map((animal, aidx) => (
                                        <Typography key={`return-animal-${aidx}`} variant="body2" sx={{ display: 'block', mb: 0.5, color: 'success.dark', fontSize: '0.875rem' }}>
                                          • {animal.quantidade}x {animal.displayName} devolvidos em {new Date(animal.timestamp).toLocaleString('pt-BR')}
                                        </Typography>
                                      ))}
                                      {entrega.racao_devolvido && entrega.racao_devolvido.map((racao, ridx) => (
                                        <Typography key={`return-feed-${ridx}`} variant="body2" sx={{ display: 'block', mb: 0.5, color: 'success.dark', fontSize: '0.875rem' }}>
                                          • {racao.quantidade}x {racao.displayName} devolvido em {new Date(racao.timestamp).toLocaleString('pt-BR')}
                                        </Typography>
                                      ))}
                                    </Box>
                                  )}
                                  
                                  {/* No withdrawals detected */}
                                  {(!entrega.animais_retirados || entrega.animais_retirados.length === 0) && 
                                   (!entrega.racao_retirado || entrega.racao_retirado.length === 0) && (
                                    <Typography variant="body2" color="error" sx={{ fontStyle: 'italic' }}>
                                      ⚠️ Nenhuma retirada de inventário detectada
                                    </Typography>
                                  )}
                                </Box>
                                
                                {/* Net Balance Summary */}
                                <Box sx={{ mb: 2, p: 1, backgroundColor: '#e8f5e8', borderRadius: 1, border: '1px solid #c8e6c9' }}>
                                  <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ mb: 1 }}>
                                    📊 Resumo Líquido:
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'success.dark' }}>
                                    • Animais líquidos utilizados: {entrega.animais_net_retirados || 0} (esperado: 4)
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'success.dark' }}>
                                    • Ração líquida utilizada: {entrega.racao_net_retirado || 0} (esperado: 8)
                                  </Typography>
                                </Box>
                                
                                {/* Animals Delivered */}
                                <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ mb: 1 }}>
                                  🐄 Animais Entregues:
                                </Typography>
                                <Typography variant="body2" sx={{ pl: 1, mb: 2, color: 'success.dark' }}>
                                  • 4 animais entregues em {new Date(entrega.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              </Box>
                              
                              {/* Materials Produced */}
                              {entrega.materiais_produzidos && Object.keys(entrega.materiais_produzidos).length > 0 && (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mb: 1,
                                    color: entrega.pago ? 'text.disabled' : 'success.main',
                                    textDecoration: entrega.pago ? 'line-through' : 'none'
                                  }}
                                >
                                  Materiais: {Object.entries(entrega.materiais_produzidos).map(([material, qty]) => `${qty} ${material}`).join(', ')}
                                </Typography>
                              )}
                              
                              {/* Financial Summary */}
                              <Box sx={{ mb: 1 }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: entrega.pago ? 'text.disabled' : 'text.primary',
                                    textDecoration: entrega.pago ? 'line-through' : 'none'
                                  }}
                                >
                                  Receita: ${entrega.valor_fazenda} (pagamento) + ${entrega.valor_materiais || 0} (materiais) = ${entrega.receita_total || entrega.valor_fazenda}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: entrega.pago ? 'text.disabled' : 'text.primary',
                                    textDecoration: entrega.pago ? 'line-through' : 'none'
                                  }}
                                >
                                  Custos: ${entrega.custos?.total || 'N/A'} (animais: ${entrega.custos?.animais || 0}, ração: ${entrega.custos?.racao || 0}, worker: ${entrega.pagamento_worker})
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: entrega.pago ? 'text.disabled' : (entrega.lucro_real > 0 ? 'success.main' : 'error.main'),
                                    textDecoration: entrega.pago ? 'line-through' : 'none'
                                  }}
                                >
                                  Lucro Real: ${entrega.lucro_real || 'N/A'}
                                </Typography>
                              </Box>
                              
                              {/* Lista de animais */}
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  mb: 1, 
                                  display: 'block',
                                  color: entrega.pago ? 'text.disabled' : 'textSecondary',
                                  textDecoration: entrega.pago ? 'line-through' : 'none'
                                }}
                              >
                                Animais Entregues:
                              </Typography>
                              {entrega.animais_por_tipo && Object.entries(entrega.animais_por_tipo).map(([tipo, quantidade]) => (
                                <Typography 
                                  key={tipo} 
                                  variant="caption" 
                                  sx={{ 
                                    pl: 2, 
                                    display: 'block',
                                    color: entrega.pago ? 'text.disabled' : 'textSecondary',
                                    textDecoration: entrega.pago ? 'line-through' : 'none'
                                  }}
                                >
                                  • {tipo} x{quantidade}
                                </Typography>
                              ))}
                              
                              {/* Feed consumption */}
                              {entrega.racao_usado && entrega.racao_usado.length > 0 && (
                                <>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      mb: 1, 
                                      mt: 1,
                                      display: 'block',
                                      color: entrega.pago ? 'text.disabled' : 'textSecondary',
                                      textDecoration: entrega.pago ? 'line-through' : 'none'
                                    }}
                                  >
                                    Ração Consumida:
                                  </Typography>
                                  {entrega.racao_usado.map((racao, ridx) => (
                                    <Typography 
                                      key={ridx} 
                                      variant="caption" 
                                      sx={{ 
                                        pl: 2, 
                                        display: 'block',
                                        color: entrega.pago ? 'text.disabled' : 'textSecondary',
                                        textDecoration: entrega.pago ? 'line-through' : 'none'
                                      }}
                                    >
                                      • {racao.item} x{racao.quantidade}
                                    </Typography>
                                  ))}
                                </>
                              )}
                              
                              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                {!entrega.pago ? (
                                  <>
                                    <Button
                                      size="small"
                                      variant="text"
                                      color="primary"
                                      onClick={() => handlePayIndividualTransaction(selectedUserDetail.id, 'animais', entrega.id_atividade, entrega.pagamento_worker)}
                                      startIcon={<AttachMoneyIcon fontSize="small" />}
                                    >
                                      Pagar Entrega (${entrega.pagamento_worker})
                                    </Button>
                                    {entrega.id_atividade && (
                                      <>
                                        <Button
                                          size="small"
                                          variant="text"
                                          onClick={() => handleEditActivity(entrega)}
                                          startIcon={<EditIcon fontSize="small" />}
                                        >
                                          Editar
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="text"
                                          color="error"
                                          onClick={() => handleDeleteActivity(entrega.id_atividade)}
                                          startIcon={<DeleteIcon fontSize="small" />}
                                        >
                                          Deletar
                                        </Button>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <Chip 
                                    label="Pago" 
                                    size="small" 
                                    color="success" 
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Typography color="textSecondary">Nenhuma entrega de animais registrada</Typography>
                        )}
                        
                        {/* Paid Animal Transactions - Show when toggled */}
                        {showAnimalPaidTransactions && userServices.servicos?.animais?.detalhes && (
                          <Box sx={{ mt: 2, p: 1, backgroundColor: '#f0f8ff', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                              Transações Pagas:
                            </Typography>
                            {userServices.servicos.animais.detalhes
                              .filter(entrega => entrega.pago)
                              .map((entrega, idx) => (
                                <Box key={idx} sx={{ pl: 2, mb: 1, border: '1px solid #c8e6c9', borderRadius: 1, p: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography 
                                      variant="caption" 
                                      sx={{
                                        color: 'success.main',
                                        flex: 1
                                      }}
                                    >
                                      • {entrega.quantidade || 4} animais - ${entrega.valor || 160} ({new Date(entrega.timestamp).toLocaleString('pt-BR')}) ✓
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      onClick={() => handleUnpayTransaction(entrega.id_atividade, 'animais')}
                                      sx={{ ml: 1 }}
                                    >
                                      Despagar
                                    </Button>
                                  </Box>
                                </Box>
                              ))}
                          </Box>
                        )}
                        
                        {/* Add New Animal Activity */}
                        <Box sx={{ mb: 3, p: 2, border: '2px dashed #ddd', borderRadius: 1 }}>
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setAddingActivity(true);
                              setNewActivityData({
                                ...newActivityData,
                                autor: selectedUserDetail.id,
                                tipo: 'deposito',
                                categoria: 'financeiro'
                              });
                            }}
                            disabled={addingActivity}
                          >
                            Adicionar Nova Entrega de Animais
                          </Button>
                          
                          {addingActivity && (
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <strong>Entrega de Animais:</strong><br/>
                                • <strong>Trabalhador:</strong> {users[newActivityData.autor]?.nome || newActivityData.autor}<br/>
                                • <strong>Serviço:</strong> Entrega de animais de criação<br/>
                                • <strong>Valor padrão:</strong> $40 por animal (4 animais = $160)
                              </Alert>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                  size="small"
                                  label="Trabalhador"
                                  value={users[newActivityData.autor]?.nome || newActivityData.autor}
                                  disabled
                                  sx={{ flex: 1 }}
                                  helperText="Trabalhador selecionado"
                                />
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                  size="small"
                                  label="Quantidade de Animais"
                                  type="number"
                                  value={newActivityData.quantidade || 4}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 0;
                                    const totalValue = qty * 40;
                                    setNewActivityData({
                                      ...newActivityData, 
                                      quantidade: e.target.value,
                                      valor: totalValue,
                                      item: 'Entrega de Animais'
                                    });
                                  }}
                                  sx={{ width: 150 }}
                                  helperText="Quantidade de animais entregues"
                                />
                                <TextField
                                  size="small"
                                  label="Valor Total ($)"
                                  type="number"
                                  value={newActivityData.valor || (newActivityData.quantidade || 4) * 40}
                                  onChange={(e) => setNewActivityData({...newActivityData, valor: e.target.value})}
                                  sx={{ width: 120 }}
                                  helperText="$40 por animal"
                                />
                              </Box>
                              <TextField
                                size="small"
                                label="Data/Hora da Entrega"
                                type="datetime-local"
                                value={newActivityData.timestamp}
                                onChange={(e) => setNewActivityData({...newActivityData, timestamp: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                helperText="Data e hora da entrega dos animais"
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={async () => {
                                    // Set default values for animal delivery  
                                    const quantidade = parseInt(newActivityData.quantidade) || 4;
                                    const valor = newActivityData.valor || (quantidade * 40);
                                    
                                    // Update state with final values
                                    const finalData = {
                                      ...newActivityData,
                                      tipo: 'deposito',
                                      categoria: 'financeiro',
                                      item: 'Entrega de Animais',
                                      quantidade: quantidade,
                                      valor: valor
                                    };
                                    
                                    // Update state and wait for it to settle
                                    await new Promise(resolve => {
                                      setNewActivityData(finalData);
                                      setTimeout(resolve, 0);
                                    });
                                    
                                    // Now call the handler
                                    handleAddActivity();
                                  }}
                                  startIcon={<SaveIcon />}
                                >
                                  Registrar Entrega
                                </Button>
                                <Button
                                  variant="outlined"
                                  onClick={() => setAddingActivity(false)}
                                  startIcon={<CancelIcon />}
                                >
                                  Cancelar
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </Box>
                        
                        {/* Total */}
                        {userServices.servicos?.animais?.total_entregas > 0 && (
                          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                            <Typography variant="h6" color="success.main">
                              Total Geral: ${userServices.servicos?.animais?.valor_total || 0}
                            </Typography>
                            <Button 
                              variant="contained" 
                              color="primary" 
                              size="small" 
                              sx={{ mt: 1, mr: 1 }}
                              disabled={!userServices.servicos?.animais?.valor_total}
                              onClick={() => handlePayService(selectedUserDetail.id, 'animais')}
                            >
                              Pagar Todos Animais
                            </Button>
                            <Button
                              variant="outlined"
                              color="info"
                              size="small"
                              sx={{ mt: 1, mr: 1 }}
                              onClick={() => setShowAnimalPaidTransactions(!showAnimalPaidTransactions)}
                              startIcon={<CheckCircleIcon />}
                            >
                              {showAnimalPaidTransactions ? 'Ocultar Pagos' : 'Ver Pagos'}
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              sx={{ mt: 1 }}
                              onClick={() => handleUnpayAllTransactions(selectedUserDetail.id, 'animais')}
                              startIcon={<CancelIcon />}
                            >
                              Despagar Todas
                            </Button>
                          </Box>
                        )}
                      </>
                    )}
                    
                    {/* Animal Service Form - Available regardless of expanded state */}
                    {addingActivity && selectedUserDetail && newActivityData.categoria === 'financeiro' && newActivityData.item === 'Entrega de Animais' && (
                      <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, bgcolor: 'background.paper' }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <strong>Entrega de Animais:</strong><br/>
                          • <strong>Trabalhador:</strong> {users[newActivityData.autor]?.nome || newActivityData.autor}<br/>
                          • <strong>Serviço:</strong> Entrega de animais de criação<br/>
                          • <strong>Valor padrão:</strong> $40 por animal (4 animais = $160)
                        </Alert>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <TextField
                            size="small"
                            label="Trabalhador"
                            value={users[newActivityData.autor]?.nome || newActivityData.autor}
                            disabled
                            sx={{ flex: 1 }}
                            helperText="Trabalhador selecionado"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <TextField
                            size="small"
                            label="Quantidade de Animais"
                            type="number"
                            value={newActivityData.quantidade || 4}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 0;
                              const totalValue = qty * 40;
                              setNewActivityData({
                                ...newActivityData, 
                                quantidade: e.target.value,
                                valor: totalValue,
                                item: 'Entrega de Animais'
                              });
                            }}
                            sx={{ width: 150 }}
                            helperText="Quantidade de animais entregues"
                          />
                          <TextField
                            size="small"
                            label="Valor Total ($)"
                            type="number"
                            value={newActivityData.valor || (newActivityData.quantidade || 4) * 40}
                            onChange={(e) => setNewActivityData({...newActivityData, valor: e.target.value})}
                            sx={{ width: 120 }}
                            helperText="$40 por animal"
                          />
                        </Box>
                        <TextField
                          size="small"
                          label="Data/Hora da Entrega"
                          type="datetime-local"
                          value={newActivityData.timestamp}
                          onChange={(e) => setNewActivityData({...newActivityData, timestamp: e.target.value})}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          sx={{ mb: 2 }}
                          helperText="Data e hora da entrega dos animais"
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={async () => {
                              // Set default values for animal delivery  
                              const quantidade = parseInt(newActivityData.quantidade) || 4;
                              const valor = newActivityData.valor || (quantidade * 40);
                              
                              // Update state with final values
                              const finalData = {
                                ...newActivityData,
                                tipo: 'deposito',
                                categoria: 'financeiro',
                                item: 'Entrega de Animais',
                                quantidade: quantidade,
                                valor: valor
                              };
                              
                              // Update state and call handler
                              setNewActivityData(finalData);
                              // Call handler directly with current data
                              handleAddActivity();
                            }}
                            startIcon={<SaveIcon />}
                          >
                            Registrar Entrega
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setAddingActivity(false)}
                            startIcon={<CancelIcon />}
                          >
                            Cancelar
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Inventory Abuse Tracking - REMOVED AS REQUESTED */}
              {false && userServices.inventario_abuse && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box 
                        sx={{ display: 'flex', alignItems: 'center', mb: 2, cursor: 'pointer' }}
                        // Abuse control removed
                      >
                        <Typography variant="h6" sx={{ mr: 2 }}>
                          🚨 Controle de Estoque e Abusos
                        </Typography>
                        <IconButton size="small" sx={{ ml: 'auto' }}>
                          <ExpandMoreIcon />
                        </IconButton>
                        {userServices.inventario_abuse.total_charges > 0 && (
                          <Chip 
                            label={`-$${userServices.inventario_abuse.total_charges}`} 
                            color="error" 
                            size="small"
                          />
                        )}
                        {userServices.inventario_abuse.violations.length === 0 && (
                          <Chip 
                            label="✅ Sem Violações" 
                            color="success" 
                            size="small"
                          />
                        )}
                      </Box>

                      {false && (
                        <>
                          {/* Violations Summary */}
                          {userServices.inventario_abuse.violations.length > 0 && (
                            <Box sx={{ mb: 3, p: 2, backgroundColor: 'error.light', borderRadius: 1 }}>
                              <Typography variant="subtitle2" color="error.dark" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Violações Detectadas:
                              </Typography>
                              {userServices.inventario_abuse.violations.map((violation, idx) => (
                                <Typography key={idx} variant="body2" color="error.dark">
                                  • {violation}
                                </Typography>
                              ))}
                            </Box>
                          )}

                      {/* Unreturned Tools */}
                      {userServices.inventario_abuse.unreturned_tools.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            🔧 Ferramentas Não Devolvidas:
                          </Typography>
                          {userServices.inventario_abuse.unreturned_tools.map((tool, idx) => (
                            <Box key={idx} sx={{ pl: 2, mb: 2, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                              <Typography variant="body2">
                                • {tool.item}: {tool.unreturned} não devolvidas 
                                (emprestadas: {tool.borrowed}, devolvidas: {tool.returned})
                              </Typography>
                              <Typography variant="caption" color="error">
                                Cobrança: ${tool.total_charge} ({tool.unreturned} × ${tool.cost_per_item})
                              </Typography>
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleAbuseAction(selectedUserDetail.id, 'charge', 'tool', idx, tool)}
                                >
                                  Cobrar ${tool.total_charge}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => handleAbuseAction(selectedUserDetail.id, 'ignore', 'tool', idx, tool)}
                                >
                                  Ignorar
                                </Button>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Suspicious Items */}
                      {userServices.inventario_abuse.suspicious_items.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            ⚠️ Itens Suspeitos:
                          </Typography>
                          {userServices.inventario_abuse.suspicious_items.map((item, idx) => (
                            <Box key={idx} sx={{ pl: 2, mb: 2, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                              <Typography variant="body2">
                                • {item.item}: {item.quantity} unidades
                              </Typography>
                              <Typography variant="caption" color="warning.main">
                                Cobrança: ${item.charge}
                              </Typography>
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleAbuseAction(selectedUserDetail.id, 'charge', 'suspicious', idx, item)}
                                >
                                  Cobrar ${item.charge}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => handleAbuseAction(selectedUserDetail.id, 'ignore', 'suspicious', idx, item)}
                                >
                                  Ignorar
                                </Button>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Excess Consumption */}
                      {userServices.inventario_abuse.excess_consumption.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            📊 Consumo Excessivo:
                          </Typography>
                          {userServices.inventario_abuse.excess_consumption.map((excess, idx) => (
                            <Box key={idx} sx={{ pl: 2, mb: 2, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                              <Typography variant="body2">
                                • {excess.item}: {excess.consumed} usado (limite: {excess.reasonable_limit})
                              </Typography>
                              <Typography variant="caption" color="warning.main">
                                Excesso: {excess.excess} unidades, Cobrança: ${excess.charge}
                              </Typography>
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleAbuseAction(selectedUserDetail.id, 'charge', 'excess', idx, excess)}
                                >
                                  Cobrar ${excess.charge}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => handleAbuseAction(selectedUserDetail.id, 'ignore', 'excess', idx, excess)}
                                >
                                  Ignorar
                                </Button>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Net Payment Summary */}
                      {userServices.pagamento_liquido !== undefined && (
                        <Box sx={{ mt: 2, p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            💰 Resumo Financeiro:
                          </Typography>
                          <Typography variant="body2">
                            Ganhos Brutos: ${userServices.servicos?.total_ganhos || 0}
                          </Typography>
                          <Typography variant="body2" color="error">
                            Deduções por Abuso: -${userServices.inventario_abuse.total_charges}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            Pagamento Líquido: ${userServices.pagamento_liquido}
                          </Typography>
                        </Box>
                      )}
                      </>
                    )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {/* Payment Actions */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">Ações de Pagamento</Typography>
                      <Button
                        variant="outlined"
                        color="info"
                        size="small"
                        onClick={() => {
                          setShowPaidTransactions(!showPaidTransactions);
                        }}
                        startIcon={<CheckCircleIcon />}
                      >
                        {showPaidTransactions ? 'Ocultar Pagos' : 'Ver Pagos'}
                      </Button>
                    </Box>
                    <Button 
                      variant="contained" 
                      color="success" 
                      size="large"
                      disabled={((userServices.servicos?.plantacao?.total_a_pagar || 0) + (userServices.servicos?.animais?.total_a_pagar || 0)) <= 0}
                      onClick={() => handlePayAllServices(selectedUserDetail.id)}
                      sx={{ mr: 2 }}
                    >
                      Pagar Todos os Serviços (${((userServices.servicos?.plantacao?.total_a_pagar || 0) + (userServices.servicos?.animais?.total_a_pagar || 0)).toFixed(2)})
                    </Button>
                    
                    {/* Show paid transactions from service details */}
                    {showPaidTransactions && userServices.servicos && (
                      <Box sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1">Transações Pagas</Typography>
                          
                          {/* Sort Controls */}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <InputLabel>Ordenar por</InputLabel>
                              <Select
                                value={paidTransactionsSortBy}
                                label="Ordenar por"
                                onChange={(e) => setPaidTransactionsSortBy(e.target.value)}
                              >
                                <MenuItem value="date">Data</MenuItem>
                                <MenuItem value="type">Tipo</MenuItem>
                                <MenuItem value="quantity">Quantidade</MenuItem>
                                <MenuItem value="value">Valor</MenuItem>
                              </Select>
                            </FormControl>
                            
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                              <InputLabel>Ordem</InputLabel>
                              <Select
                                value={paidTransactionsSortOrder}
                                label="Ordem"
                                onChange={(e) => setPaidTransactionsSortOrder(e.target.value)}
                              >
                                <MenuItem value="asc">↑ Crescente</MenuItem>
                                <MenuItem value="desc">↓ Decrescente</MenuItem>
                              </Select>
                            </FormControl>
                          </Box>
                        </Box>
                        
                        {/* Paid Plantation Transactions */}
                        {userServices.servicos.plantacao?.detalhes_por_item && (() => {
                          // Collect all paid plantation transactions
                          const allPaidPlantationTransactions = [];
                          Object.values(userServices.servicos.plantacao.detalhes_por_item).forEach(item => {
                            const paidTransactions = item.transacoes?.filter(trans => trans.pago) || [];
                            paidTransactions.forEach(trans => {
                              allPaidPlantationTransactions.push({
                                ...trans,
                                item: item.nome
                              });
                            });
                          });
                          
                          // Sort transactions
                          const sortedTransactions = sortPaidTransactions(allPaidPlantationTransactions, paidTransactionsSortBy, paidTransactionsSortOrder);
                          
                          return sortedTransactions.length > 0 ? (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>Plantação</Typography>
                              {sortedTransactions.map((trans, idx) => (
                                <Box key={idx} sx={{ pl: 2, mb: 1, border: '1px solid #c8e6c9', borderRadius: 1, p: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                      <Typography variant="caption">
                                        {trans.item}: {trans.quantidade} x ${trans.valor_unitario} = ${trans.valor_total}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                        {new Date(trans.timestamp).toLocaleString('pt-BR')}
                                      </Typography>
                                    </Box>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      onClick={() => handleUnpayTransaction(selectedUserDetail.id, 'plantacao', trans.id_atividade || trans.id)}
                                      startIcon={<CancelIcon />}
                                    >
                                      Despagar
                                    </Button>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          ) : null;
                        })()}
                        
                        {/* Paid Animal Transactions */}
                        {userServices.servicos.animais?.detalhes && (() => {
                          // Collect all paid animal transactions
                          const allPaidAnimalTransactions = userServices.servicos.animais.detalhes
                            .filter(entrega => entrega.pago)
                            .map(entrega => ({
                              ...entrega,
                              quantidade: entrega.quantidade || 4,
                              valor_total: entrega.valor || 160,
                              item: 'Entrega de Animais'
                          }));
                          
                          // Sort transactions
                          const sortedTransactions = sortPaidTransactions(allPaidAnimalTransactions, paidTransactionsSortBy, paidTransactionsSortOrder);
                          
                          return (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>Animais</Typography>
                              {sortedTransactions.map((entrega, idx) => (
                                <Box key={idx} sx={{ pl: 2, mb: 1, border: '1px solid #c8e6c9', borderRadius: 1, p: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                      <Typography variant="caption">
                                        {entrega.quantidade || 4} animais = ${entrega.valor || 160}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                        {new Date(entrega.timestamp).toLocaleString('pt-BR')}
                                      </Typography>
                                    </Box>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      onClick={() => handleUnpayTransaction(selectedUserDetail.id, 'animais', entrega.id_atividade || entrega.id)}
                                      startIcon={<CancelIcon />}
                                    >
                                      Despagar
                                    </Button>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          );
                        })()}
                        
                        {/* No paid transactions message */}
                        {(!userServices.servicos.plantacao?.detalhes_por_item || 
                          !Object.values(userServices.servicos.plantacao.detalhes_por_item).some(item => item.transacoes?.some(trans => trans.pago))) &&
                         (!userServices.servicos.animais?.detalhes || !userServices.servicos.animais.detalhes.some(entrega => entrega.pago)) && (
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma transação paga encontrada
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Recent Activities - REMOVED AS REQUESTED */}
              {false && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        Atividades Recentes
                        <IconButton 
                          size="small" 
                          disabled
                          sx={{ ml: 1 }}
                        >
                          {expandedRecentActivities ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Typography>
                      {expandedRecentActivities && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => setAddingRecentActivity(true)}
                        >
                          Adicionar
                        </Button>
                      )}
                    </Box>
                    
                    {expandedRecentActivities && (
                      <>
                        {/* Sorting and Filtering Controls */}
                        <Box sx={{ mb: 2 }}>
                          {/* First row - Sorting controls */}
                          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>Ordenar por</InputLabel>
                              <Select
                                value={recentActivitiesSortBy}
                                onChange={(e) => setRecentActivitiesSortBy(e.target.value)}
                                label="Ordenar por"
                              >
                                <MenuItem value="date">Data</MenuItem>
                                <MenuItem value="name">Nome</MenuItem>
                                <MenuItem value="quantity">Quantidade</MenuItem>
                                <MenuItem value="type">Tipo</MenuItem>
                                <MenuItem value="added_removed">Adicionado/Removido</MenuItem>
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <InputLabel>Ordem</InputLabel>
                              <Select
                                value={recentActivitiesSortOrder}
                                onChange={(e) => setRecentActivitiesSortOrder(e.target.value)}
                                label="Ordem"
                              >
                                <MenuItem value="asc">Crescente</MenuItem>
                                <MenuItem value="desc">Decrescente</MenuItem>
                              </Select>
                            </FormControl>
                            <Button
                              size="small"
                              variant={showAllActivities ? "contained" : "outlined"}
                              onClick={() => setShowAllActivities(!showAllActivities)}
                              startIcon={<ViewListIcon />}
                            >
                              {showAllActivities ? "Mostrar Recentes" : "Mostrar Todas"}
                            </Button>
                          </Box>
                          
                          {/* Second row - Date and Name filtering */}
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                              size="small"
                              label="Filtrar por nome (exato)"
                              placeholder="Digite o nome do item..."
                              value={activitiesNameFilter}
                              onChange={(e) => setActivitiesNameFilter(e.target.value)}
                              sx={{ minWidth: 200 }}
                              InputProps={{
                                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                              }}
                            />
                            <TextField
                              size="small"
                              type="date"
                              label="Data Inicial"
                              value={activitiesDateFrom}
                              onChange={(e) => setActivitiesDateFrom(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ minWidth: 150 }}
                            />
                            <TextField
                              size="small"
                              type="date"
                              label="Data Final"
                              value={activitiesDateTo}
                              onChange={(e) => setActivitiesDateTo(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ minWidth: 150 }}
                            />
                            {(activitiesDateFrom || activitiesDateTo) && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setActivitiesDateFrom('');
                                  setActivitiesDateTo('');
                                }}
                              >
                                Limpar Filtro
                              </Button>
                            )}
                            <Typography variant="caption" color="textSecondary">
                              {(() => {
                                const filtered = getDisplayedActivities(userServices.atividades_recentes || []);
                                const total = userServices.atividades_recentes?.length || 0;
                                return `Mostrando ${filtered.length} de ${total} atividades`;
                              })()}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Add Activity Form */}
                        {addingRecentActivity && (
                          <Box sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>Adicionar Nova Atividade</Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Tipo</InputLabel>
                                  <Select
                                    value={newRecentActivityData.tipo}
                                    onChange={(e) => setNewRecentActivityData({...newRecentActivityData, tipo: e.target.value})}
                                    label="Tipo"
                                  >
                                    <MenuItem value="adicionar">Adicionar</MenuItem>
                                    <MenuItem value="remover">Remover</MenuItem>
                                    <MenuItem value="deposito">Depósito</MenuItem>
                                    <MenuItem value="saque">Saque</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Item"
                                  value={newRecentActivityData.item}
                                  onChange={(e) => setNewRecentActivityData({...newRecentActivityData, item: e.target.value})}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Quantidade"
                                  type="number"
                                  value={newRecentActivityData.quantidade}
                                  onChange={(e) => setNewRecentActivityData({...newRecentActivityData, quantidade: e.target.value})}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Valor"
                                  type="number"
                                  value={newRecentActivityData.valor}
                                  onChange={(e) => setNewRecentActivityData({...newRecentActivityData, valor: e.target.value})}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Data/Hora"
                                  type="datetime-local"
                                  value={newRecentActivityData.timestamp}
                                  onChange={(e) => setNewRecentActivityData({...newRecentActivityData, timestamp: e.target.value})}
                                />
                              </Grid>
                            </Grid>
                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleAddRecentActivity}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={() => setAddingRecentActivity(false)}
                              >
                                Cancelar
                              </Button>
                            </Box>
                          </Box>
                        )}

                        {/* Activities List */}
                        {userServices.atividades_recentes && userServices.atividades_recentes.length > 0 ? (
                          <List>
                            {getDisplayedActivities(userServices.atividades_recentes).map((atividade, index) => (
                              <ListItem key={atividade.id || index} divider>
                                <ListItemIcon>
                                  {atividade.tipo === 'adicionar' ? '📦' : atividade.tipo === 'remover' ? '📤' : '💰'}
                                </ListItemIcon>
                                
                                {editingActivity?.id === atividade.id ? (
                                  // Edit mode
                                  <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <TextField
                                      size="small"
                                      value={editData.item}
                                      onChange={(e) => setEditData({...editData, item: e.target.value})}
                                      sx={{ width: 120 }}
                                    />
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={editData.quantidade}
                                      onChange={(e) => setEditData({...editData, quantidade: e.target.value})}
                                      sx={{ width: 80 }}
                                    />
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={editData.valor}
                                      onChange={(e) => setEditData({...editData, valor: e.target.value})}
                                      sx={{ width: 80 }}
                                    />
                                    <TextField
                                      size="small"
                                      type="datetime-local"
                                      value={editData.timestamp}
                                      onChange={(e) => setEditData({...editData, timestamp: e.target.value})}
                                      sx={{ width: 160 }}
                                    />
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleSaveActivity(atividade.id)}
                                    >
                                      <SaveIcon />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => setEditingTransaction(null)}
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  // View mode
                                  <>
                                    <ListItemText
                                      primary={atividade.descricao || `${atividade.tipo} ${atividade.displayName || atividade.item || ''} ${atividade.quantidade ? `x${atividade.quantidade}` : ''}`}
                                      secondary={new Date(atividade.timestamp).toLocaleString('pt-BR')}
                                    />
                                    {atividade.quantidade && (
                                      <Chip 
                                        label={`${atividade.quantidade}x`} 
                                        size="small" 
                                        color={atividade.tipo === 'adicionar' ? 'success' : 'default'}
                                        sx={{ mr: 1 }}
                                      />
                                    )}
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditActivity(atividade)}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteActivity(atividade.id)}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </>
                                )}
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography color="textSecondary">
                            {userServices.atividades_recentes && userServices.atividades_recentes.length > 0 
                              ? "Nenhuma atividade encontrada para os filtros selecionados"
                              : "Nenhuma atividade encontrada"
                            }
                          </Typography>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              )}
              
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">📊 Transaction Analysis</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Click to load transaction analysis for this user
                    </Typography>
                    <Button 
                      variant="outlined" 
                      onClick={() => loadTransactionAnalysis(selectedUserDetail?.id)}
                      disabled={loadingTransactionAnalysis}
                      sx={{ mt: 2 }}
                    >
                      {loadingTransactionAnalysis ? 'Loading...' : 'Load Analysis'}
                    </Button>
                    
                    {transactionAnalysis && (
                      <TransactionAnalysis analysis={transactionAnalysis} />
                    )}
                    
                    {/* Payment History - Integrated Format */}
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                      💰 Histórico de Pagamentos
                    </Typography>
                    
                    <PaymentHistorySection userId={selectedUserDetail?.id} userName={selectedUserDetail?.nome} />
                  </CardContent>
                </Card>
              </Grid>
              
            </Grid>
              )}
              
              
              
              {/* Tab Panel - Analysis */}
              {userDetailTab === 1 && (
                <Grid container spacing={3}>
                  {/* Critical Alerts Section */}
                  {transactionAnalysis && (
                    <Grid item xs={12}>
                      <Card sx={{ mb: 2, border: transactionAnalysis.analiseDetalhada?.summary?.suspiciousActivity ? '2px solid #f44336' : '2px solid #4caf50' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              🚨 Critical Alerts
                              {transactionAnalysis.analiseDetalhada?.summary?.suspiciousActivity ? 
                                <Chip label="NEEDS REVIEW" color="error" size="small" /> :
                                <Chip label="ALL CLEAR" color="success" size="small" />
                              }
                            </Typography>
                          </Box>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Alert severity={
                                (transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0) > 0 ? 'error' : 'success'
                              } sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>Buckets:</strong> {transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0} not returned
                                </Typography>
                                {(transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0) > 0 && (
                                  <Typography variant="caption" color="error">
                                    Cost owed: ${transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketCostOwed?.toFixed(2) || 0}
                                  </Typography>
                                )}
                              </Alert>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                              <Alert severity={
                                (transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0) >= 80 ? 'success' : 
                                (transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0) >= 50 ? 'warning' : 'error'
                              } sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>Plant Efficiency:</strong> {transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0}%
                                </Typography>
                                <Typography variant="caption">
                                  {transactionAnalysis.analiseDetalhada?.summary?.totalPlantsReturned || 0} / {transactionAnalysis.analiseDetalhada?.summary?.totalPlantsExpected || 0} plants
                                </Typography>
                              </Alert>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                              <Alert severity="info" sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>Honesty Score:</strong> {transactionAnalysis.pontuacaoHonestidade || 0}%
                                </Typography>
                                <Typography variant="caption">
                                  Based on {transactionAnalysis.totalTransacoes || 0} transactions
                                </Typography>
                              </Alert>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                              <Alert severity={
                                (transactionAnalysis.analiseDetalhada?.foodDrink?.suspiciousConsumption?.length || 0) > 0 ? 'warning' : 'success'
                              } sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>Consumption:</strong> {transactionAnalysis.analiseDetalhada?.foodDrink?.totalConsumed || 0} items
                                </Typography>
                                {(transactionAnalysis.analiseDetalhada?.foodDrink?.suspiciousConsumption?.length || 0) > 0 && (
                                  <Typography variant="caption" color="warning.main">
                                    ⚠️ Suspicious activity detected
                                  </Typography>
                                )}
                              </Alert>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  
                  {/* Quick Actions Panel */}
                  {transactionAnalysis && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            ⚡ Quick Actions
                            <Chip label={`${transactionAnalysis.totalTransacoes} transactions`} size="small" />
                          </Typography>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Button 
                                variant="outlined" 
                                fullWidth
                                startIcon={<AttachMoneyIcon />}
                                onClick={() => {
                                  // Handle pay all pending
                                  setMessage(`Pay all pending transactions for ${selectedUserDetail?.nome}`);
                                  setSeverity('info');
                                  setSnackbarOpen(true);
                                }}
                                disabled={!transactionAnalysis.analiseDetalhada?.summary?.totalSeedsTaken}
                              >
                                Pay All Pending
                              </Button>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                              <Button 
                                variant="outlined" 
                                fullWidth
                                startIcon={<WarningIcon />}
                                color="warning"
                                onClick={() => {
                                  setMessage(`Bucket reminder sent to ${selectedUserDetail?.nome}`);
                                  setSeverity('warning');
                                  setSnackbarOpen(true);
                                }}
                                disabled={!transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned}
                              >
                                Send Reminder
                              </Button>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                              <Button 
                                variant="outlined" 
                                fullWidth
                                startIcon={<ErrorIcon />}
                                color="error"
                                onClick={() => {
                                  setMessage(`Worker ${selectedUserDetail?.nome} flagged for review`);
                                  setSeverity('error');
                                  setSnackbarOpen(true);
                                }}
                                disabled={!transactionAnalysis.analiseDetalhada?.summary?.suspiciousActivity}
                              >
                                Flag for Review
                              </Button>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                              <Button 
                                variant="outlined" 
                                fullWidth
                                startIcon={<ReceiptIcon />}
                                onClick={() => {
                                  // Generate and show a simple report
                                  const report = `RELATÓRIO DE ANÁLISE DO TRABALHADOR
Trabalhador: ${selectedUserDetail?.nome}
Data: ${new Date().toLocaleDateString('pt-BR')}

PONTUAÇÃO DE HONESTIDADE: ${transactionAnalysis.pontuacaoHonestidade}%
Total de Transações: ${transactionAnalysis.totalTransacoes}

SEMENTES/PLANTAS:
- Sementes Retiradas: ${transactionAnalysis.analiseDetalhada?.summary?.totalSeedsTaken || 0}
- Plantas Esperadas: ${transactionAnalysis.analiseDetalhada?.summary?.totalPlantsExpected || 0}  
- Plantas Retornadas: ${transactionAnalysis.analiseDetalhada?.summary?.totalPlantsReturned || 0}
- Eficiência: ${transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0}%

FERRAMENTAS/BALDES:
- Baldes Não Retornados: ${transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0}
- Custo Devido: $${transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketCostOwed?.toFixed(2) || '0.00'}

STATUS: ${transactionAnalysis.analiseDetalhada?.summary?.suspiciousActivity ? 'PRECISA REVISÃO' : 'NORMAL'}`;
                                  
                                  setReceiptDialog({ open: true, receipt: report });
                                }}
                              >
                                Generate Report
                              </Button>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  
                  {/* Efficiency Dashboard */}
                  {transactionAnalysis && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                            🏆 Worker Score Card
                            <Chip 
                              label={transactionAnalysis.pontuacaoHonestidade >= 90 ? 'EXCELLENT' : 
                                     transactionAnalysis.pontuacaoHonestidade >= 70 ? 'GOOD' : 
                                     transactionAnalysis.pontuacaoHonestidade >= 50 ? 'FAIR' : 'POOR'} 
                              color={transactionAnalysis.pontuacaoHonestidade >= 90 ? 'success' : 
                                     transactionAnalysis.pontuacaoHonestidade >= 70 ? 'primary' : 
                                     transactionAnalysis.pontuacaoHonestidade >= 50 ? 'warning' : 'error'}
                              size="small" 
                            />
                          </Typography>
                          
                          <Grid container spacing={3}>
                            {/* Honesty Score */}
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                                  <CircularProgress
                                    variant="determinate"
                                    value={transactionAnalysis.pontuacaoHonestidade}
                                    size={80}
                                    thickness={4}
                                    sx={{ color: transactionAnalysis.pontuacaoHonestidade >= 70 ? '#4caf50' : transactionAnalysis.pontuacaoHonestidade >= 50 ? '#ff9800' : '#f44336' }}
                                  />
                                  <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="h6" component="div" color="textSecondary">
                                      {`${Math.round(transactionAnalysis.pontuacaoHonestidade)}%`}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Honesty Score</Typography>
                                <Typography variant="caption" color="textSecondary">Based on returns</Typography>
                              </Box>
                            </Grid>

                            {/* Productivity Score */}
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                                  <CircularProgress
                                    variant="determinate"
                                    value={transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0}
                                    size={80}
                                    thickness={4}
                                    sx={{ color: (transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0) >= 80 ? '#4caf50' : (transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0) >= 50 ? '#ff9800' : '#f44336' }}
                                  />
                                  <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="h6" component="div" color="textSecondary">
                                      {`${Math.round(transactionAnalysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0)}%`}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Plant Efficiency</Typography>
                                <Typography variant="caption" color="textSecondary">Seeds → Plants</Typography>
                              </Box>
                            </Grid>

                            {/* Activity Level */}
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                                  <CircularProgress
                                    variant="determinate"
                                    value={Math.min(100, (transactionAnalysis.totalTransacoes || 0) * 2)} // Scale activity
                                    size={80}
                                    thickness={4}
                                    sx={{ color: '#2196f3' }}
                                  />
                                  <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="h6" component="div" color="textSecondary">
                                      {transactionAnalysis.totalTransacoes}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Activity Level</Typography>
                                <Typography variant="caption" color="textSecondary">Total transactions</Typography>
                              </Box>
                            </Grid>

                            {/* Risk Assessment */}
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                                <Box sx={{ mb: 2 }}>
                                  {transactionAnalysis.analiseDetalhada?.summary?.suspiciousActivity ? (
                                    <WarningIcon sx={{ fontSize: 60, color: '#f44336' }} />
                                  ) : (transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0) > 0 ? (
                                    <ErrorIcon sx={{ fontSize: 60, color: '#ff9800' }} />
                                  ) : (
                                    <CheckCircleIcon sx={{ fontSize: 60, color: '#4caf50' }} />
                                  )}
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Risk Level</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {transactionAnalysis.analiseDetalhada?.summary?.suspiciousActivity ? 'HIGH' : 
                                   (transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0) > 0 ? 'MEDIUM' : 'LOW'}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                          
                          {/* Quick Stats Row */}
                          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                            <Grid container spacing={2}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="textSecondary">Seeds Taken</Typography>
                                <Typography variant="h6">{transactionAnalysis.analiseDetalhada?.summary?.totalSeedsTaken || 0}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="textSecondary">Plants Returned</Typography>
                                <Typography variant="h6">{transactionAnalysis.analiseDetalhada?.summary?.totalPlantsReturned || 0}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="textSecondary">Buckets Owed</Typography>
                                <Typography variant="h6" color={
                                  (transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0) > 0 ? 'error.main' : 'text.primary'
                                }>
                                  {transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="textSecondary">Money Owed</Typography>
                                <Typography variant="h6" color={
                                  (transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketCostOwed || 0) > 0 ? 'error.main' : 'text.primary'
                                }>
                                  ${(transactionAnalysis.analiseDetalhada?.toolsBuckets?.bucketCostOwed || 0).toFixed(2)}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  
                  {/* Main Analysis Content */}
                  <Grid item xs={12}>
                    {loadingTransactionAnalysis ? (
                      <Card>
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          <CircularProgress size={60} sx={{ mb: 2 }} />
                          <Typography variant="h6" sx={{ mb: 1 }}>Loading Transaction Analysis...</Typography>
                          <Typography variant="body2" color="textSecondary">
                            Analyzing worker's transaction patterns and accountability metrics for user {selectedUserDetail?.id}
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : transactionAnalysis ? (
                      <TransactionAnalysis analysis={transactionAnalysis} />
                    ) : (
                      <Card>
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                            🔍 Advanced Worker Analysis
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 2 }}>
                            Click below to generate a comprehensive transaction analysis for this worker.
                          </Typography>
                          <Button 
                            variant="contained" 
                            size="large"
                            onClick={() => loadTransactionAnalysis(selectedUserDetail?.id)}
                            sx={{ mb: 1 }}
                          >
                            Generate Analysis
                          </Button>
                          <Typography variant="caption" display="block" color="textSecondary">
                            Analyzes seeds/plants, animals/feed, tools, and accountability metrics
                          </Typography>
                          <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                            <Typography variant="body2">
                              <strong>Debug Info:</strong><br/>
                              User ID: {selectedUserDetail?.id || 'Not available'}<br/>
                              User Name: {selectedUserDetail?.nome || 'Not available'}<br/>
                              Tab: {userDetailTab} (should be 1 for Analysis)
                            </Typography>
                          </Alert>
                        </CardContent>
                      </Card>
                    )}
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUserDetail}>Fechar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
      
      {/* Receipt Dialog */}
      <Dialog 
        open={receiptDialog.open} 
        onClose={() => setReceiptDialog({ open: false, receipt: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          💰 Recibo de Pagamento
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
          <Button onClick={() => setReceiptDialog({ open: false, receipt: '' })}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


// Integrated Payment History Section Component
const PaymentHistorySection = ({ userId, userName }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receiptDialog, setReceiptDialog] = useState({ open: false, receipt: '', payment: null });

  useEffect(() => {
    if (userId) {
      loadPayments();
    }
  }, [userId]);

  const loadPayments = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/usuarios/pagamentos?userId=${encodeURIComponent(userId)}`);
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.dados || []);
      } else {
        setError('Erro ao carregar pagamentos');
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setError('Erro ao carregar pagamentos');
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
      .then(() => alert('Recibo copiado!'))
      .catch(() => alert('Erro ao copiar'));
  };

  const handleDeletePayment = async (payment) => {
    console.log('🗑️ Delete payment clicked:', payment);
    console.log('🔍 Payment ID:', payment.id);
    
    if (!payment.id) {
      alert('Erro: ID do pagamento não encontrado');
      return;
    }
    
    if (!window.confirm(`Tem certeza que deseja deletar este recibo de pagamento de $${(payment.valor || 0).toFixed(2)}?`)) {
      return;
    }

    try {
      console.log(`🌐 Calling DELETE /api/usuarios/pagamentos/${payment.id}`);
      const response = await fetch(`/api/usuarios/pagamentos/${payment.id}`, {
        method: 'DELETE'
      });
      
      console.log('📡 Delete response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Delete success response:', data);
        alert('Recibo deletado com sucesso!');
        console.log('🔄 Reloading payments...');
        await loadPayments(); // Reload payments
        console.log('✅ Payments reloaded');
      } else {
        const data = await response.json();
        console.error('❌ Delete error response:', data);
        alert(`Erro ao deletar recibo: ${data.erro}`);
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Erro ao deletar recibo');
    }
  };

  const getServiceIcon = (tipo) => {
    if (tipo.includes('plantacao')) return '🌾';
    if (tipo.includes('animais')) return '🐄';
    if (tipo === 'todos') return '📦';
    return '💰';
  };

  const getServiceColor = (tipo) => {
    if (tipo.includes('plantacao')) return 'success';
    if (tipo.includes('animais')) return 'warning';
    if (tipo === 'todos') return 'primary';
    return 'default';
  };

  if (loading) return <Typography color="textSecondary">Carregando pagamentos...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!payments.length) return <Alert severity="info">Nenhum pagamento encontrado para este usuário.</Alert>;

  const totalPago = payments.reduce((sum, p) => sum + (p.valor || 0), 0);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper elevation={1} sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
          <Typography variant="h6">{payments.length}</Typography>
          <Typography variant="body2">Pagamentos</Typography>
        </Paper>
        <Paper elevation={1} sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
          <Typography variant="h6">${totalPago.toFixed(2)}</Typography>
          <Typography variant="body2">Total Recebido</Typography>
        </Paper>
        <Paper elevation={1} sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
          <Typography variant="h6">{payments.filter(p => p.recibo_discord).length}</Typography>
          <Typography variant="body2">Com Recibos</Typography>
        </Paper>
      </Box>

      {/* Payment List */}
      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
        {payments.map((payment, idx) => (
          <Paper key={payment.id || idx} elevation={1} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip 
                    label={`${getServiceIcon(payment.tipo_servico)} ${payment.tipo_servico}`}
                    color={getServiceColor(payment.tipo_servico)}
                    size="small"
                  />
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    ${(payment.valor || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {payment.data_formatada || new Date(payment.timestamp).toLocaleString('pt-BR')} • {payment.detalhes?.length || 0} transações
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {payment.recibo_discord ? (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReceiptIcon />}
                    onClick={() => handleShowReceipt(payment)}
                  >
                    Recibo
                  </Button>
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    Sem recibo
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeletePayment(payment)}
                  title="Deletar pagamento e desmarcar transações"
                >
                  Deletar
                </Button>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

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

export default Users;