import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Collapse,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  People as PeopleIcon,
  AccountBalance as BalanceIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Pets as AnimalIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ShoppingCart as ShoppingCartIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  MoneyOff as MoneyOffIcon,
  LocalFlorist as PlantIcon,
  Eco as SeedIcon,
  Build as ToolIcon,
  Agriculture as FarmIcon,
  Inventory2 as BoxIcon,
  Kitchen as FoodIcon,
  LocalDrink as DrinkIcon,
  Category as MaterialIcon,
  // Specific animal icons - using best available Material-UI icons
  Egg as ChickenIcon,
  Agriculture as CowIcon,
  Pets as SheepIcon, 
  DirectionsRun as GoatIcon,
  Restaurant as PigIcon,
  DirectionsWalk as HorseIcon,
  // Plants
  Grass as GrassIcon,
  Forest as TreeIcon,
  Spa as FlowerIcon,
  // Tools
  Handyman as HandymanIcon,
  Construction as ConstructionIcon,
  CleaningServices as CleaningIcon,
  // Materials  
  Carpenter as WoodIcon,
  TextureIcon as LeatherIcon,
  // Food/Drinks
  Liquor as DrinkBottleIcon,
  EmojiFoodBeverage as BeverageIcon,
  // Generic fallbacks
  Circle as GenericIcon
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';
import StockManagementSection from './StockManagementSection';

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

// Function to get appropriate icon based on transaction type and item details
const getActivityIcon = (transaction) => {
  const isDeposit = transaction.tipo === 'adicionar' || transaction.tipo === 'deposito';
  const color = isDeposit ? 'success' : 'error';
  
  // Financial transactions
  if (transaction.categoria === 'financeiro') {
    if (transaction.tipo === 'deposito') {
      // Animal delivery gets special pet paw icon
      if (transaction.descricao?.includes('animais') || transaction.descricao?.includes('matadouro')) {
        return <AnimalIcon color="success" />;
      }
      // Regular money deposit
      return <MoneyIcon color="success" />;
    } else if (transaction.tipo === 'saque') {
      return <MoneyOffIcon color="error" />;
    }
  }

  // Inventory transactions - check item category or name
  if (transaction.categoria === 'inventario') {
    const itemName = transaction.item?.toLowerCase() || transaction.descricao?.toLowerCase() || '';
    
    // SPECIFIC ANIMALS - Individual emoji icons
    // Chickens
    if (itemName.includes('galo') || itemName.includes('chicken_male')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐓</span>; // Rooster
    }
    if (itemName.includes('galinha') || itemName.includes('chicken_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐔</span>; // Hen
    }
    
    // Goats
    if (itemName.includes('bode') || itemName.includes('goat_male') ||
        itemName.includes('cabra') || itemName.includes('goat_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐐</span>; // Goat
    }
    
    // Cows
    if (itemName.includes('touro') || itemName.includes('cow_male')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐂</span>; // Bull
    }
    if (itemName.includes('vaca') || itemName.includes('cow_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐄</span>; // Cow
    }
    
    // Pigs
    if (itemName.includes('porco') || itemName.includes('pig_male') ||
        itemName.includes('porca') || itemName.includes('pig_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐷</span>; // Pig
    }
    
    // Sheep
    if (itemName.includes('ovelha') || itemName.includes('sheep')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐑</span>; // Sheep
    }
    
    // Donkeys/Mules
    if (itemName.includes('burro') || itemName.includes('donkey_male')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🫏</span>; // Donkey
    }
    if (itemName.includes('mula') || itemName.includes('donkey_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐴</span>; // Mule/Horse
    }

    // SPECIFIC PLANTS - Individual emoji icons
    // Grains/Cereals
    if (itemName.includes('trigo')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌾</span>; // Wheat
    }
    if (itemName.includes('milho') || itemName.includes('corn')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌽</span>; // Corn
    }
    if (itemName.includes('cana') || itemName.includes('sugar')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🎋</span>; // Sugar cane
    }
    
    // Water plants
    if (itemName.includes('bulrush') || itemName.includes('junco')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌿</span>; // Bulrush/herb
    }
    
    // Herbs/Spices
    if (itemName.includes('tabaco') || itemName.includes('tobacco')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🚬</span>; // Tobacco
    }
    if (itemName.includes('alho') || itemName.includes('garlic')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🧄</span>; // Garlic
    }
    
    // Fruits
    if (itemName.includes('banana')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🍌</span>; // Banana
    }
    
    // Fiber plants
    if (itemName.includes('algodao') || itemName.includes('cotton')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>☁️</span>; // Cotton (cloud-like)
    }

    // SEEDS - Individual seed emojis
    if (itemName.includes('semente') || itemName.includes('seed')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌱</span>; // Seed/sprout
    }

    // SPECIFIC TOOLS - Individual emoji icons
    // Farm tools
    if (itemName.includes('rastelo') || itemName.includes('hoe')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🪓</span>; // Hoe/Rake
    }
    if (itemName.includes('tesoura') || itemName.includes('trimmer')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>✂️</span>; // Scissors
    }
    
    // Cutting tools
    if (itemName.includes('faca') || itemName.includes('knife')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🔪</span>; // Knife
    }
    
    // Water tools
    if (itemName.includes('balde') || itemName.includes('regador') || 
        itemName.includes('watering')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🪣</span>; // Bucket
    }

    // SPECIFIC MATERIALS - Individual emoji icons
    // Wood
    if (itemName.includes('madeira') || itemName.includes('wood')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🪵</span>; // Wood
    }
    
    // Leather
    if (itemName.includes('couro') || itemName.includes('leather')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🧳</span>; // Leather (bag)
    }
    
    // Other materials
    if (itemName.includes('fibra')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🧶</span>; // Fiber (yarn)
    }
    if (itemName.includes('polvora')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>💥</span>; // Gunpowder (explosion)
    }
    if (itemName.includes('enxofre') || itemName.includes('cascalho')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🪨</span>; // Rock/stone
    }

    // SPECIFIC FOOD/DRINKS - Individual emoji icons
    // Drinks
    if (itemName.includes('suco')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🧃</span>; // Juice box
    }
    if (itemName.includes('leite') || itemName.includes('milk')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🥛</span>; // Milk
    }
    if (itemName.includes('achocolatado')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🍫</span>; // Chocolate
    }
    
    // Food
    if (itemName.includes('batata')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🥔</span>; // Potato
    }
    if (itemName.includes('bala')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🍬</span>; // Candy
    }
    if (itemName.includes('amido')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌾</span>; // Starch (grain)
    }
    if (itemName.includes('cigarro')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🚬</span>; // Cigarette
    }

    // BOXES/PRODUCTS - Individual emoji icons
    if (itemName.includes('caixa') || itemName.includes('box')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>📦</span>; // Box
    }

    // RATIONS - Individual emoji icons
    if (itemName.includes('racao') || itemName.includes('portion')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🥣</span>; // Food bowl
    }

    // GENERIC FALLBACKS for categories
    // If it's an animal but not specifically identified
    if (itemName.includes('animal') || itemName.includes('_male') || 
        itemName.includes('_female')) {
      return <AnimalIcon color={color} />;
    }
    
    // If it's a plant but not specifically identified
    if (itemName.includes('plant') || transaction.item?.categoria === 'plantas') {
      return <PlantIcon color={color} />;
    }
    
    // If it's a tool but not specifically identified
    if (itemName.includes('tool') || transaction.item?.categoria === 'ferramentas') {
      return <ToolIcon color={color} />;
    }
  }

  // Ultimate fallback icons
  return isDeposit ? <AddIcon color="success" /> : <RemoveIcon color="error" />;
};

const Dashboard = () => {
  const socket = useSocket();
  const [data, setData] = useState({
    inventory: { totalItems: 0, totalQuantity: 0 },
    users: {},
    balance: { current_balance: 0 },
    analytics: {}
  });
  const [recentActivity, setRecentActivity] = useState([]);

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

  // Global naming system - matches backend obterMelhorNomeExibicao()
  const getBestDisplayName = (itemId) => {
    if (!itemId) return 'Item';
    
    // 1. First check custom display names (highest priority)
    if (customNames[itemId]) {
      return customNames[itemId];
    }
    
    // 2. Fallback to normalized text (basic transformation)
    return normalizeText(itemId);
  };
  const [balanceTransactions, setBalanceTransactions] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState({ workerPerformance: [], managerPerformance: [] });
  const [stockAlerts, setStockAlerts] = useState({ alerts: [], summary: {} });
  const [businessIntelligence, setBusinessIntelligence] = useState({});
  const [customNames, setCustomNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  
  // UI State
  const [sortOrder, setSortOrder] = useState('newest');
  const [activityLimit, setActivityLimit] = useState(50);
  const [thresholdUpdates, setThresholdUpdates] = useState({});
  const [updateTimeouts, setUpdateTimeouts] = useState({});
  const [editingItemName, setEditingItemName] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    itemActivity: true,
    moneyActivity: true,
    moneyTransactions: true,
    workerTracking: true
  });

  // Define loadRecentActivity before loadDashboardData to avoid hoisting issues
  const loadRecentActivity = useCallback(async () => {
    console.log('🔥 loadRecentActivity CALLED with limit:', activityLimit);
    try {
      const response = await fetch(`/api/dashboard/atividades?limite=${activityLimit}&offset=0`);
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 RAW API RESPONSE:', data);
        
        // Handle both old format (data.dados.atividades) and new format (data.atividades)
        let activities = [];
        if (data.sucesso && data.dados?.atividades) {
          activities = data.dados.atividades;
        } else if (data.atividades) {
          activities = data.atividades;
        }
        
        console.log('🎯 ACTIVITIES RECEIVED:', activities?.length, 'activities');
        console.log('🎯 FIRST ACTIVITY:', activities?.[0]);
        
        if (Array.isArray(activities) && activities.length > 0) {
          setRecentActivity(activities);
        } else if (activities.length === 0) {
          console.warn('⚠️ API returned 0 activities - keeping existing data to prevent blank dashboard');
          // Don't clear activities if API returns empty - could be temporary issue
        }
      } else {
        console.error('❌ API request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading recent activity:', error);
    }
  }, [activityLimit]);

  const loadBalanceTransactions = async () => {
    // Sistema limpo não tem transações de dinheiro
    setBalanceTransactions([]);
  };

  const loadUserAnalytics = async () => {
    try {
      const response = await fetch('/api/dashboard/usuarios');
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setUserAnalytics(data.dados || {});
        }
      }
    } catch (error) {
      console.error('Error loading user analytics:', error);
    }
  };

  const loadStockAlerts = async () => {
    // Sistema limpo não tem alertas de estoque
    setStockAlerts({ alerts: [], summary: {} });
  };

  const loadBusinessIntelligence = async () => {
    // Sistema limpo não tem business intelligence
    setBusinessIntelligence({});
  };

  const loadCustomNames = async () => {
    try {
      const response = await fetch('/api/localization/translations');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Use custom_overrides (highest priority) + built_in_translations as fallback
          const allNames = {
            ...data.data.built_in_translations,
            ...data.data.custom_overrides
          };
          setCustomNames(allNames);
        }
      }
    } catch (error) {
      console.error('Error loading custom names:', error);
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      // Load main dashboard statistics
      const response = await fetch('/api/dashboard/estatisticas');
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          // Transform REST API response to match WebSocket structure
          const transformedAnalytics = {
            inventario: {
              total_itens: data.dados.totalItens || 0
            },
            usuarios: {
              total_usuarios: data.dados.totalUsuarios || 0,
              gerentes: data.dados.gerentes || 0,
              trabalhadores: data.dados.trabalhadores || 0
            },
            financeiro: {
              saldo_atual: data.dados.saldoFazenda || 0
            },
            atividade: {
              transacoes_hoje: 0 // REST API doesn't provide this, will be updated by WebSocket
            }
          };

          console.log('🔧 Initial Dashboard Data Loaded:', transformedAnalytics);
          
          setData(prev => ({ 
            ...prev, 
            inventory: { totalItems: data.dados.totalItens || 0 },
            users: {},
            balance: { current_balance: data.dados.saldoFazenda || 0 },
            analytics: transformedAnalytics,
            dados: data.dados // Keep original structure for new components
          }));
          setLoading(false);
        }
      }
      
      await Promise.all([
        loadRecentActivity(),
        loadBalanceTransactions(),
        loadUserAnalytics(),
        loadStockAlerts(),
        loadBusinessIntelligence(),
        loadCustomNames()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  }, [loadRecentActivity]);

  useEffect(() => {
    console.log('💥 MAIN USEEFFECT RUNNING');
    console.log('💥 loadRecentActivity exists?', typeof loadRecentActivity);
    loadDashboardData();
    
    // Simple test function call
    try {
      loadRecentActivity(); // Force load activities here
      console.log('💥 loadRecentActivity called successfully');
    } catch (error) {
      console.error('💥 Error calling loadRecentActivity:', error);
    }
    
    if (socket) {
      // Listen for real-time updates - Sistema em Português
      socket.on('inventory:update', (inventoryData) => {
        setData(prev => ({ ...prev, inventory: inventoryData }));
        setLoading(false);
      });

      socket.on('usuarios:atualizado', (usersData) => {
        setData(prev => ({ ...prev, users: usersData }));
      });

      socket.on('dashboard:atualizado', (dashboardData) => {
        console.log('🔧 WebSocket Dashboard Update:', dashboardData);
        setData(prev => ({ ...prev, analytics: dashboardData }));
        loadRecentActivity(); // Refresh activities when dashboard updates
      });

      socket.on('atividades:atualizado', (activitiesData) => {
        console.log('🔄 Real-time activities update received:', activitiesData);
        
        if (activitiesData && Array.isArray(activitiesData.atividades) && activitiesData.atividades.length > 0) {
          // Use real-time data for seamless updates
          console.log('🔄 Updating activities with real-time data:', activitiesData.atividades.length, 'activities');
          setRecentActivity(activitiesData.atividades);
        } else {
          // Fallback to API reload if no data provided
          console.log('🔄 Reloading activities from API (no real-time data provided)...');
          // Add small delay to ensure server has processed the data
          setTimeout(() => {
            loadRecentActivity();
          }, 500);
        }
      });

      // Also listen for bot_data updates as backup
      socket.on('bot_data:updated', (botData) => {
        console.log('🤖 Bot data update received:', botData);
        // Reload activities after bot data update
        setTimeout(() => {
          loadRecentActivity();
        }, 1000);
      });

      socket.on('customNames:atualizado', (customNamesData) => {
        console.log('🏷️ Custom names updated:', customNamesData);
        setCustomNames(customNamesData || {});
        // Force immediate re-render of activities with updated display names
        setRecentActivity(prev => [...prev]); // Force re-render by updating state reference
        loadRecentActivity();
      });

      // Cleanup listeners
      return () => {
        socket.off('inventario:atualizado');
        socket.off('usuarios:atualizado'); 
        socket.off('dashboard:atualizado');
        socket.off('atividades:atualizado');
        socket.off('customNames:atualizado');
      };
    }
  }, [socket, loadDashboardData, loadRecentActivity]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeouts).forEach(timeoutId => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
    };
  }, [updateTimeouts]);

  // Reload activities when activity limit changes
  useEffect(() => {
    console.log('🚀 useEffect triggered with activityLimit:', activityLimit);
    if (activityLimit) {
      loadRecentActivity();
    } else {
      console.log('❌ activityLimit is falsy:', activityLimit);
    }
  }, [activityLimit, loadRecentActivity]);

  const getUserCount = () => {
    return data.analytics?.usuarios?.total_usuarios || 0;
  };


  const handleRenameItem = async (scriptName, currentName) => {
    const newName = prompt(`🔧 Renomear GLOBALMENTE item "${currentName}":\nID: ${scriptName}\n\n⚠️ ATENÇÃO: Isso mudará o nome em TODOS os lugares (Dashboard, Inventário, Usuários, etc.)`, currentName);
    if (newName && newName !== currentName) {
      try {
        const response = await fetch('/api/inventario/global-name', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: scriptName,
            newDisplayName: newName
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // Reload stock alerts to show updated name
          await loadStockAlerts();
          alert(`✅ Item "${scriptName}" renomeado GLOBALMENTE para "${newName}" com sucesso!\n\n📊 Atualizado em ${result.dados?.updatedCount || 'vários'} lugares.`);
        } else {
          const error = await response.json();
          alert(`❌ Erro ao renomear item: ${error.erro || 'Erro desconhecido'}`);
        }
      } catch (error) {
        console.error('Error renaming item globally:', error);
        alert('❌ Erro ao renomear item globalmente. Tente novamente.');
      }
    }
  };

  const handleStockChange = async (scriptName, field, value) => {
    try {
      const response = await fetch('/api/inventory/update-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: scriptName,
          quantity: value
        }),
      });

      if (response.ok) {
        // Reload stock alerts to show updated values
        await loadStockAlerts();
      } else {
        alert('Erro ao atualizar estoque. Tente novamente.');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Erro ao atualizar estoque. Tente novamente.');
    }
  };

  const handleEditItemName = (itemId, currentDisplayName) => {
    setEditingItemName(itemId);
    setNewItemName(currentDisplayName || itemId.replace(/_/g, ' '));
  };

  const handleSaveItemName = async () => {
    try {
      const response = await fetch('/api/custom-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: editingItemName,
          displayName: newItemName
        }),
      });

      if (response.ok) {
        // Reload data to show updated names
        await loadDashboardData();
        await loadRecentActivity();
        setEditingItemName(null);
        setNewItemName('');
      } else {
        alert('Erro ao salvar nome customizado');
      }
    } catch (error) {
      console.error('Error saving custom name:', error);
      alert('Erro ao salvar nome customizado');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta atividade? Esta ação reverterá os efeitos no inventário e saldo.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/usuarios/atividade/${activityId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Reload data to reflect changes
        await loadDashboardData();
        await loadRecentActivity();
        console.log('✅ Activity deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Erro ao excluir atividade: ${errorData.erro}`);
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Erro ao excluir atividade');
    }
  };

  const handleThresholdChange = (scriptName, value) => {
    // Validate input
    const numValue = parseInt(value) || 1;
    if (numValue < 1) return;

    // Update local state immediately for responsive UI
    setThresholdUpdates(prev => ({
      ...prev,
      [scriptName]: numValue
    }));

    // Clear existing timeout for this item
    if (updateTimeouts[scriptName]) {
      clearTimeout(updateTimeouts[scriptName]);
    }

    // Set new timeout to update server after user stops typing
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/stock-thresholds/item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: scriptName,
            threshold: numValue
          }),
        });

        if (response.ok) {
          console.log(`Threshold updated for ${scriptName}: ${numValue}`);
          // Reload stock alerts to show updated threshold
          await loadStockAlerts();
          // Clear the local update state
          setThresholdUpdates(prev => {
            const updated = { ...prev };
            delete updated[scriptName];
            return updated;
          });
        } else {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          alert(`Erro ao atualizar limite: ${errorData.error || 'Erro desconhecido'}`);
        }
      } catch (error) {
        console.error('Error updating threshold:', error);
        alert('Erro ao atualizar limite. Verifique a conexão.');
      }

      // Clear timeout reference
      setUpdateTimeouts(prev => {
        const updated = { ...prev };
        delete updated[scriptName];
        return updated;
      });
    }, 1000); // Wait 1 second after user stops typing

    // Store timeout reference
    setUpdateTimeouts(prev => ({
      ...prev,
      [scriptName]: timeoutId
    }));
  };

  const getSortedActivity = () => {
    const sorted = [...recentActivity];
    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      case 'largest':
        return sorted.sort((a, b) => (b.quantidade || b.quantity || 0) - (a.quantidade || a.quantity || 0));
      case 'user':
        return sorted.sort((a, b) => (a.autor || a.author || '').localeCompare(b.autor || b.author || ''));
      default:
        return sorted;
    }
  };

  // Filter activities by type
  const getItemActivities = () => {
    return getSortedActivity().filter(activity => 
      activity.categoria === 'inventario' || 
      (activity.tipo && ['adicionar', 'remover'].includes(activity.tipo))
    ).slice(0, activityLimit);
  };

  const getMoneyActivities = () => {
    return getSortedActivity().filter(activity => {
      // Check for financial category or financial action types
      return activity.categoria === 'financeiro' || 
             (activity.tipo && ['deposito', 'saque'].includes(activity.tipo)) ||
             (activity.valor !== undefined && activity.valor !== null && activity.item === null);
    }).slice(0, activityLimit);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getAlertIcon = (priority) => {
    switch (priority) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getPerformanceColor = (rating) => {
    switch (rating) {
      case 'Excellent':
        return 'success';
      case 'Good':
        return 'primary';
      case 'Average':
        return 'info';
      case 'Below Average':
        return 'warning';
      default:
        return 'error';
    }
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Erro ao carregar dados: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        📊 Dashboard da Fazenda
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total de Itens no Estoque"
            value={data.analytics?.inventario?.total_itens || 0}
            icon={<InventoryIcon fontSize="large" />}
            color="primary"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Saldo Atual da Fazenda"
            value={`$${(data.analytics?.financeiro?.saldo_atual || 0).toFixed(2)}`}
            icon={<BalanceIcon fontSize="large" />}
            color={data.analytics?.financeiro?.saldo_atual > 1000 ? "success" : "warning"}
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total de Usuários"
            value={data.analytics?.usuarios?.total_usuarios || 0}
            icon={<PeopleIcon fontSize="large" />}
            color="info"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Atividades Hoje"
            value={data.analytics?.atividade?.transacoes_hoje || 0}
            icon={<ShoppingCartIcon fontSize="large" />}
            color="secondary"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* User Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ p: 2, textAlign: 'center', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
              👥 Usuários
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
              {data.analytics?.usuarios?.total_usuarios || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Ativos
            </Typography>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ p: 2, textAlign: 'center', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
              👑 Gerentes
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
              {data.analytics?.usuarios?.gerentes || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administradores
            </Typography>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ p: 2, textAlign: 'center', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
              🔨 Trabalhadores
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
              {data.analytics?.usuarios?.trabalhadores || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Workers Ativos
            </Typography>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ p: 2, textAlign: 'center', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" color="info.main" sx={{ fontWeight: 600 }}>
              📊 Eficiência
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
              {Math.round(((data.analytics?.usuarios?.trabalhadores || 0) / Math.max(1, data.analytics?.usuarios?.total_usuarios || 1)) * 100)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Taxa Workers
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Sort Control */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6">📊 Controles das Atividades:</Typography>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <MenuItem value="newest">⬇️ Mais Recente</MenuItem>
              <MenuItem value="oldest">⬆️ Mais Antigo</MenuItem>
              <MenuItem value="largest">📈 Maior Quantidade</MenuItem>
              <MenuItem value="user">👤 Por Usuário</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={activityLimit}
              onChange={(e) => setActivityLimit(e.target.value)}
            >
              <MenuItem value={25}>25 atividades</MenuItem>
              <MenuItem value={50}>50 atividades</MenuItem>
              <MenuItem value={100}>100 atividades</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>


      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Item Activities */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                📦 Atividades de Itens ({getItemActivities().length})
              </Typography>
              <IconButton onClick={() => toggleSection('itemActivity')}>
                {expandedSections.itemActivity ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.itemActivity}>
              <Box sx={{ height: '600px', overflowY: 'auto' }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                ) : getItemActivities().length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                    <Typography>Nenhuma atividade de itens</Typography>
                  </Box>
                ) : (
                  <List dense>
                    {getItemActivities().map((transaction, index) => {
                      const icon = getActivityIcon(transaction);
                      
                      return (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemIcon>{icon}</ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {transaction.autor || 'Sistema'}
                                  </Typography>
                                  <Typography variant="body2">
                                    {transaction.tipo === 'adicionar' ? 'adicionou' : 'removeu'}
                                  </Typography>
                                  <Chip 
                                    label={`${transaction.quantidade}x`} 
                                    size="small" 
                                    color={transaction.tipo === 'adicionar' ? 'success' : 'error'}
                                  />
                                  <Typography variant="body2" fontWeight="medium">
                                    {transaction.displayName || getBestDisplayName(transaction.item)}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="text"
                                    sx={{ ml: 1, minWidth: 'auto', p: 0.5, fontSize: '0.7rem' }}
                                    onClick={() => handleEditItemName(transaction.item, transaction.displayName)}
                                  >
                                    ✏️ Editar
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="error"
                                    sx={{ ml: 0.5, minWidth: 'auto', p: 0.5, fontSize: '0.7rem' }}
                                    onClick={() => handleDeleteActivity(transaction.id)}
                                    startIcon={<DeleteIcon fontSize="small" />}
                                  >
                                    Deletar
                                  </Button>
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < getItemActivities().length - 1 && <Divider />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Grid>

        {/* Money Activities */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                💰 Atividades de Dinheiro ({getMoneyActivities().length})
              </Typography>
              <IconButton onClick={() => toggleSection('moneyActivity')}>
                {expandedSections.moneyActivity ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.moneyActivity}>
              <Box sx={{ height: '600px', overflowY: 'auto' }}>
                {getMoneyActivities().length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                    <Typography variant="body2">Nenhuma atividade financeira</Typography>
                  </Box>
                ) : (
                  <List dense>
                    {getMoneyActivities().map((transaction, index) => {
                      const icon = getActivityIcon(transaction);
                      
                      return (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemIcon>{icon}</ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {transaction.autor || 'Sistema'}
                                  </Typography>
                                  <Chip 
                                    label={`$${(typeof transaction.valor === 'number' ? transaction.valor.toFixed(2) : '0.00')}`}
                                    size="small" 
                                    color={transaction.tipo === 'deposito' ? 'success' : 'error'}
                                  />
                                  <Typography variant="body2">
                                    {transaction.tipo === 'deposito' ? 'Depositou no caixa' : 'Sacou do caixa'}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="error"
                                    sx={{ ml: 1, minWidth: 'auto', p: 0.5, fontSize: '0.7rem' }}
                                    onClick={() => handleDeleteActivity(transaction.id)}
                                    startIcon={<DeleteIcon fontSize="small" />}
                                  >
                                    Deletar
                                  </Button>
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  📅 {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < getMoneyActivities().length - 1 && <Divider />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Grid>



        {/* Business Intelligence Metrics */}
        {businessIntelligence.keyMetrics && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                💰 Resumo Financeiro da Fazenda
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                📊 <strong>Explicação dos Números:</strong><br/>
                • <strong>Receita Total:</strong> Todo dinheiro que entrou (principalmente vendas de animais)<br/>
                • <strong>Lucro Líquido:</strong> Receita total menos todos os pagamentos feitos aos trabalhadores<br/>
                • <strong>Margem de Lucro:</strong> Porcentagem de lucro sobre a receita total<br/>
                • <strong>ROI:</strong> Retorno sobre investimento (quanto você ganhou comparado ao que investiu)
              </Alert>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={1} sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography color="textSecondary" variant="body1" gutterBottom>
                        💵 Receita Total
                      </Typography>
                      <Typography variant="h4" color="success.main" gutterBottom>
                        ${businessIntelligence.keyMetrics.totalRevenue?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Todo dinheiro que entrou
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={1} sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography color="textSecondary" variant="body1" gutterBottom>
                        💰 Lucro Líquido
                      </Typography>
                      <Typography variant="h4" color={businessIntelligence.keyMetrics.netProfit > 0 ? "success.main" : "error.main"} gutterBottom>
                        ${businessIntelligence.keyMetrics.netProfit?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Receita menos pagamentos
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={1} sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography color="textSecondary" variant="body1" gutterBottom>
                        📊 Margem de Lucro
                      </Typography>
                      <Typography variant="h4" color={businessIntelligence.keyMetrics.profitMargin > 30 ? "success.main" : "warning.main"} gutterBottom>
                        {businessIntelligence.keyMetrics.profitMargin?.toFixed(1) || '0.0'}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        % de lucro sobre vendas
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={1} sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography color="textSecondary" variant="body1" gutterBottom>
                        📈 ROI (Retorno)
                      </Typography>
                      <Typography variant="h4" color="info.main" gutterBottom>
                        {businessIntelligence.keyMetrics.roi?.toFixed(1) || '0.0'}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Retorno sobre investimento
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>


      {/* Edit Item Name Dialog */}
      <Dialog open={!!editingItemName} onClose={() => setEditingItemName(null)}>
        <DialogTitle>Editar Nome do Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Item"
            fullWidth
            variant="outlined"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItemName(null)}>Cancelar</Button>
          <Button onClick={handleSaveItemName} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;