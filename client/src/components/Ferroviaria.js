import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Train as TrainIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  LocalShipping as ShippingIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { SocketContext } from '../context/SocketContext';

// Service management functions - Fixed scope issues - All functions now at component level

const Ferroviaria = () => {
  const socket = useContext(SocketContext);
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [analise, setAnalise] = useState(null);
  const [caixasInventario, setCaixasInventario] = useState([]);
  const [openDialog, setOpenDialog] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [warnings, setWarnings] = useState([]);
  const [expandedSections, setExpandedSections] = useState({ 
    serviceHistory: false 
  });

  // Configuration state for box costs
  const [boxCosts, setBoxCosts] = useState({
    caixaanimal: 0,
    caixadeverduras: 0
  });
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    // Investidor
    nome: '',
    pombo: '',
    funcao: 'Owner',
    porcentagem: 0,
    
    // Caixas
    tipo_caixa: '',
    quantidade: '',
    custo_unitario: '',
    
    // Entrega
    caixas_utilizadas: '',
    valor_recebido: '',
    trabalhador: '',
    pagamento_trabalhador: '',
    duracao_minutos: '',
    
    // Serviço Ferroviário
    manager_id: '',
    numero_entregas: '',
    total_caixas: '',
    tipo_caixas_animal: '',
    tipo_caixas_verduras: '',
    tempo_inicio: '',
    tempo_fim: '',
    notas: ''
  });
  
  const [managers, setManagers] = useState([]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.io listeners
  useEffect(() => {
    if (socket) {
      socket.on('ferroviaria:atualizado', () => {
        loadData();
      });

      // Listen for inventory changes to update Ferroviaria calculations
      socket.on('inventario:atualizado', () => {
        loadData(); // Reload when inventory changes (boxes quantities)
      });

      return () => {
        socket.off('ferroviaria:atualizado');
        socket.off('inventario:atualizado');
      };
    }
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar dados da ferroviaria
      const dadosRes = await fetch('/api/ferroviaria');
      const dadosData = await dadosRes.json();
      if (dadosData.success) {
        setDados(dadosData.data);
        // Load box costs from configuration
        if (dadosData.data?.configuracao) {
          setBoxCosts({
            caixaanimal: dadosData.data.configuracao.custo_caixa_animal || 0,
            caixadeverduras: dadosData.data.configuracao.custo_caixa_verduras || 0
          });
        }
      }

      // Carregar análise
      const analiseRes = await fetch('/api/ferroviaria/analise');
      const analiseData = await analiseRes.json();
      if (analiseData.success) {
        setAnalise(analiseData.data);
      }

      // Carregar caixas do inventário
      const caixasRes = await fetch('/api/ferroviaria/caixas-inventario');
      const caixasData = await caixasRes.json();
      console.log('Caixas from API:', caixasData);
      if (caixasData.success) {
        setCaixasInventario(caixasData.data);
        console.log('Set caixas inventory to:', caixasData.data);
      }

      // Carregar managers
      const managersRes = await fetch('/api/managers');
      const managersData = await managersRes.json();
      if (managersData.success) {
        const activeManagers = Object.entries(managersData.data.gerentes || {})
          .filter(([id, manager]) => manager.ativo !== false)
          .map(([id, manager]) => ({ id, ...manager }));
        setManagers(activeManagers);
      }

      // Carregar avisos de remoção não autorizada
      const warningsRes = await fetch('/api/ferroviaria/avisos');
      const warningsData = await warningsRes.json();
      if (warningsData.success) {
        setWarnings(warningsData.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      pombo: '',
      funcao: 'Owner',
      porcentagem: 0,
      tipo_caixa: '',
      quantidade: '',
      custo_unitario: '',
      caixas_utilizadas: '',
      valor_recebido: '',
      trabalhador: '',
      pagamento_trabalhador: '',
      duracao_minutos: '',
      manager_id: '',
      numero_entregas: '',
      total_caixas: '',
      tipo_caixas_animal: '',
      tipo_caixas_verduras: '',
      tempo_inicio: '',
      tempo_fim: '',
      notas: ''
    });
    setEditingItem(null);
  };

  const closeDialog = () => {
    setOpenDialog('');
    resetForm();
  };

  // ==============================
  // INVESTIDORES
  // ==============================

  const openInvestidorDialog = (investidor = null) => {
    if (investidor) {
      setFormData({
        ...formData,
        nome: investidor.nome,
        pombo: investidor.pombo,
        funcao: investidor.funcao,
        porcentagem: investidor.porcentagem
      });
      setEditingItem(investidor);
    }
    setOpenDialog('investidor');
  };

  const saveInvestidor = async () => {
    try {
      const url = editingItem 
        ? `/api/ferroviaria/investidores/${editingItem.id}` 
        : '/api/ferroviaria/investidores';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          pombo: formData.pombo,
          funcao: formData.funcao,
          porcentagem: parseFloat(formData.porcentagem)
        })
      });

      const result = await response.json();
      if (result.success) {
        showNotification(result.message, 'success');
        closeDialog();
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar investidor:', error);
      showNotification('Erro ao salvar investidor', 'error');
    }
  };

  const deleteInvestidor = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este investidor?')) return;

    try {
      const response = await fetch(`/api/ferroviaria/investidores/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        showNotification(result.message, 'success');
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao remover investidor:', error);
      showNotification('Erro ao remover investidor', 'error');
    }
  };

  // ==============================
  // CAIXAS
  // ==============================

  const openCaixasDialog = () => {
    setOpenDialog('caixas');
  };

  const saveCaixas = async () => {
    try {
      const response = await fetch('/api/ferroviaria/caixas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_caixa: formData.tipo_caixa,
          quantidade: parseInt(formData.quantidade),
          custo_unitario: formData.custo_unitario ? parseFloat(formData.custo_unitario) : undefined
        })
      });

      const result = await response.json();
      if (result.success) {
        showNotification(result.message, 'success');
        closeDialog();
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao registrar caixas:', error);
      showNotification('Erro ao registrar caixas', 'error');
    }
  };

  // ==============================
  // ENTREGAS
  // ==============================

  const openEntregaDialog = () => {
    setOpenDialog('entrega');
  };

  const saveEntrega = async () => {
    try {
      const response = await fetch('/api/ferroviaria/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caixas_utilizadas: parseInt(formData.caixas_utilizadas),
          valor_recebido: formData.valor_recebido ? parseFloat(formData.valor_recebido) : undefined,
          trabalhador: formData.trabalhador,
          pagamento_trabalhador: formData.pagamento_trabalhador ? parseFloat(formData.pagamento_trabalhador) : 0,
          duracao_minutos: formData.duracao_minutos ? parseInt(formData.duracao_minutos) : undefined
        })
      });

      const result = await response.json();
      if (result.success) {
        showNotification(result.message, 'success');
        closeDialog();
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao registrar entrega:', error);
      showNotification('Erro ao registrar entrega', 'error');
    }
  };

  // ==============================
  // WARNING SYSTEM HANDLERS
  // ==============================

  const handleApproveWarning = async (warning) => {
    try {
      const response = await fetch(`/api/ferroviaria/avisos/${warning.id}/aprovar`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        showNotification('Aviso aprovado', 'success');
        setWarnings(warnings.filter(w => w.id !== warning.id));
      } else {
        showNotification('Erro ao aprovar aviso', 'error');
      }
    } catch (error) {
      console.error('Erro ao aprovar aviso:', error);
      showNotification('Erro ao aprovar aviso', 'error');
    }
  };

  const handleReverseWarning = async (warning) => {
    try {
      const response = await fetch(`/api/ferroviaria/avisos/${warning.id}/reverter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atividade: warning })
      });
      const result = await response.json();
      
      if (result.success) {
        showNotification('Remoção revertida - itens adicionados de volta ao inventário', 'success');
        setWarnings(warnings.filter(w => w.id !== warning.id));
        loadData(); // Reload to update inventory
      } else {
        showNotification('Erro ao reverter remoção', 'error');
      }
    } catch (error) {
      console.error('Erro ao reverter remoção:', error);
      showNotification('Erro ao reverter remoção', 'error');
    }
  };

  const handleIgnoreWarning = (warning) => {
    setWarnings(warnings.filter(w => w.id !== warning.id));
    showNotification('Aviso ignorado', 'info');
  };

  // ==============================
  // BOX COSTS CONFIGURATION
  // ==============================
  
  const openConfigDialog = () => {
    setOpenDialog('config');
  };

  const saveBoxCosts = async () => {
    try {
      const response = await fetch('/api/ferroviaria/configuracao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custo_caixa_animal: parseFloat(boxCosts.caixaanimal),
          custo_caixa_verduras: parseFloat(boxCosts.caixadeverduras)
        })
      });

      const result = await response.json();
      if (result.success) {
        showNotification('Custos atualizados com sucesso', 'success');
        closeDialog();
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar custos:', error);
      showNotification('Erro ao salvar custos', 'error');
    }
  };

  // ==============================
  // COMPONENTES DE RENDERIZAÇÃO
  // ==============================

  const renderWarningRibbon = () => {
    if (warnings.length === 0) return null;

    return (
      <Alert 
        severity="error" 
        sx={{ mb: 2, borderRadius: 1 }}
        action={
          <Box>
            {warnings.map((warning) => (
              <Box key={warning.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => handleApproveWarning(warning)}
                >
                  Aprovar
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => handleReverseWarning(warning)}
                >
                  Reverter
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => handleIgnoreWarning(warning)}
                >
                  Ignorar
                </Button>
              </Box>
            ))}
          </Box>
        }
      >
        <Typography variant="subtitle2">
          <strong>⚠️ Remoção Não Autorizada de Caixas</strong>
        </Typography>
        {warnings.map((warning) => (
          <Typography key={warning.id} variant="body2">
            {warning.usuario} removeu {warning.quantidade}x {warning.display_name} em {new Date(warning.timestamp).toLocaleString('pt-BR')}
          </Typography>
        ))}
      </Alert>
    );
  };

  const renderOverviewCards = () => {
    if (!analise) return null;

    return (
      <Grid container spacing={3}>
        {/* Caixas Disponíveis */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <InventoryIcon color="primary" />
                <Typography variant="h6">Caixas</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {analise.caixas.disponiveis}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Disponíveis ({analise.caixas.total_entregues} já entregues)
              </Typography>
              {analise.caixas.detalhes_inventario && (
                <Box mt={1}>
                  <Typography variant="caption" display="block" color="primary">
                    <strong>Agro:</strong> {analise.caixas.detalhes_inventario.find(c => c.id === 'caixaanimal')?.quantidade || 0}x
                  </Typography>
                  <Typography variant="caption" display="block" color="secondary">
                    <strong>Verduras:</strong> {analise.caixas.detalhes_inventario.find(c => c.id === 'caixadeverduras')?.quantidade || 0}x
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Entregas Possíveis */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <ShippingIcon color="secondary" />
                <Typography variant="h6">Entregas</Typography>
              </Box>
              <Typography variant="h4" color="secondary">
                {analise.entregas.completadas}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Completadas ({analise.entregas.possiveis} possíveis agora)
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {analise.caixas.restantes_apos_entregas > 0 && 
                  `${analise.caixas.restantes_apos_entregas} caixas sobrando`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Receita Potencial */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <MoneyIcon color="success" />
                <Typography variant="h6">Receita</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                ${analise.financeiro.receita_real_total.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Receita total (${analise.financeiro.receita_ferroviaria_potencial?.toLocaleString() || 0} potencial)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Lucro Líquido */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon color="warning" />
                <Typography variant="h6">Lucro</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                ${analise.financeiro.lucro_liquido.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ROI: {analise.financeiro.roi_percentage}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderAnaliseDetalhada = () => {
    if (!analise) return null;

    return (
      <Grid container spacing={3}>
        {/* Análise Financeira */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Análise Financeira
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Receita Total Realizada</Typography>
              <Typography variant="h6" color="success.main">
                ${analise.financeiro.receita_real_total.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                De {analise.caixas.total_entregues} caixas entregues
              </Typography>
            </Box>
            {analise.financeiro.custo_real_total > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Custo Real Total</Typography>
                <Typography variant="h6" color="error.main">
                  -${analise.financeiro.custo_real_total.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Custo de produção das caixas entregues
                </Typography>
              </Box>
            )}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Pagamentos aos Investidores</Typography>
              <Typography variant="h6" color="warning.main">
                -${analise.financeiro.total_pagamentos.toLocaleString()}
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="body2">Lucro Líquido</Typography>
              <Typography variant="h5" color="primary.main">
                ${analise.financeiro.lucro_liquido.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Eficiência vs Venda Normal: {analise.eficiencia.eficiencia_vs_venda}%
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Pagamentos aos Investidores */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Pagamentos aos Investidores
            </Typography>
            {analise.financeiro.pagamentos_investidores.map((investidor, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2">{investidor.investidor}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {investidor.funcao} - {investidor.porcentagem}%
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="warning.main">
                    ${investidor.pagamento.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            ))}
            {analise.financeiro.pagamentos_investidores.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                Nenhum investidor cadastrado
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Eficiência */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Indicadores de Eficiência
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    ${analise.eficiencia.lucro_por_hora}
                  </Typography>
                  <Typography variant="body2">Lucro por Hora</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="secondary">
                    ${analise.eficiencia.lucro_por_caixa}
                  </Typography>
                  <Typography variant="body2">Lucro por Caixa</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success">
                    {analise.eficiencia.utilizacao_trem}%
                  </Typography>
                  <Typography variant="body2">Utilização do Trem</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={analise.eficiencia.utilizacao_trem} 
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning">
                    +{analise.eficiencia.eficiencia_vs_venda}%
                  </Typography>
                  <Typography variant="body2">vs Venda Normal</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderInvestidores = () => {
    if (!dados) return null;

    const investidores = Object.values(dados.investidores);

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Investidores</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openInvestidorDialog()}
          >
            Adicionar Investidor
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Pombo</TableCell>
                <TableCell>Função</TableCell>
                <TableCell align="right">Porcentagem</TableCell>
                <TableCell align="right">Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {investidores.map((investidor) => (
                <TableRow key={investidor.id}>
                  <TableCell>{investidor.nome}</TableCell>
                  <TableCell>{investidor.pombo}</TableCell>
                  <TableCell>{investidor.funcao}</TableCell>
                  <TableCell align="right">{investidor.porcentagem}%</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={investidor.ativo ? 'Ativo' : 'Inativo'}
                      color={investidor.ativo ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton 
                        size="small" 
                        onClick={() => openInvestidorDialog(investidor)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => deleteInvestidor(investidor.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {investidores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Nenhum investidor cadastrado
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Move all service functions to component level
  const calculateTotals = () => {
    const numDeliveries = parseInt(formData.numero_entregas) || 0;
    const totalBoxes = numDeliveries * 250; // 250 boxes per delivery
    const grossRevenue = totalBoxes * 4; // $4 per box
    const investorPayment = grossRevenue * 0.2; // 20% to investors
    const netRevenue = grossRevenue - investorPayment;
    
    // Estimate production cost
    const animalBoxes = parseInt(formData.tipo_caixas_animal) || 0;
    const plantBoxes = parseInt(formData.tipo_caixas_verduras) || 0;
    const productionCost = (animalBoxes * boxCosts.caixaanimal) + (plantBoxes * boxCosts.caixadeverduras);
    const netProfit = netRevenue - productionCost;
    
    return {
      totalBoxes,
      grossRevenue,
      investorPayment,
      netRevenue,
      productionCost,
      netProfit
    };
  };

  const handleServiceSubmit = async () => {
    try {
      const totals = calculateTotals();
      
      const response = await fetch('/api/ferroviaria/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: formData.manager_id,
          numero_entregas: parseInt(formData.numero_entregas),
          total_caixas: totals.totalBoxes,
          tipo_caixas: {
            caixaanimal: parseInt(formData.tipo_caixas_animal) || 0,
            caixadeverduras: parseInt(formData.tipo_caixas_verduras) || 0
          },
          tempo_inicio: formData.tempo_inicio,
          tempo_fim: formData.tempo_fim,
          notas: formData.notas
        })
      });

      const result = await response.json();
      if (result.success) {
        showNotification('Serviço ferroviário registrado com sucesso!', 'success');
        resetForm();
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao registrar serviço:', error);
      showNotification('Erro ao registrar serviço', 'error');
    }
  };

  const handleServiceEdit = async () => {
    try {
      const totals = calculateTotals();
      
      const response = await fetch(`/api/ferroviaria/service/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: formData.manager_id,
          numero_entregas: parseInt(formData.numero_entregas),
          total_caixas: totals.totalBoxes,
          tipo_caixas: {
            caixaanimal: parseInt(formData.tipo_caixas_animal) || 0,
            caixadeverduras: parseInt(formData.tipo_caixas_verduras) || 0
          },
          tempo_inicio: formData.tempo_inicio,
          tempo_fim: formData.tempo_fim,
          notas: formData.notas
        })
      });

      const result = await response.json();
      if (result.success) {
        showNotification('Serviço ferroviário atualizado com sucesso!', 'success');
        closeDialog();
        resetForm();
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao editar serviço:', error);
      showNotification('Erro ao editar serviço', 'error');
    }
  };

  const handleServiceDelete = async (serviceId) => {
    if (!window.confirm('Tem certeza que deseja remover este serviço? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/ferroviaria/service/${serviceId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        showNotification('Serviço ferroviário removido com sucesso!', 'success');
        loadData();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao remover serviço:', error);
      showNotification('Erro ao remover serviço', 'error');
    }
  };

  const openServiceEditDialog = (service) => {
    setFormData({
      ...formData,
      manager_id: service.manager_id,
      numero_entregas: service.numero_entregas,
      total_caixas: service.caixas_utilizadas,
      tipo_caixas_animal: service.tipo_caixas?.caixaanimal || 0,
      tipo_caixas_verduras: service.tipo_caixas?.caixadeverduras || 0,
      tempo_inicio: service.tempo_inicio?.substring(0, 16) || '', // Format for datetime-local
      tempo_fim: service.tempo_fim?.substring(0, 16) || '',
      notas: service.notas || ''
    });
    setEditingItem(service);
    setOpenDialog('service');
  };

  const renderServiceRegistration = () => {
    if (!dados) return null;

    const totals = calculateTotals();

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Registrar Novo Serviço Ferroviário
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Gerente Responsável</InputLabel>
                  <Select
                    value={formData.manager_id}
                    onChange={(e) => handleFormChange('manager_id', e.target.value)}
                  >
                    {managers.map((manager) => (
                      <MenuItem key={manager.id} value={manager.id}>
                        {manager.nome} ({manager.funcao})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número de Entregas"
                  type="number"
                  value={formData.numero_entregas}
                  onChange={(e) => handleFormChange('numero_entregas', e.target.value)}
                  margin="normal"
                  helperText="Cada entrega = 250 caixas"
                  inputProps={{ min: 1 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Caixas de Animal"
                  type="number"
                  value={formData.tipo_caixas_animal}
                  onChange={(e) => handleFormChange('tipo_caixas_animal', e.target.value)}
                  margin="normal"
                  helperText={`Custo: $${boxCosts.caixaanimal} por caixa`}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Caixas de Verduras"
                  type="number"
                  value={formData.tipo_caixas_verduras}
                  onChange={(e) => handleFormChange('tipo_caixas_verduras', e.target.value)}
                  margin="normal"
                  helperText={`Custo: $${boxCosts.caixadeverduras} por caixa`}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tempo Início"
                  type="datetime-local"
                  value={formData.tempo_inicio}
                  onChange={(e) => handleFormChange('tempo_inicio', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tempo Fim"
                  type="datetime-local"
                  value={formData.tempo_fim}
                  onChange={(e) => handleFormChange('tempo_fim', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas"
                  multiline
                  rows={2}
                  value={formData.notas}
                  onChange={(e) => handleFormChange('notas', e.target.value)}
                  margin="normal"
                />
              </Grid>
            </Grid>

            {/* Summary */}
            {formData.numero_entregas && (
              <Box mt={3} p={2} sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Resumo do Serviço:</strong>
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2">Total de Caixas:</Typography>
                    <Typography variant="h6">{totals.totalBoxes}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2">Receita Bruta:</Typography>
                    <Typography variant="h6" color="primary">${totals.grossRevenue}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2">Pagamento Investidores (20%):</Typography>
                    <Typography variant="h6" color="error">-${totals.investorPayment}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2">Receita Líquida:</Typography>
                    <Typography variant="h6">${totals.netRevenue}</Typography>
                  </Grid>
                  {totals.productionCost > 0 && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body2">Custo de Produção:</Typography>
                      <Typography variant="h6" color="error">-${totals.productionCost.toFixed(2)}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2">Lucro Líquido:</Typography>
                    <Typography variant="h6" color="success.main">
                      ${totals.netProfit.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button onClick={resetForm}>
                Limpar
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={editingItem ? handleServiceEdit : handleServiceSubmit}
                disabled={!formData.manager_id || !formData.numero_entregas}
              >
                {editingItem ? 'Atualizar Serviço' : 'Registrar Serviço'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderServiceHistory = () => {
    if (!dados) return null;

    const services = dados.entregas.filter(e => e.manager_id); // Only show services with manager_id
    const formatDate = (timestamp) => {
      return new Date(timestamp).toLocaleString('pt-BR');
    };

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    };

    const getManagerName = (managerId) => {
      const manager = managers.find(m => m.id === managerId);
      return manager ? manager.nome : 'Desconhecido';
    };

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Histórico de Serviços Ferroviários
        </Typography>

        {services.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum serviço registrado ainda.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell align="right">Entregas</TableCell>
                  <TableCell align="right">Caixas</TableCell>
                  <TableCell align="right">Receita</TableCell>
                  <TableCell align="right">Lucro Total</TableCell>
                  <TableCell align="right">Split Managers</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services
                  .sort((a, b) => new Date(b.timestamp || b.tempo_fim) - new Date(a.timestamp || a.tempo_fim))
                  .map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      {formatDate(service.timestamp || service.tempo_fim)}
                    </TableCell>
                    <TableCell>
                      {getManagerName(service.manager_id)}
                    </TableCell>
                    <TableCell align="right">
                      {service.numero_entregas || Math.ceil(service.caixas_utilizadas / 250)}
                    </TableCell>
                    <TableCell align="right">
                      {service.caixas_utilizadas.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2" color="primary">
                          {formatCurrency(service.gross_revenue || service.valor_recebido)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          -{formatCurrency(service.investor_payment || (service.valor_recebido * 0.2))} invest.
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        color={service.net_profit > 0 ? 'success.main' : 'error.main'}
                      >
                        {formatCurrency(service.net_profit || 
                          (service.valor_recebido * 0.8 - (service.caixas_utilizadas * 1)))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        color="warning.main"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {formatCurrency(service.net_profit || 0)} → Split
                      </Typography>
                      {service.manager_splits && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          {service.manager_splits.length} managers: ${(service.profit_per_manager || 0).toFixed(2)} each
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Tooltip title="Editar">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => openServiceEditDialog(service)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleServiceDelete(service.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Totals Row */}
                {services.length > 0 && (
                  <TableRow sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      <Typography variant="subtitle2">TOTAIS</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      <Typography variant="subtitle2">-</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Typography variant="subtitle2">
                        {services.reduce((sum, s) => sum + (s.numero_entregas || Math.ceil(s.caixas_utilizadas / 250)), 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Typography variant="subtitle2">
                        {services.reduce((sum, s) => sum + (s.caixas_utilizadas || 0), 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Typography variant="subtitle2" color="primary">
                        {formatCurrency(services.reduce((sum, s) => sum + (s.gross_revenue || s.valor_recebido || 0), 0))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Typography variant="subtitle2" color="success.main">
                        {formatCurrency(services.reduce((sum, s) => sum + (s.net_profit || 0), 0))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Typography variant="subtitle2" color="warning.main">
                        {formatCurrency(services.reduce((sum, s) => sum + (s.net_profit || 0), 0))} → Split
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption">-</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const renderCaixasEEntregas = () => {
    if (!dados) return null;

    return (
      <Grid container spacing={3}>
        {/* Caixas Depositadas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Caixas Depositadas</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={openCaixasDialog}
              >
                Adicionar
              </Button>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Qtd</TableCell>
                    <TableCell align="right">Custo Unit.</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dados.caixas_depositos.map((deposito) => (
                    <TableRow key={deposito.id}>
                      <TableCell>{deposito.tipo_caixa}</TableCell>
                      <TableCell align="right">{deposito.quantidade}</TableCell>
                      <TableCell align="right">${deposito.custo_unitario}</TableCell>
                      <TableCell align="right">${deposito.custo_total}</TableCell>
                    </TableRow>
                  ))}
                  {dados.caixas_depositos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhuma caixa depositada
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Entregas Realizadas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Entregas Realizadas</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={openEntregaDialog}
              >
                Nova Entrega
              </Button>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Trabalhador</TableCell>
                    <TableCell align="right">Caixas</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="right">Tempo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dados.entregas.map((entrega) => (
                    <TableRow key={entrega.id}>
                      <TableCell>{entrega.trabalhador}</TableCell>
                      <TableCell align="right">{entrega.caixas_utilizadas}</TableCell>
                      <TableCell align="right">${entrega.valor_recebido}</TableCell>
                      <TableCell align="right">{entrega.duracao_minutos}min</TableCell>
                    </TableRow>
                  ))}
                  {dados.entregas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhuma entrega realizada
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🚂 Ferroviaria
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Sistema de gestão de entregas ferroviárias, investidores e análise de eficiência
          </Typography>
        </Box>
        <Tooltip title="Configurar custos de produção">
          <IconButton color="primary" onClick={openConfigDialog}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Warning Ribbon for Unauthorized Box Removals */}
      {renderWarningRibbon()}

      {/* Overview Section - Always Visible */}
      <Box sx={{ mb: 3 }}>
        {renderOverviewCards()}
        {analise?.caixas?.disponiveis > 0 && (
          <Box mt={3}>
            <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                💰 Oportunidade Imediata - Calculadora Ferrovia
              </Typography>
              
              <Grid container spacing={3}>
                {/* Current Status */}
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                      📦 Inventory Atual
                    </Typography>
                    <Typography variant="body1">
                      <strong>{analise.caixas.disponiveis} caixas totais</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      • {analise.caixas.detalhes_inventario?.find(c => c.id === 'caixaanimal')?.quantidade || 0}x Caixa de Agro
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      • {analise.caixas.detalhes_inventario?.find(c => c.id === 'caixadeverduras')?.quantidade || 0}x Caixa de Verduras
                    </Typography>
                  </Box>
                </Grid>

                {/* Delivery Calculation */}
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                      🚂 Entregas Possíveis
                    </Typography>
                    <Typography variant="h5">
                      {analise.entregas.possiveis} entregas
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      ({analise.entregas.possiveis} × 250 caixas)
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Tempo: {analise.entregas.tempo_estimado_minutos} minutos
                    </Typography>
                    {analise.caixas.restantes_apos_entregas > 0 && (
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Sobram: {analise.caixas.restantes_apos_entregas} caixas
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {/* Profit Calculation */}
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                      💵 Lucro Potencial
                    </Typography>
                    <Typography variant="h5">
                      ${analise.financeiro.lucro_potencial?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Receita: ${analise.financeiro.receita_ferroviaria_potencial?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Investidores (20%): -${((analise.financeiro.receita_ferroviaria_potencial || 0) * 0.2).toLocaleString()}
                    </Typography>
                    {(analise.financeiro.custo_total_caixas || 0) > 0 && (
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Custos: -${analise.financeiro.custo_total_caixas?.toLocaleString() || 0}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {/* Action Button */}
              {analise.entregas.possiveis > 0 && (
                <Box mt={2} textAlign="center">
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    <strong>Pronto para lucrar ${analise.financeiro.lucro_potencial?.toLocaleString() || 0} em {analise.entregas.tempo_estimado_minutos} minutos!</strong>
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>

      {/* Smart Grouped 2x2 Layout */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Row 1: Financial Overview (Analysis + Efficiency) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 'fit-content' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6">Visão Financeira</Typography>
            </Box>
            
            {/* Use original analysis render function - just make it compact */}
            <Box sx={{ '& > *': { mb: 1 }, '& .MuiTypography-h4': { fontSize: '1.5rem' } }}>
              {renderAnaliseDetalhada()}
            </Box>
          </Paper>
        </Grid>

        {/* Row 1: Management Panel (Investors + Quick Service) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 'fit-content' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PeopleIcon color="primary" />
              <Typography variant="h6">Painel de Gestão</Typography>
            </Box>
            
            {/* Use original investor and service registration render functions */}
            <Box sx={{ '& > *': { mb: 2 }, '& .MuiTableContainer-root': { maxHeight: '200px' } }}>
              {renderInvestidores()}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ '& .MuiTextField-root': { mb: 1 }, '& .MuiButton-root': { mr: 1, mb: 1 } }}>
                <Typography variant="subtitle2" gutterBottom>Registrar Serviço</Typography>
                {renderServiceRegistration()}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Service History - Expandable Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon color="primary" />
            <Typography variant="h6">Histórico de Serviços</Typography>
          </Box>
          <Button
            variant="text"
            size="small"
            onClick={() => setExpandedSections(prev => ({ ...prev, serviceHistory: !prev.serviceHistory }))}
            endIcon={expandedSections.serviceHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            {expandedSections.serviceHistory ? 'Ocultar' : 'Mostrar'}
          </Button>
        </Box>
        
        {expandedSections.serviceHistory && (
          <Box>
            {renderServiceHistory()}
          </Box>
        )}
        
        {!expandedSections.serviceHistory && (
          <Typography variant="body2" color="textSecondary">
            Clique em "Mostrar" para ver o histórico completo de serviços
          </Typography>
        )}
      </Paper>

      {/* Dialog Investidor */}
      <Dialog open={openDialog === 'investidor'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Editar Investidor' : 'Adicionar Investidor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nome"
              value={formData.nome}
              onChange={(e) => handleFormChange('nome', e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Pombo"
              value={formData.pombo}
              onChange={(e) => handleFormChange('pombo', e.target.value)}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Função</InputLabel>
              <Select
                value={formData.funcao}
                onChange={(e) => handleFormChange('funcao', e.target.value)}
              >
                <MenuItem value="Owner">Owner</MenuItem>
                <MenuItem value="Investor">Investor</MenuItem>
                <MenuItem value="Partner">Partner</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Porcentagem (%)"
              type="number"
              value={formData.porcentagem}
              onChange={(e) => handleFormChange('porcentagem', e.target.value)}
              margin="normal"
              inputProps={{ min: 0, max: 100, step: 0.1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button onClick={saveInvestidor} variant="contained">
            {editingItem ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Caixas */}
      <Dialog open={openDialog === 'caixas'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Depósito de Caixas</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo de Caixa</InputLabel>
              <Select
                value={formData.tipo_caixa}
                onChange={(e) => handleFormChange('tipo_caixa', e.target.value)}
              >
                {caixasInventario.length === 0 ? (
                  <MenuItem value="" disabled>
                    Nenhuma caixa disponível no inventário
                  </MenuItem>
                ) : (
                  caixasInventario.map((caixa) => (
                    <MenuItem key={caixa.id} value={caixa.id}>
                      {caixa.nome} (Disponível: {caixa.quantidade})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => handleFormChange('quantidade', e.target.value)}
              margin="normal"
              inputProps={{ min: 1 }}
            />
            <TextField
              fullWidth
              label="Custo Unitário ($)"
              type="number"
              value={formData.custo_unitario}
              onChange={(e) => handleFormChange('custo_unitario', e.target.value)}
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Deixe vazio para usar o custo padrão ($1.00)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button onClick={saveCaixas} variant="contained">
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Service Edit */}
      <Dialog open={openDialog === 'service'} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Editar Serviço Ferroviário' : 'Novo Serviço'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Same form as service registration but in a dialog */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Gerente Responsável</InputLabel>
                  <Select
                    value={formData.manager_id}
                    onChange={(e) => handleFormChange('manager_id', e.target.value)}
                  >
                    {managers.map((manager) => (
                      <MenuItem key={manager.id} value={manager.id}>
                        {manager.nome} ({manager.funcao})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número de Entregas"
                  type="number"
                  value={formData.numero_entregas}
                  onChange={(e) => handleFormChange('numero_entregas', e.target.value)}
                  margin="normal"
                  helperText="Cada entrega = 250 caixas"
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Caixas de Animal"
                  type="number"
                  value={formData.tipo_caixas_animal}
                  onChange={(e) => handleFormChange('tipo_caixas_animal', e.target.value)}
                  margin="normal"
                  helperText={`Custo: $${boxCosts.caixaanimal} por caixa`}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Caixas de Verduras"
                  type="number"
                  value={formData.tipo_caixas_verduras}
                  onChange={(e) => handleFormChange('tipo_caixas_verduras', e.target.value)}
                  margin="normal"
                  helperText={`Custo: $${boxCosts.caixadeverduras} por caixa`}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tempo Início"
                  type="datetime-local"
                  value={formData.tempo_inicio}
                  onChange={(e) => handleFormChange('tempo_inicio', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tempo Fim"
                  type="datetime-local"
                  value={formData.tempo_fim}
                  onChange={(e) => handleFormChange('tempo_fim', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas"
                  multiline
                  rows={2}
                  value={formData.notas}
                  onChange={(e) => handleFormChange('notas', e.target.value)}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button 
            onClick={editingItem ? handleServiceEdit : handleServiceSubmit} 
            variant="contained"
            disabled={!formData.manager_id || !formData.numero_entregas}
          >
            {editingItem ? 'Atualizar' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Entrega */}
      <Dialog open={openDialog === 'entrega'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Entrega</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Caixas Utilizadas"
              type="number"
              value={formData.caixas_utilizadas}
              onChange={(e) => handleFormChange('caixas_utilizadas', e.target.value)}
              margin="normal"
              inputProps={{ min: 1 }}
            />
            <TextField
              fullWidth
              label="Valor Recebido ($)"
              type="number"
              value={formData.valor_recebido}
              onChange={(e) => handleFormChange('valor_recebido', e.target.value)}
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Deixe vazio para usar o valor padrão ($1000)"
            />
            <TextField
              fullWidth
              label="Trabalhador"
              value={formData.trabalhador}
              onChange={(e) => handleFormChange('trabalhador', e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Pagamento ao Trabalhador ($)"
              type="number"
              value={formData.pagamento_trabalhador}
              onChange={(e) => handleFormChange('pagamento_trabalhador', e.target.value)}
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              fullWidth
              label="Duração (minutos)"
              type="number"
              value={formData.duracao_minutos}
              onChange={(e) => handleFormChange('duracao_minutos', e.target.value)}
              margin="normal"
              inputProps={{ min: 1 }}
              helperText="Deixe vazio para usar o tempo padrão (10 minutos)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button onClick={saveEntrega} variant="contained">
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Configuração de Custos */}
      <Dialog open={openDialog === 'config'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon />
            Configuração de Custos de Produção
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Configure os custos de produção para cada tipo de caixa. Defina como 0 se não houver custo.
            </Alert>
            <TextField
              fullWidth
              label="Custo por Caixa de Agro (Animal)"
              type="number"
              value={boxCosts.caixaanimal}
              onChange={(e) => setBoxCosts({...boxCosts, caixaanimal: parseFloat(e.target.value) || 0})}
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Custo unitário para produzir uma caixa de agro/animal"
            />
            <TextField
              fullWidth
              label="Custo por Caixa de Verduras"
              type="number"
              value={boxCosts.caixadeverduras}
              onChange={(e) => setBoxCosts({...boxCosts, caixadeverduras: parseFloat(e.target.value) || 0})}
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Custo unitário para produzir uma caixa de verduras"
            />
            {(boxCosts.caixaanimal > 0 || boxCosts.caixadeverduras > 0) && (
              <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
                <Typography variant="subtitle2" gutterBottom>
                  Impacto nos lucros (por 250 caixas):
                </Typography>
                <Typography variant="body2">
                  • Caixa Agro: -${(250 * boxCosts.caixaanimal).toFixed(2)} de custo
                </Typography>
                <Typography variant="body2">
                  • Caixa Verduras: -${(250 * boxCosts.caixadeverduras).toFixed(2)} de custo
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button onClick={saveBoxCosts} variant="contained">
            Salvar Configuração
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      {notification.open && (
        <Alert 
          severity={notification.severity} 
          onClose={() => setNotification({...notification, open: false})}
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
        >
          {notification.message}
        </Alert>
      )}
    </Box>
  );
};

export default Ferroviaria;