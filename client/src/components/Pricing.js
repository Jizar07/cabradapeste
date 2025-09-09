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
  CircularProgress,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Stack,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewList as ListViewIcon,
  ViewModule as GridViewIcon,
  Category as CategoryIcon,
  Clear as ClearIcon,
  Sync as SyncIcon
} from '@mui/icons-material';

const Pricing = () => {
  const [pricing, setPricing] = useState({ itens: {}, categorias: {} });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    nomeItem: '',
    preco_min: 0,
    preco_max: 0,
    categoria: 'OUTROS'
  });
  
  // Search and filter states  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortBy, setSortBy] = useState('nome'); // 'nome', 'preco_min', 'preco_max', 'categoria'
  

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/precos');
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setPricing(data.dados || { itens: {}, categorias: {} });
        }
      } else {
        setError('Erro ao carregar preços');
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
      setError('Erro ao carregar preços');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    setEditMode(!!item);
    setSelectedItem(item);
    if (item) {
      setFormData({
        nomeItem: item.nome || '',
        preco_min: item.preco_min || 0,
        preco_max: item.preco_max || 0,
        categoria: item.categoria || 'OUTROS'
      });
    } else {
      setFormData({
        nomeItem: '',
        preco_min: 0,
        preco_max: 0,
        categoria: 'OUTROS'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setEditMode(false);
  };

  const handleSavePrice = async () => {
    try {
      if (!formData.nomeItem) {
        setError('Nome do item é obrigatório');
        return;
      }

      if (formData.preco_min < 0 || formData.preco_max < 0) {
        setError('Preços não podem ser negativos');
        return;
      }

      if (formData.preco_min > formData.preco_max) {
        setError('Preço mínimo não pode ser maior que o preço máximo');
        return;
      }

      const response = await fetch('/api/precos/item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nomeItem: formData.nomeItem,
          preco_min: parseFloat(formData.preco_min),
          preco_max: parseFloat(formData.preco_max),
          categoria: formData.categoria
        })
      });

      if (response.ok) {
        handleCloseDialog();
        loadPricing();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao salvar preço');
      }
    } catch (error) {
      console.error('Error saving price:', error);
      setError('Erro ao salvar preço');
    }
  };

  const handleDeletePrice = async (itemName) => {
    if (!window.confirm('Tem certeza que deseja remover este preço?')) {
      return;
    }

    try {
      const response = await fetch('/api/precos/item', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nomeItem: itemName
        })
      });

      if (response.ok) {
        loadPricing();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao remover preço');
      }
    } catch (error) {
      console.error('Error deleting price:', error);
      setError('Erro ao remover preço');
    }
  };

  const getPricingArray = () => {
    if (!pricing.itens) return [];
    return Object.entries(pricing.itens).map(([id, itemData]) => ({
      id,
      ...itemData
    }));
  };
  
  // Filtered and sorted pricing data
  const filteredPricing = useMemo(() => {
    let items = getPricingArray();
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.nome.toLowerCase().includes(search) ||
        item.categoria.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'TODAS') {
      items = items.filter(item => item.categoria === selectedCategory);
    }
    
    // Apply price range filter
    if (priceRange.min !== '') {
      items = items.filter(item => 
        (item.preco_min || 0) >= parseFloat(priceRange.min)
      );
    }
    if (priceRange.max !== '') {
      items = items.filter(item => 
        (item.preco_max || 0) <= parseFloat(priceRange.max)
      );
    }
    
    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'preco_min':
          return (a.preco_min || 0) - (b.preco_min || 0);
        case 'preco_max':
          return (a.preco_max || 0) - (b.preco_max || 0);
        case 'categoria':
          return a.categoria.localeCompare(b.categoria);
        default:
          return a.nome.localeCompare(b.nome);
      }
    });
    
    return items;
  }, [pricing.itens, searchTerm, selectedCategory, priceRange, sortBy]);
  
  // Category statistics
  const categoryStats = useMemo(() => {
    const stats = {};
    getPricingArray().forEach(item => {
      const cat = item.categoria || 'OUTROS';
      if (!stats[cat]) {
        stats[cat] = { count: 0, avgPrice: 0, totalPrice: 0 };
      }
      stats[cat].count++;
      const avgItemPrice = ((item.preco_min || 0) + (item.preco_max || 0)) / 2;
      stats[cat].totalPrice += avgItemPrice;
      stats[cat].avgPrice = stats[cat].totalPrice / stats[cat].count;
    });
    return stats;
  }, [pricing.itens]);
  
  // Sync with Google Sheets
  const handleSyncWithSheets = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/precos/sync');
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setPricing(data.dados || { itens: {}, categorias: {} });
          setError(null);
        }
      } else {
        setError('Erro ao sincronizar com Google Sheets');
      }
    } catch (error) {
      console.error('Error syncing with sheets:', error);
      setError('Erro ao sincronizar com Google Sheets');
    } finally {
      setSyncing(false);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('TODAS');
    setPriceRange({ min: '', max: '' });
  };

  const getCategoryLabel = (categoria) => {
    return pricing.categorias[categoria] || categoria;
  };

  const getCategoryColor = (categoria) => {
    const colors = {
      'ANIMAIS': 'success',
      'SEMENTES': 'primary',
      'PLANTAS': 'info',
      'MINERIOS': 'warning',
      'ALIMENTACAO': 'secondary',
      'FERRAMENTAS': 'error',
      'MATERIAIS': 'default',
      'OUTROS': 'default'
    };
    return colors[categoria] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        💰 Gerenciamento de Preços
      </Typography>
      

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MoneyIcon fontSize="large" color="primary" />
              <Typography variant="h4" color="primary.main" sx={{ mt: 1 }}>
                {Object.keys(pricing.itens || {}).length}
              </Typography>
              <Typography color="textSecondary">
                Itens com Preço
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {Object.keys(pricing.categorias || {}).length}
              </Typography>
              <Typography color="textSecondary">
                Categorias
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Preço Médio
              </Typography>
              <Typography variant="h4" color="info.main">
                R$ 
                {getPricingArray().length > 0 ? (
                  getPricingArray().reduce((sum, item) => 
                    sum + ((item.preco_min + item.preco_max) / 2), 0
                  ) / getPricingArray().length
                ).toFixed(2).replace('.', ',') : '0,00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Controls */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon /> Filtros e Pesquisa
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          {/* Search Bar */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Pesquisar itens, categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <Button 
                      size="small" 
                      onClick={() => setSearchTerm('')}
                      sx={{ minWidth: 'auto', p: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          {/* Category Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Categoria"
              >
                <MenuItem value="TODAS">
                  <Badge badgeContent={getPricingArray().length} color="primary">
                    Todas as Categorias
                  </Badge>
                </MenuItem>
                <Divider />
                {Object.entries(pricing.categorias || {}).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    <Badge badgeContent={categoryStats[key]?.count || 0} color="secondary">
                      {label}
                    </Badge>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Price Range Filters */}
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Preço Mín."
              type="number"
              value={priceRange.min}
              onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
              inputProps={{ min: 0, step: 0.01 }}
              size="small"
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Preço Máx."
              type="number"
              value={priceRange.max}
              onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
              inputProps={{ min: 0, step: 0.01 }}
              size="small"
            />
          </Grid>
          
          {/* Clear Filters */}
          <Grid item xs={12} md={1}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              disabled={!searchTerm && selectedCategory === 'TODAS' && !priceRange.min && !priceRange.max}
              fullWidth
            >
              Limpar
            </Button>
          </Grid>
        </Grid>
        
        {/* Sort and View Controls */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Ordenar por</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Ordenar por"
              >
                <MenuItem value="nome">Nome</MenuItem>
                <MenuItem value="categoria">Categoria</MenuItem>
                <MenuItem value="preco_min">Preço Mínimo</MenuItem>
                <MenuItem value="preco_max">Preço Máximo</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="textSecondary">
              {filteredPricing.length} de {getPricingArray().length} itens
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="table" aria-label="visualização em tabela">
                <ListViewIcon />
              </ToggleButton>
              <ToggleButton value="cards" aria-label="visualização em cards">
                <GridViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Paper>
      
      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Adicionar Preço
        </Button>
        
        <Button
          variant="outlined"
          startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
          onClick={handleSyncWithSheets}
          disabled={syncing}
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar Google Sheets'}
        </Button>
      </Box>

      {/* Category Statistics */}
      {selectedCategory === 'TODAS' && Object.keys(categoryStats).length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon /> Estatísticas por Categoria
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(categoryStats).map(([categoria, stats]) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={categoria}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Chip
                      label={getCategoryLabel(categoria)}
                      color={getCategoryColor(categoria)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6" color="primary">{stats.count}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Preço médio: R$ {stats.avgPrice.toFixed(2).replace('.', ',')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* Pricing Display */}
      {viewMode === 'table' ? (
        /* Table View */
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Nome do Item</strong></TableCell>
                  <TableCell><strong>Categoria</strong></TableCell>
                  <TableCell align="center"><strong>Preço Mínimo</strong></TableCell>
                  <TableCell align="center"><strong>Preço Máximo</strong></TableCell>
                  <TableCell><strong>Atualizado em</strong></TableCell>
                  <TableCell align="center"><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPricing.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary" sx={{ py: 4 }}>
                        {getPricingArray().length === 0 
                          ? 'Nenhum preço cadastrado' 
                          : 'Nenhum item encontrado com os filtros aplicados'
                        }
                      </Typography>
                      {getPricingArray().length > 0 && (
                        <Button onClick={clearFilters} sx={{ mt: 1 }}>
                          Limpar Filtros
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPricing.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="bold">
                          {item.nome}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ID: {item.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getCategoryLabel(item.categoria)}
                          color={getCategoryColor(item.categoria)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" fontWeight="bold" color="success.main">
                          R$ {item.preco_min?.toFixed(2) || '0,00'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" fontWeight="bold" color="error.main">
                          R$ {item.preco_max?.toFixed(2) || '0,00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {item.atualizado_em ? new Date(item.atualizado_em).toLocaleString('pt-BR') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenDialog(item)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeletePrice(item.nome)}
                          >
                            Remover
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        /* Card View */
        <Box>
          {filteredPricing.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary" variant="h6">
                {getPricingArray().length === 0 
                  ? 'Nenhum preço cadastrado' 
                  : 'Nenhum item encontrado com os filtros aplicados'
                }
              </Typography>
              {getPricingArray().length > 0 && (
                <Button onClick={clearFilters} sx={{ mt: 2 }}>
                  Limpar Filtros
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredPricing.map((item) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                          {item.nome}
                        </Typography>
                        <Chip
                          label={getCategoryLabel(item.categoria)}
                          color={getCategoryColor(item.categoria)}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">Preço Mínimo:</Typography>
                          <Typography variant="body1" fontWeight="bold" color="success.main">
                            R$ {item.preco_min?.toFixed(2) || '0,00'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">Preço Máximo:</Typography>
                          <Typography variant="body1" fontWeight="bold" color="error.main">
                            R$ {item.preco_max?.toFixed(2) || '0,00'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
                        Atualizado: {item.atualizado_em ? new Date(item.atualizado_em).toLocaleDateString('pt-BR') : '-'}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenDialog(item)}
                          fullWidth
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeletePrice(item.nome)}
                          fullWidth
                        >
                          Remover
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Add/Edit Price Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Editar Preço' : 'Adicionar Preço'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome do Item"
              value={formData.nomeItem}
              onChange={(e) => setFormData({ ...formData, nomeItem: e.target.value })}
              disabled={editMode}
              sx={{ mb: 3 }}
              helperText={editMode ? "Nome não pode ser alterado" : "Nome do item"}
            />
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                label="Categoria"
              >
                {Object.entries(pricing.categorias || {}).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Preço Mínimo"
              type="number"
              value={formData.preco_min}
              onChange={(e) => setFormData({ ...formData, preco_min: e.target.value })}
              sx={{ mb: 3 }}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Preço mínimo do item"
            />
            
            <TextField
              fullWidth
              label="Preço Máximo"
              type="number"
              value={formData.preco_max}
              onChange={(e) => setFormData({ ...formData, preco_max: e.target.value })}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Preço máximo do item"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button onClick={handleSavePrice} variant="contained">
            {editMode ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Pricing;