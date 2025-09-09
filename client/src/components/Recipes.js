import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Kitchen as RecipeIcon,
  TrendingUp as ProfitIcon,
  AttachMoney as CostIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ShoppingCart as OrderIcon,
  Mail as MailIcon
} from '@mui/icons-material';

const Recipes = () => {
  const [precos, setPrecos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab management
  const [currentTab, setCurrentTab] = useState(0);
  
  // Encomendas state
  const [encomendas, setEncomendas] = useState([]);
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderForm, setOrderForm] = useState({
    cliente: '',
    pombo: '',
    item: '',
    quantidade: 1,
    preco_unitario: 0,
    observacoes: ''
  });

  // Recipe definitions based on your screenshots and existing ones
  const recipes = [
    // New recipes from screenshots
    {
      id: 'saco_milho',
      nome: 'Saco de Milho',
      categoria: 'PROCESSAMENTO',
      produz: 25,
      materiais: [
        { item: 'milho', quantidade: 200, nome: 'Milho' }
      ]
    },
    {
      id: 'amido_milho',
      nome: 'Amido de Milho',
      categoria: 'PROCESSAMENTO',
      produz: 12,
      materiais: [
        { item: 'wood', quantidade: 6, nome: 'Wood' },
        { item: 'moedor', quantidade: 3, nome: 'Moedor' },
        { item: 'corn', quantidade: 6, nome: 'Corn' }
      ]
    },
    {
      id: 'cascalho',
      nome: 'Cascalho',
      categoria: 'MINERACAO',
      produz: 15,
      materiais: [
        { item: 'wood', quantidade: 5, nome: 'Wood' },
        { item: 'ferro', quantidade: 6, nome: 'Ferro' },
        { item: 'carvao', quantidade: 5, nome: 'Carvão' }
      ]
    },
    {
      id: 'polvora',
      nome: 'Pólvora',
      categoria: 'MINERACAO',
      produz: 24,
      materiais: [
        { item: 'salitre', quantidade: 3, nome: 'Salitre' },
        { item: 'carvao', quantidade: 3, nome: 'Carvão' },
        { item: 'embalagem', quantidade: 6, nome: 'Embalagem' },
        { item: 'enxofre', quantidade: 3, nome: 'Enxofre' }
      ]
    },
    // Existing recipes from CLAUDE.md
    {
      id: 'caixa_agro',
      nome: 'Caixa de Agro',
      categoria: 'CAIXAS',
      produz: 25,
      materiais: [
        { item: 'caixa_rustica', quantidade: 5, nome: 'Caixa Rústica' },
        { item: 'leite_de_mula', quantidade: 12, nome: 'Leite de Mula' },
        { item: 'couro_de_mula', quantidade: 12, nome: 'Couro de Mula' },
        { item: 'la_de_ovelha', quantidade: 12, nome: 'Lã de Ovelha' },
        { item: 'carne_de_porco', quantidade: 12, nome: 'Carne de Porco' },
        { item: 'leite_de_porco', quantidade: 12, nome: 'Leite de Porco' },
        { item: 'leite_de_vaca', quantidade: 12, nome: 'Leite de Vaca' },
        { item: 'crina_de_galo', quantidade: 12, nome: 'Crina de Galo' },
        { item: 'buchada_de_bode', quantidade: 12, nome: 'Buchada de Bode' },
        { item: 'ovos', quantidade: 12, nome: 'Ovos' },
        { item: 'leite_de_cabra', quantidade: 12, nome: 'Leite de Cabra' },
        { item: 'leite_de_ovelha', quantidade: 12, nome: 'Leite de Ovelha' },
        { item: 'taurina', quantidade: 12, nome: 'Taurina' }
      ]
    },
    {
      id: 'caixa_verduras',
      nome: 'Caixa de Verduras',
      categoria: 'CAIXAS',
      produz: 25,
      materiais: [
        { item: 'rustic_box', quantidade: 5, nome: 'Rustic Box' },
        { item: 'junco', quantidade: 50, nome: 'Junco' },
        { item: 'trigo', quantidade: 50, nome: 'Trigo' },
        { item: 'milho', quantidade: 100, nome: 'Milho' }
      ]
    }
  ];

  useEffect(() => {
    loadPrecos();
    loadEncomendas();
  }, []);

  const loadEncomendas = () => {
    // Load from localStorage for now - could be moved to backend later
    const savedOrders = localStorage.getItem('encomendas');
    if (savedOrders) {
      setEncomendas(JSON.parse(savedOrders));
    }
  };

  const saveEncomendas = (newEncomendas) => {
    localStorage.setItem('encomendas', JSON.stringify(newEncomendas));
    setEncomendas(newEncomendas);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenOrderDialog = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setOrderForm(order);
    } else {
      setEditingOrder(null);
      setOrderForm({
        cliente: '',
        pombo: '',
        item: '',
        quantidade: 1,
        preco_unitario: 0,
        observacoes: ''
      });
    }
    setOpenOrderDialog(true);
  };

  const handleCloseOrderDialog = () => {
    setOpenOrderDialog(false);
    setEditingOrder(null);
  };

  const handleOrderFormChange = (field, value) => {
    const newForm = { ...orderForm, [field]: value };
    
    // Auto-calculate price when item changes
    if (field === 'item' && value) {
      const itemPrice = getPrecoItem(value);
      if (itemPrice > 0) {
        newForm.preco_unitario = itemPrice;
      }
    }
    
    setOrderForm(newForm);
  };

  const handleSaveOrder = () => {
    const newOrder = {
      ...orderForm,
      id: editingOrder ? editingOrder.id : Date.now(),
      data_criacao: editingOrder ? editingOrder.data_criacao : new Date().toISOString(),
      status: editingOrder ? editingOrder.status : 'pendente'
    };

    let newEncomendas;
    if (editingOrder) {
      newEncomendas = encomendas.map(order => 
        order.id === editingOrder.id ? newOrder : order
      );
    } else {
      newEncomendas = [...encomendas, newOrder];
    }

    saveEncomendas(newEncomendas);
    handleCloseOrderDialog();
  };

  const handleDeleteOrder = (orderId) => {
    const newEncomendas = encomendas.filter(order => order.id !== orderId);
    saveEncomendas(newEncomendas);
  };

  const calcularCustoEncomenda = (order) => {
    // Try to find a recipe that produces this item
    const recipe = recipes.find(r => 
      r.nome.toLowerCase().includes(order.item.toLowerCase()) ||
      order.item.toLowerCase().includes(r.nome.toLowerCase())
    );

    if (recipe) {
      const custoUnitario = calcularCustoPorUnidade(recipe);
      return custoUnitario * order.quantidade;
    }

    // If no recipe found, use base material cost
    const materialCost = getPrecoItem(order.item) * 0.7; // Assume 70% material cost
    return materialCost * order.quantidade;
  };

  const calcularLucroEncomenda = (order) => {
    const custoTotal = calcularCustoEncomenda(order);
    const vendaTotal = order.preco_unitario * order.quantidade;
    return vendaTotal - custoTotal;
  };

  const loadPrecos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/precos');
      if (response.ok) {
        const data = await response.json();
        setPrecos(data.itens || {});
      } else {
        throw new Error('Falha ao carregar preços');
      }
    } catch (error) {
      console.error('Error loading prices:', error);
      setError('Erro ao carregar lista de preços');
    } finally {
      setLoading(false);
    }
  };

  const getPrecoItem = (itemId) => {
    const item = precos[itemId];
    if (item) {
      return (item.preco_min + item.preco_max) / 2;
    }
    
    // Fallback prices for common items not in price list
    const fallbackPrices = {
      // Basic plants
      'milho': 0.10,
      'corn': 0.10,
      'junco': 0.10,
      'trigo': 0.10,
      'bulrush': 0.10,
      // Raw materials
      'wood': 0.15,
      'ferro': 0.25,
      'carvao': 0.20,
      'iron': 0.25,
      'coal': 0.20,
      'salitre': 0.30,
      'enxofre': 0.35,
      'embalagem': 0.25,
      // Processed items
      'rustic_box': 1.00,
      'moedor': 0.60, // Average from price list
      // Animal products
      'common_portion_cow': 2.00,
      'common_portion_sheep': 2.00,
      'common_portion_pig': 2.00,
      'common_portion_chicken': 2.00,
      'common_portion_donkey': 2.00,
      'common_portion_goat': 2.00,
      // Caixa de Agro materials
      'caixa_rustica': 1.00,
      'leite_de_mula': 0.50,
      'couro_de_mula': 0.80,
      'la_de_ovelha': 0.60,
      'carne_de_porco': 0.70,
      'leite_de_porco': 0.45,
      'leite_de_vaca': 0.55,
      'crina_de_galo': 0.65,
      'buchada_de_bode': 0.75,
      'ovos': 0.40,
      'leite_de_cabra': 0.50,
      'leite_de_ovelha': 0.50,
      'taurina': 0.90
    };
    
    return fallbackPrices[itemId] || 0;
  };

  const calcularCustoReceita = (receita) => {
    // Use correct costs for box recipes based on actual production costs
    if (receita.id === 'caixa_agro') {
      // Animal Box Cost: $15.17 for 25 boxes = $0.61 per box
      return 15.17;
    }
    
    if (receita.id === 'caixa_verduras') {
      // Plant Box Cost: $32.50 for 25 boxes = $1.30 per box
      return 32.50;
    }
    
    // Default calculation for other recipes
    return receita.materiais.reduce((total, material) => {
      const precoUnitario = getPrecoItem(material.item);
      return total + (precoUnitario * material.quantidade);
    }, 0);
  };

  const calcularCustoPorUnidade = (receita) => {
    const custoTotal = calcularCustoReceita(receita);
    return custoTotal / receita.produz;
  };

  const getCategoriaColor = (categoria) => {
    switch (categoria) {
      case 'PROCESSAMENTO': return 'primary';
      case 'MINERACAO': return 'secondary';
      case 'CAIXAS': return 'success';
      default: return 'default';
    }
  };

  const getPrecoVendaReceita = (receita) => {
    // Try to find the recipe's output item in the price list
    const possibleIds = [
      receita.nome.toLowerCase().replace(/\s+/g, '_'),
      receita.nome.toLowerCase().replace(/\s+/g, ''),
      receita.nome.toLowerCase(),
      // Specific mappings
      receita.nome === 'Saco de Milho' ? 'saco_milho' : null,
      receita.nome === 'Amido de Milho' ? 'amido_milho' : null,
      receita.nome === 'Cascalho' ? 'cascalho' : null,
      receita.nome === 'Pólvora' ? 'polvora' : null,
      receita.nome === 'Caixa de Agro' ? 'caixa_agro' : null,
      receita.nome === 'Caixa de Verduras' ? 'caixa_verduras' : null
    ].filter(Boolean);

    for (const id of possibleIds) {
      const item = precos[id];
      if (item) {
        return {
          min: item.preco_min,
          max: item.preco_max,
          nome: item.nome
        };
      }
    }

    // If not found in price list, suggest reasonable prices based on production cost
    const custoUnitario = calcularCustoPorUnidade(receita);
    return {
      min: custoUnitario * 1.3, // 30% markup minimum
      max: custoUnitario * 2.0, // 100% markup maximum
      nome: receita.nome,
      estimado: true
    };
  };

  const calcularLucroReceita = (receita, precoVenda) => {
    const custoUnitario = calcularCustoPorUnidade(receita);
    const lucroUnitario = precoVenda - custoUnitario;
    const margemLucro = (lucroUnitario / precoVenda) * 100;
    
    return {
      lucro_unitario: lucroUnitario,
      lucro_total: lucroUnitario * receita.produz,
      margem_lucro: margemLucro
    };
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        📋 Receitas & Encomendas
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab 
            label="Receitas" 
            icon={<RecipeIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Encomendas" 
            icon={<OrderIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {currentTab === 0 && (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>💡 Sistema de Cálculo de Custos:</strong><br/>
            Os custos são calculados automaticamente baseado na lista de preços atual. 
            Preços não encontrados usam valores padrão estimados.
          </Alert>

      <Grid container spacing={3}>
        {recipes.map((receita) => {
          const custoTotal = calcularCustoReceita(receita);
          const custoPorUnidade = calcularCustoPorUnidade(receita);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={receita.id}>
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {receita.nome}
                    </Typography>
                    <Chip 
                      label={receita.categoria}
                      color={getCategoriaColor(receita.categoria)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <RecipeIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Produz: <strong>{receita.produz} unidades</strong>
                    </Typography>
                  </Box>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        Materiais Necessários
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Material</TableCell>
                              <TableCell align="right">Qtd</TableCell>
                              <TableCell align="right">Preço Un.</TableCell>
                              <TableCell align="right">Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {receita.materiais.map((material, index) => {
                              const precoUnitario = getPrecoItem(material.item);
                              const custoMaterial = precoUnitario * material.quantidade;
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell>{material.nome}</TableCell>
                                  <TableCell align="right">{material.quantidade}</TableCell>
                                  <TableCell align="right">${precoUnitario.toFixed(2)}</TableCell>
                                  <TableCell align="right">${custoMaterial.toFixed(2)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>

                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#f0f7ff', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        <CostIcon fontSize="small" sx={{ mr: 1 }} />
                        Custo Total:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        ${custoTotal.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        <ProfitIcon fontSize="small" sx={{ mr: 1 }} />
                        Custo por Unidade:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary.main">
                        ${custoPorUnidade.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Profit Analysis Section */}
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#f0fff0', borderRadius: 1, border: '1px solid #c8e6c9' }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <ProfitIcon fontSize="small" sx={{ mr: 1 }} />
                      Análise de Lucro:
                    </Typography>
                    
                    {(() => {
                      const precoVenda = getPrecoVendaReceita(receita);
                      const lucroMin = calcularLucroReceita(receita, precoVenda.min);
                      const lucroMax = calcularLucroReceita(receita, precoVenda.max);
                      
                      return (
                        <Box>
                          {precoVenda.estimado && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
                              ⚠️ Preços estimados (não encontrado na lista)
                            </Typography>
                          )}
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">Preço Min/Max:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              ${precoVenda.min.toFixed(2)} - ${precoVenda.max.toFixed(2)}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">Lucro Min:</Typography>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold" 
                              color={lucroMin.lucro_unitario > 0 ? "success.main" : "error.main"}
                            >
                              ${lucroMin.lucro_unitario.toFixed(2)} ({lucroMin.margem_lucro.toFixed(1)}%)
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">Lucro Max:</Typography>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold" 
                              color={lucroMax.lucro_unitario > 0 ? "success.main" : "error.main"}
                            >
                              ${lucroMax.lucro_unitario.toFixed(2)} ({lucroMax.margem_lucro.toFixed(1)}%)
                            </Typography>
                          </Box>
                          
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #c8e6c9' }}>
                            <Typography variant="body2" fontWeight="bold" color="success.dark">
                              💰 Melhor Ponto de Venda: ${precoVenda.max.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Lucro total por lote: ${lucroMax.lucro_total.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          📊 Resumo de Custos
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Receita</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell align="right">Produz</TableCell>
                <TableCell align="right">Custo Total</TableCell>
                <TableCell align="right">Custo/Unidade</TableCell>
                <TableCell align="right">Preço Sugerido</TableCell>
                <TableCell align="right">Lucro/Unidade</TableCell>
                <TableCell align="right">Margem Max</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipes
                .sort((a, b) => calcularCustoPorUnidade(a) - calcularCustoPorUnidade(b))
                .map((receita) => {
                  const custoTotal = calcularCustoReceita(receita);
                  const custoPorUnidade = calcularCustoPorUnidade(receita);
                  const precoVenda = getPrecoVendaReceita(receita);
                  const lucroMax = calcularLucroReceita(receita, precoVenda.max);
                  
                  return (
                    <TableRow key={receita.id}>
                      <TableCell>{receita.nome}</TableCell>
                      <TableCell>
                        <Chip 
                          label={receita.categoria}
                          color={getCategoriaColor(receita.categoria)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{receita.produz}</TableCell>
                      <TableCell align="right">${custoTotal.toFixed(2)}</TableCell>
                      <TableCell align="right">${custoPorUnidade.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                          ${precoVenda.max.toFixed(2)}
                        </Typography>
                        {precoVenda.estimado && (
                          <Typography variant="caption" color="warning.main">
                            (estimado)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={lucroMax.lucro_unitario > 0 ? "success.main" : "error.main"}
                        >
                          ${lucroMax.lucro_unitario.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={lucroMax.margem_lucro > 50 ? "success.main" : lucroMax.margem_lucro > 20 ? "warning.main" : "error.main"}
                        >
                          {lucroMax.margem_lucro.toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
        </>
      )}

      {currentTab === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Alert severity="info" sx={{ flexGrow: 1, mr: 2 }}>
              <strong>📦 Sistema de Encomendas:</strong><br/>
              Gerencie pedidos de clientes com cálculo automático de custos e lucro.
            </Alert>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenOrderDialog()}
              sx={{ minWidth: 200 }}
            >
              Nova Encomenda
            </Button>
          </Box>

          {encomendas.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <OrderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhuma encomenda cadastrada
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Clique em "Nova Encomenda" para começar
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {encomendas.map((order) => {
                const custoTotal = calcularCustoEncomenda(order);
                const vendaTotal = order.preco_unitario * order.quantidade;
                const lucroTotal = calcularLucroEncomenda(order);
                const margemLucro = ((lucroTotal / vendaTotal) * 100);

                return (
                  <Grid item xs={12} md={6} lg={4} key={order.id}>
                    <Card elevation={3} sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {order.cliente}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <MailIcon fontSize="small" sx={{ mr: 1 }} />
                              Pombo: {order.pombo}
                            </Typography>
                          </Box>
                          <Box>
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenOrderDialog(order)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteOrder(order.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {order.item} - {order.quantidade} unidades
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ${order.preco_unitario.toFixed(2)} por unidade
                          </Typography>
                        </Box>

                        <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 1, mb: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Custo Estimado:
                              </Typography>
                              <Typography variant="body1" fontWeight="bold" color="error.main">
                                ${custoTotal.toFixed(2)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Valor de Venda:
                              </Typography>
                              <Typography variant="body1" fontWeight="bold" color="primary.main">
                                ${vendaTotal.toFixed(2)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Lucro Estimado:
                              </Typography>
                              <Typography 
                                variant="body1" 
                                fontWeight="bold" 
                                color={lucroTotal > 0 ? "success.main" : "error.main"}
                              >
                                ${lucroTotal.toFixed(2)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Margem:
                              </Typography>
                              <Typography 
                                variant="body1" 
                                fontWeight="bold"
                                color={margemLucro > 30 ? "success.main" : margemLucro > 10 ? "warning.main" : "error.main"}
                              >
                                {margemLucro.toFixed(1)}%
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        {order.observacoes && (
                          <Box sx={{ p: 1, backgroundColor: '#fff3cd', borderRadius: 1, border: '1px solid #ffeaa7' }}>
                            <Typography variant="body2">
                              <strong>Obs:</strong> {order.observacoes}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip 
                            label={order.status || 'pendente'}
                            color={order.status === 'concluida' ? 'success' : 'warning'}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(order.data_criacao).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* Summary Table for Orders */}
          {encomendas.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                📊 Resumo de Encomendas
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Qtd</TableCell>
                      <TableCell align="right">Preço Unit.</TableCell>
                      <TableCell align="right">Custo Est.</TableCell>
                      <TableCell align="right">Venda Total</TableCell>
                      <TableCell align="right">Lucro Est.</TableCell>
                      <TableCell align="right">Margem</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {encomendas.map((order) => {
                      const custoTotal = calcularCustoEncomenda(order);
                      const vendaTotal = order.preco_unitario * order.quantidade;
                      const lucroTotal = calcularLucroEncomenda(order);
                      const margemLucro = ((lucroTotal / vendaTotal) * 100);
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell>{order.cliente}</TableCell>
                          <TableCell>{order.item}</TableCell>
                          <TableCell align="right">{order.quantidade}</TableCell>
                          <TableCell align="right">${order.preco_unitario.toFixed(2)}</TableCell>
                          <TableCell align="right">${custoTotal.toFixed(2)}</TableCell>
                          <TableCell align="right">${vendaTotal.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Typography 
                              color={lucroTotal > 0 ? "success.main" : "error.main"}
                              fontWeight="bold"
                            >
                              ${lucroTotal.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              color={margemLucro > 30 ? "success.main" : margemLucro > 10 ? "warning.main" : "error.main"}
                              fontWeight="bold"
                            >
                              {margemLucro.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={order.status || 'pendente'}
                              color={order.status === 'concluida' ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}

      {/* Order Dialog */}
      <Dialog 
        open={openOrderDialog} 
        onClose={handleCloseOrderDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingOrder ? 'Editar Encomenda' : 'Nova Encomenda'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nome do Cliente"
              value={orderForm.cliente}
              onChange={(e) => handleOrderFormChange('cliente', e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              label="Código do Pombo"
              value={orderForm.pombo}
              onChange={(e) => handleOrderFormChange('pombo', e.target.value)}
              sx={{ mb: 2 }}
              required
              helperText="Código de identificação do correio"
            />
            
            <TextField
              fullWidth
              label="Item/Produto"
              value={orderForm.item}
              onChange={(e) => handleOrderFormChange('item', e.target.value)}
              sx={{ mb: 2 }}
              required
              helperText="Nome do item que o cliente quer"
            />
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Quantidade"
                  type="number"
                  value={orderForm.quantidade}
                  onChange={(e) => handleOrderFormChange('quantidade', parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Preço Unitário ($)"
                  type="number"
                  value={orderForm.preco_unitario}
                  onChange={(e) => handleOrderFormChange('preco_unitario', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
                  required
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              label="Observações"
              value={orderForm.observacoes}
              onChange={(e) => handleOrderFormChange('observacoes', e.target.value)}
              multiline
              rows={3}
              helperText="Informações adicionais sobre a encomenda"
            />

            {orderForm.item && orderForm.quantidade > 0 && orderForm.preco_unitario > 0 && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#f0f7ff', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  💰 Análise Financeira:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Custo Estimado:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="error.main">
                      ${(calcularCustoEncomenda(orderForm)).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Valor Total:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">
                      ${(orderForm.preco_unitario * orderForm.quantidade).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Lucro Estimado:
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold" 
                      color={calcularLucroEncomenda(orderForm) > 0 ? "success.main" : "error.main"}
                    >
                      ${calcularLucroEncomenda(orderForm).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrderDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveOrder}
            variant="contained"
            disabled={!orderForm.cliente || !orderForm.pombo || !orderForm.item || orderForm.quantidade <= 0}
          >
            {editingOrder ? 'Atualizar' : 'Criar'} Encomenda
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Recipes;