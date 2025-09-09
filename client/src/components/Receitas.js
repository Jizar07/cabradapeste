import React, { useState, useEffect } from 'react';
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
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Calculate as CalculateIcon,
  TrendingUp as ProfitIcon,
  ShoppingCart as MaterialIcon,
  MonetizationOn as CostIcon,
  ExpandMore as ExpandMoreIcon,
  Remove as RemoveIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`recipe-tabpanel-${index}`}
    aria-labelledby={`recipe-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const Receitas = () => {
  const socket = useSocket();
  const [tabValue, setTabValue] = useState(0);
  const [recipes, setRecipes] = useState([]);
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // 'add', 'edit', 'delete', 'calculate'
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    outputQuantity: '',
    materials: []
  });
  const [materialForm, setMaterialForm] = useState({ name: '', quantity: '' });
  const [alert, setAlert] = useState(null);
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [profitCalculation, setProfitCalculation] = useState(null);

  // Load initial data
  useEffect(() => {
    loadRecipes();
    loadPricing();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('recipes:update', (data) => {
        console.log('Recipes updated via Socket.IO:', data);
        setRecipes(Object.entries(data).map(([name, recipe]) => ({ name, ...recipe })));
      });

      socket.on('pricing:update', (data) => {
        console.log('Pricing updated via Socket.IO:', data);
        setPricing(data);
        // Recalculate costs when pricing changes
        if (costAnalysis) {
          calculateRecipeCosts(costAnalysis.recipe);
        }
      });

      return () => {
        socket.off('recipes:update');
        socket.off('pricing:update');
      };
    }
  }, [socket, costAnalysis]);

  const loadRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      const data = await response.json();
      setRecipes(Object.entries(data).map(([name, recipe]) => ({ name, ...recipe })));
    } catch (error) {
      console.error('Error loading recipes:', error);
      setAlert({ type: 'error', message: 'Erro ao carregar receitas.' });
    }
  };

  const loadPricing = async () => {
    try {
      const response = await fetch('/api/pricing');
      const data = await response.json();
      setPricing(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading pricing:', error);
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRecipe = () => {
    setDialogType('add');
    setSelectedRecipe(null);
    setFormData({
      name: '',
      outputQuantity: '',
      materials: []
    });
    setOpenDialog(true);
  };

  const handleEditRecipe = (recipe) => {
    setDialogType('edit');
    setSelectedRecipe(recipe);
    setFormData({
      name: recipe.name,
      outputQuantity: recipe.output_quantity?.toString() || '',
      materials: Object.entries(recipe.materials || {}).map(([name, quantity]) => ({ name, quantity }))
    });
    setOpenDialog(true);
  };

  const handleDeleteRecipe = (recipe) => {
    setDialogType('delete');
    setSelectedRecipe(recipe);
    setOpenDialog(true);
  };

  const handleCalculateRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    calculateRecipeCosts(recipe);
    setDialogType('calculate');
    setOpenDialog(true);
  };

  const calculateRecipeCosts = (recipe) => {
    const materials = recipe.materials || {};
    let totalCost = 0;
    let materialCosts = [];
    let businessModel = {
      animalProducts: 0, // $0 cost (self-produced)
      plantMaterials: 0, // Uses farmer payment prices
      miningMaterials: 0, // Uses mineral prices
      purchasedItems: 0 // Market prices
    };

    Object.entries(materials).forEach(([materialName, quantity]) => {
      const itemKey = materialName.toLowerCase();
      const priceData = pricing[itemKey];
      let unitCost = 0;
      let costType = 'unknown';

      if (priceData) {
        // Determine business logic based on item category and type
        if (isAnimalProduct(materialName)) {
          // Animal products are self-produced - $0 cost
          unitCost = 0;
          costType = 'self-produced';
          businessModel.animalProducts += quantity;
        } else if (isPlantMaterial(materialName)) {
          // Plant materials use farmer payment prices
          unitCost = priceData.custom_farmer || priceData.farmer_payment || (priceData.min_price * 0.6);
          costType = 'farmer-payment';
          businessModel.plantMaterials += quantity * unitCost;
        } else if (isMiningMaterial(materialName)) {
          // Mining materials use mineral prices
          unitCost = priceData.min_price || 0;
          costType = 'mining-cost';
          businessModel.miningMaterials += quantity * unitCost;
        } else {
          // Purchased items use market prices
          unitCost = priceData.min_price || 0;
          costType = 'market-price';
          businessModel.purchasedItems += quantity * unitCost;
        }
      }

      const materialCost = quantity * unitCost;
      totalCost += materialCost;

      materialCosts.push({
        name: materialName,
        quantity,
        unitCost,
        totalCost: materialCost,
        costType,
        available: !!priceData
      });
    });

    // Calculate for 5 boxes (125 units total output)
    const batchMultiplier = 5;
    const batchOutput = (recipe.output_quantity || 0) * batchMultiplier;
    const batchTotalCost = totalCost * batchMultiplier;
    const costPerUnit = batchOutput > 0 ? batchTotalCost / batchOutput : 0;

    setCostAnalysis({
      recipe,
      materialCosts,
      totalCost,
      batchTotalCost,
      batchOutput,
      costPerUnit,
      businessModel
    });

    // Calculate profit if we have sell price
    const recipeKey = recipe.name.toLowerCase();
    const sellPriceData = pricing[recipeKey];
    if (sellPriceData) {
      const sellPrice = sellPriceData.max_price || sellPriceData.min_price || 0;
      const revenue = batchOutput * sellPrice;
      const profit = revenue - batchTotalCost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      setProfitCalculation({
        sellPrice,
        revenue,
        profit,
        profitMargin,
        unitProfit: batchOutput > 0 ? profit / batchOutput : 0
      });
    } else {
      setProfitCalculation(null);
    }
  };

  const isAnimalProduct = (materialName) => {
    const animalProducts = [
      'buchada de bode', 'buchada_de_bode',
      'leite de cabra', 'leite_de_cabra',
      'leite de ovelha', 'leite_de_ovelha', 
      'leite de vaca', 'leite_de_vaca',
      'leite de porco', 'leite_de_porco',
      'leite de mula', 'leite_de_mula',
      'carne de porco', 'carne_de_porco',
      'crina de galo', 'crina_de_galo',
      'couro de mula', 'couro_de_mula',
      'la de ovelha', 'la_de_ovelha',
      'taurina', 'ovos', 'ovo', 'leite'
    ];
    return animalProducts.some(product => 
      materialName.toLowerCase().includes(product) || product.includes(materialName.toLowerCase())
    );
  };

  const isPlantMaterial = (materialName) => {
    const plantMaterials = ['trigo', 'junco', 'milho', 'wheat', 'bulrush'];
    return plantMaterials.some(plant => 
      materialName.toLowerCase().includes(plant) || plant.includes(materialName.toLowerCase())
    );
  };

  const isMiningMaterial = (materialName) => {
    const miningMaterials = ['carvao', 'salitre', 'enxofre', 'ferro', 'wood'];
    return miningMaterials.some(mineral => 
      materialName.toLowerCase().includes(mineral) || mineral.includes(materialName.toLowerCase())
    );
  };

  const addMaterial = () => {
    if (materialForm.name && materialForm.quantity && !isNaN(materialForm.quantity)) {
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, { 
          name: materialForm.name, 
          quantity: parseInt(materialForm.quantity) 
        }]
      }));
      setMaterialForm({ name: '', quantity: '' });
    }
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (dialogType === 'delete') {
      try {
        const response = await fetch(`/api/recipes/${encodeURIComponent(selectedRecipe.name)}`, {
          method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
          setAlert({ type: 'success', message: 'Receita removida com sucesso!' });
          setOpenDialog(false);
          loadRecipes();
        } else {
          setAlert({ type: 'error', message: result.error || 'Erro ao remover receita.' });
        }
      } catch (error) {
        setAlert({ type: 'error', message: 'Erro de conexão com o servidor.' });
      }
      return;
    }

    // Validation
    if (!formData.name || !formData.outputQuantity || formData.materials.length === 0) {
      setAlert({ type: 'error', message: 'Por favor, preencha todos os campos obrigatórios.' });
      return;
    }

    const outputQuantity = parseInt(formData.outputQuantity);
    if (isNaN(outputQuantity) || outputQuantity <= 0) {
      setAlert({ type: 'error', message: 'Quantidade de saída deve ser um número positivo.' });
      return;
    }

    try {
      const materials = {};
      formData.materials.forEach(material => {
        materials[material.name] = material.quantity;
      });

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          recipeData: {
            name: formData.name,
            output_quantity: outputQuantity,
            materials
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAlert({ 
          type: 'success', 
          message: `Receita ${dialogType === 'add' ? 'adicionada' : 'atualizada'} com sucesso!` 
        });
        setOpenDialog(false);
        loadRecipes();
      } else {
        setAlert({ type: 'error', message: result.error || 'Erro ao processar operação.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Erro de conexão com o servidor.' });
    }
  };

  const CostAnalysisDisplay = () => {
    if (!costAnalysis) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          📊 Análise de Custos: {costAnalysis.recipe.name}
        </Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Custo Total (1 lote)
                </Typography>
                <Typography variant="h6" color="error.main">
                  ${costAnalysis.totalCost.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Custo Total (5 lotes)
                </Typography>
                <Typography variant="h6" color="warning.main">
                  ${costAnalysis.batchTotalCost.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Saída Total (5 lotes)
                </Typography>
                <Typography variant="h6" color="info.main">
                  {costAnalysis.batchOutput} unidades
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Custo por Unidade
                </Typography>
                <Typography variant="h6" color="primary">
                  ${costAnalysis.costPerUnit.toFixed(3)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Profit Analysis */}
        {profitCalculation && (
          <Card sx={{ mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💰 Análise de Lucro
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Preço de Venda</Typography>
                  <Typography variant="h6">${profitCalculation.sellPrice.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Receita Total</Typography>
                  <Typography variant="h6">${profitCalculation.revenue.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Lucro Total</Typography>
                  <Typography variant="h6" color={profitCalculation.profit >= 0 ? 'inherit' : 'error.main'}>
                    ${profitCalculation.profit.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Margem de Lucro</Typography>
                  <Typography variant="h6" color={profitCalculation.profitMargin >= 0 ? 'inherit' : 'error.main'}>
                    {profitCalculation.profitMargin.toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Business Model Breakdown */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📈 Breakdown por Modelo de Negócio
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Produtos Animais (Auto-produzidos)"
                  secondary={`${costAnalysis.businessModel.animalProducts} itens - $0.00 (sem custo)`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Materiais Vegetais (Pagamento ao Fazendeiro)"
                  secondary={`Custo: $${costAnalysis.businessModel.plantMaterials.toFixed(2)}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Materiais de Mineração"
                  secondary={`Custo: $${costAnalysis.businessModel.miningMaterials.toFixed(2)}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Itens Comprados (Preço de Mercado)"
                  secondary={`Custo: $${costAnalysis.businessModel.purchasedItems.toFixed(2)}`}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Material Costs Details */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              🧾 Detalhes dos Materiais ({costAnalysis.materialCosts.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Custo Unitário</TableCell>
                    <TableCell align="right">Custo Total</TableCell>
                    <TableCell>Tipo de Custo</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costAnalysis.materialCosts.map((material, index) => (
                    <TableRow key={index}>
                      <TableCell>{material.name}</TableCell>
                      <TableCell align="right">{material.quantity}</TableCell>
                      <TableCell align="right">
                        ${material.unitCost.toFixed(3)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          color={material.totalCost === 0 ? 'success.main' : 'text.primary'}
                          sx={{ fontWeight: 500 }}
                        >
                          ${material.totalCost.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          label={material.costType}
                          color={
                            material.costType === 'self-produced' ? 'success' :
                            material.costType === 'farmer-payment' ? 'primary' :
                            material.costType === 'mining-cost' ? 'warning' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          size="small"
                          label={material.available ? 'Preço OK' : 'Sem Preço'}
                          color={material.available ? 'success' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  const RecipeTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>Receita</strong></TableCell>
            <TableCell align="right"><strong>Saída</strong></TableCell>
            <TableCell align="right"><strong>Materiais</strong></TableCell>
            <TableCell align="right"><strong>Custo Estimado</strong></TableCell>
            <TableCell align="center"><strong>Ações</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                Carregando...
              </TableCell>
            </TableRow>
          ) : filteredRecipes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {searchTerm ? 'Nenhuma receita encontrada' : 'Nenhuma receita cadastrada'}
              </TableCell>
            </TableRow>
          ) : (
            filteredRecipes.map((recipe) => {
              const materialCount = Object.keys(recipe.materials || {}).length;
              
              // Quick cost estimation
              let estimatedCost = 0;
              Object.entries(recipe.materials || {}).forEach(([materialName, quantity]) => {
                const itemKey = materialName.toLowerCase();
                const priceData = pricing[itemKey];
                if (priceData && !isAnimalProduct(materialName)) {
                  const unitCost = isPlantMaterial(materialName) 
                    ? (priceData.custom_farmer || priceData.farmer_payment || (priceData.min_price * 0.6))
                    : priceData.min_price || 0;
                  estimatedCost += quantity * unitCost;
                }
              });
              
              return (
                <TableRow key={recipe.name} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {recipe.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={`${recipe.output_quantity || 0} unidades`}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="textSecondary">
                      {materialCount} materiais
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body1" 
                      color="warning.main"
                      sx={{ fontWeight: 500 }}
                    >
                      ${estimatedCost.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="success" 
                      size="small"
                      onClick={() => handleCalculateRecipe(recipe)}
                      title="Calcular Custos"
                      sx={{ mr: 0.5 }}
                    >
                      <CalculateIcon />
                    </IconButton>
                    <IconButton 
                      color="primary" 
                      size="small"
                      onClick={() => handleEditRecipe(recipe)}
                      title="Editar"
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small"
                      onClick={() => handleDeleteRecipe(recipe)}
                      title="Excluir"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          🧪 Gerenciamento de Receitas
        </Typography>
        <Box>
          <IconButton onClick={() => { loadRecipes(); loadPricing(); }} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddRecipe}
          >
            Adicionar Receita
          </Button>
        </Box>
      </Box>

      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Receitas
              </Typography>
              <Typography variant="h4" color="primary">
                {recipes.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Receitas com Preços
              </Typography>
              <Typography variant="h4" color="success.main">
                {recipes.filter(recipe => pricing[recipe.name.toLowerCase()]).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Materiais Únicos
              </Typography>
              <Typography variant="h4" color="info.main">
                {new Set(recipes.flatMap(recipe => Object.keys(recipe.materials || {}))).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Receitas Lucrativas
              </Typography>
              <Typography variant="h4" color="warning.main">
                {recipes.filter(recipe => {
                  const sellData = pricing[recipe.name.toLowerCase()];
                  return sellData && sellData.max_price > 0;
                }).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar receitas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Recipe Table */}
      <RecipeTable />

      {/* Add/Edit/Delete/Calculate Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth={dialogType === 'calculate' ? 'lg' : 'md'} 
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'add' && '➕ Adicionar Receita'}
          {dialogType === 'edit' && '✏️ Editar Receita'}
          {dialogType === 'delete' && '🗑️ Remover Receita'}
          {dialogType === 'calculate' && '🧮 Análise de Custos e Lucro'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {dialogType === 'delete' ? (
              <Alert severity="warning">
                Tem certeza que deseja remover a receita <strong>{selectedRecipe?.name}</strong>? 
                Esta ação não pode ser desfeita.
              </Alert>
            ) : dialogType === 'calculate' ? (
              <CostAnalysisDisplay />
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome da Receita"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={dialogType === 'edit'}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Quantidade de Saída"
                    type="number"
                    value={formData.outputQuantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, outputQuantity: e.target.value }))}
                    inputProps={{ min: 1 }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Materiais Necessários
                  </Typography>
                  
                  {/* Add Material Form */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      label="Nome do Material"
                      value={materialForm.name}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, name: e.target.value }))}
                      sx={{ flex: 2 }}
                    />
                    <TextField
                      label="Quantidade"
                      type="number"
                      value={materialForm.quantity}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, quantity: e.target.value }))}
                      inputProps={{ min: 1 }}
                      sx={{ flex: 1 }}
                    />
                    <Button 
                      variant="outlined" 
                      onClick={addMaterial}
                      startIcon={<AddIcon />}
                    >
                      Adicionar
                    </Button>
                  </Box>
                  
                  {/* Materials List */}
                  {formData.materials.length > 0 && (
                    <List sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      {formData.materials.map((material, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={material.name}
                            secondary={`Quantidade: ${material.quantity}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              color="error"
                              onClick={() => removeMaterial(index)}
                            >
                              <RemoveIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogType === 'calculate' ? 'Fechar' : 'Cancelar'}
          </Button>
          {dialogType !== 'calculate' && (
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              color={dialogType === 'delete' ? 'error' : 'primary'}
            >
              {dialogType === 'add' && 'Adicionar'}
              {dialogType === 'edit' && 'Salvar'}
              {dialogType === 'delete' && 'Remover'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Receitas;