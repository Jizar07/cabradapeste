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
  Collapse,
  IconButton,
  InputAdornment,
  TableSortLabel,
  Switch,
  FormControlLabel,
  Pagination,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';
import PlantDemandBox from './PlantDemandBox';

const Inventory = () => {
  const socket = useSocket();
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [actionType, setActionType] = useState('add'); // 'add' or 'remove'
  const [formData, setFormData] = useState({
    nomeItem: '',
    quantidade: 1,
    autor: 'Sistema'
  });
  
  // New state for categories, sorting, and filtering
  const [categories, setCategories] = useState({
    'plantas': 'Plantas',
    'sementes': 'Sementes', 
    'racoes': 'Rações',
    'comidas': 'Comidas',
    'bebidas': 'Bebidas',
    'animais': 'Animais',
    'materiais': 'Materiais',
    'ferramentas': 'Ferramentas',
    'produtos': 'Produtos',
    'consumeveis': 'Consumíveis',
    'outros': 'Outros'
  });
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [sortBy, setSortBy] = useState('nome');
  const [sortOrder, setSortOrder] = useState('asc');
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryData, setNewCategoryData] = useState({ id: '', nome: '' });
  
  // Editing state for item names - THIS IS THE GLOBAL NAME SOURCE
  const [editingItem, setEditingItem] = useState(null);
  const [editedName, setEditedName] = useState('');
  
  // Editing state for item categories
  const [editingItemCategory, setEditingItemCategory] = useState(null);
  const [editedCategoryValue, setEditedCategoryValue] = useState('');

  // Editing state for item quantities
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [tempQuantity, setTempQuantity] = useState('');

  // Enhanced UI state
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroQuantity, setShowZeroQuantity] = useState(true);
  const [quantityFilter, setQuantityFilter] = useState('all'); // all, low, medium, high, zero
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortColumn, setSortColumn] = useState('nome');


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

  // Function to categorize items automatically
  const getCategoryForItem = (itemName) => {
    const name = itemName.toLowerCase();
    
    if (name.includes('seed') || name.includes('semente') || name.includes('milho') || name.includes('trigo') || name.includes('junco')) {
      return 'sementes';
    }
    if (name.includes('racao') || name.includes('feed')) {
      return 'racoes';
    }
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep') || name.includes('donkey') || name.includes('goat') || name.includes('vaca') || name.includes('porco') || name.includes('galinha') || name.includes('ovelha') || name.includes('cabra') || name.includes('burro')) {
      return 'animais';
    }
    if (name.includes('milk') || name.includes('leite') || name.includes('water') || name.includes('agua') || name.includes('juice') || name.includes('suco')) {
      return 'bebidas';
    }
    if (name.includes('bread') || name.includes('pao') || name.includes('food') || name.includes('comida') || name.includes('meal') || name.includes('refeicao')) {
      return 'comidas';
    }
    // Tools/Ferramentas
    if (name.includes('hoe') || name.includes('enxada') || name.includes('rastelo') || name.includes('tool') || name.includes('ferramenta') || name.includes('wateringcan') || name.includes('regador') || name.includes('planttrimmer') || name.includes('podador')) {
      return 'ferramentas';
    }
    // Products/Produtos
    if (name.includes('polvora') || name.includes('gunpowder') || name.includes('produto') || name.includes('product') || name.includes('embalagem') || name.includes('package')) {
      return 'produtos';
    }
    // Consumables/Consumíveis
    if (name.includes('cigarro') || name.includes('cigarett') || name.includes('tabaco') || name.includes('tobacco') || name.includes('bala') || name.includes('consumivel') || name.includes('consumable')) {
      return 'consumeveis';
    }
    if (name.includes('leather') || name.includes('couro') || name.includes('wood') || name.includes('madeira') || name.includes('metal') || name.includes('ferro')) {
      return 'materiais';
    }
    if (name.includes('plant') || name.includes('planta') || name.includes('flower') || name.includes('flor')) {
      return 'plantas';
    }
    
    return 'outros';
  };

  // Get filtered and sorted inventory items
  const getFilteredAndSortedItems = () => {
    if (!inventory.itens) return [];

    let items = Object.entries(inventory.itens).map(([id, item]) => ({
      id,
      ...item,
      displayName: item.nome || normalizeText(id),
      categoria: item.categoria || getCategoryForItem(item.nome || id)
    }));

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.displayName.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        (categories[item.categoria] || '').toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory !== 'todos') {
      items = items.filter(item => item.categoria === selectedCategory);
    }

    // Quantity filter
    if (!showZeroQuantity) {
      items = items.filter(item => (item.quantidade || 0) > 0);
    }

    switch (quantityFilter) {
      case 'zero':
        items = items.filter(item => (item.quantidade || 0) === 0);
        break;
      case 'low':
        items = items.filter(item => (item.quantidade || 0) > 0 && (item.quantidade || 0) <= 10);
        break;
      case 'medium':
        items = items.filter(item => (item.quantidade || 0) > 10 && (item.quantidade || 0) <= 100);
        break;
      case 'high':
        items = items.filter(item => (item.quantidade || 0) > 100);
        break;
    }

    // Sort items
    items.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'quantidade':
          aValue = a.quantidade || 0;
          bValue = b.quantidade || 0;
          break;
        case 'categoria':
          aValue = categories[a.categoria] || 'Outros';
          bValue = categories[b.categoria] || 'Outros';
          break;
        case 'criado_em':
          aValue = new Date(a.criado_em || 0);
          bValue = new Date(b.criado_em || 0);
          break;
        case 'atualizado_em':
          aValue = new Date(a.atualizado_em || a.ultima_atualizacao || 0);
          bValue = new Date(b.atualizado_em || b.ultima_atualizacao || 0);
          break;
        case 'nome':
        default:
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
      }

      if (sortDirection === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return items;
  };

  // Get paginated items
  const getPaginatedItems = () => {
    const filteredItems = getFilteredAndSortedItems();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      items: filteredItems.slice(startIndex, endIndex),
      totalItems: filteredItems.length,
      totalPages: Math.ceil(filteredItems.length / itemsPerPage)
    };
  };

  // Handle sort column change
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('todos');
    setQuantityFilter('all');
    setShowZeroQuantity(true);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadInventory();
    
    if (socket) {
      socket.on('inventario:atualizado', (inventoryData) => {
        setInventory(inventoryData);
        setLoading(false);
      });

      return () => {
        socket.off('inventario:atualizado');
      };
    }
  }, [socket]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventario');
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setInventory(data.dados || {});
        }
      } else {
        setError('Erro ao carregar inventário');
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      setError('Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  };


  const handleOpenDialog = (action) => {
    setActionType(action);
    setFormData({
      nomeItem: '',
      quantidade: 1,
      autor: 'Sistema'
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // GLOBAL NAME EDITING FUNCTIONS - THIS IS THE MASTER SOURCE
  const handleStartEdit = (itemId, currentName) => {
    setEditingItem(itemId);
    setEditedName(currentName);
  };

  const handleSaveEdit = async (itemId) => {
    try {
      if (!editedName.trim()) {
        setError('Nome não pode estar vazio');
        return;
      }

      // GLOBAL UPDATE - This changes the name EVERYWHERE in the system
      const response = await fetch('/api/usuarios/global-item-update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldId: itemId,
          newId: itemId, // Keep same ID
          newDisplayName: editedName.trim() // Update display name globally
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🌍 Global name update successful:', result);
        setEditingItem(null);
        setEditedName('');
        setError(null);
        // Reload inventory to show updated name
        loadInventory();
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao atualizar nome globalmente');
      }
    } catch (error) {
      console.error('Error updating item name globally:', error);
      setError('Erro ao atualizar nome do item');
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditedName('');
  };

  // CATEGORY EDITING FUNCTIONS
  const handleStartCategoryEdit = (itemId, currentCategory) => {
    setEditingItemCategory(itemId);
    setEditedCategoryValue(currentCategory);
  };

  const handleSaveCategoryEdit = async (itemId) => {
    try {
      if (!editedCategoryValue) {
        setError('Categoria não pode estar vazia');
        return;
      }

      // Update item category in inventory
      const response = await fetch('/api/inventario/categoria', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: itemId,
          categoria: editedCategoryValue
        })
      });

      if (response.ok) {
        console.log('📁 Category updated successfully');
        setEditingItemCategory(null);
        setEditedCategoryValue('');
        setError(null);
        // Reload inventory to show updated category
        loadInventory();
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao atualizar categoria');
      }
    } catch (error) {
      console.error('Error updating item category:', error);
      setError('Erro ao atualizar categoria do item');
    }
  };

  const handleCancelCategoryEdit = () => {
    setEditingItemCategory(null);
    setEditedCategoryValue('');
  };

  // Quantity editing handlers
  const handleStartQuantityEdit = (itemId, currentQuantity) => {
    setEditingQuantity(itemId);
    setTempQuantity(currentQuantity.toString());
  };

  const handleSaveQuantity = async () => {
    try {
      if (!tempQuantity || parseInt(tempQuantity) < 0) {
        setError('Quantidade deve ser um número válido maior ou igual a 0');
        return;
      }

      const response = await fetch(`/api/inventario/${editingQuantity}/quantidade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantidade: parseInt(tempQuantity)
        })
      });

      const result = await response.json();

      if (result.sucesso) {
        setError(null);
        console.log('✅', result.mensagem);
        loadInventory(); // Reload data
      } else {
        setError(result.erro || 'Erro ao atualizar quantidade');
      }
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      setError('Erro ao atualizar quantidade');
    } finally {
      handleCancelQuantityEdit();
    }
  };

  const handleCancelQuantityEdit = () => {
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const handleSubmitItem = async () => {
    try {
      if (!formData.nomeItem || formData.quantidade <= 0) {
        setError('Nome do item e quantidade são obrigatórios');
        return;
      }

      const endpoint = actionType === 'add' ? '/api/inventario/adicionar' : '/api/inventario/remover';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nomeItem: formData.nomeItem,
          quantidade: parseInt(formData.quantidade),
          autor: formData.autor || 'Sistema'
        })
      });

      if (response.ok) {
        handleCloseDialog();
        loadInventory();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.erro || `Erro ao ${actionType === 'add' ? 'adicionar' : 'remover'} item`);
      }
    } catch (error) {
      console.error('Error submitting item:', error);
      setError(`Erro ao ${actionType === 'add' ? 'adicionar' : 'remover'} item`);
    }
  };


  if (loading && !inventory.itens) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        📦 Gerenciamento de Inventário
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Plant Demand Box - Priority Alert System */}
      <PlantDemandBox socket={socket} />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <InventoryIcon fontSize="large" color="primary" />
              <Typography variant="h4" color="primary.main" sx={{ mt: 1 }}>
                {inventory.total_itens || 0}
              </Typography>
              <Typography color="textSecondary">
                Tipos de Itens
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {inventory.total_quantidade || 0}
              </Typography>
              <Typography color="textSecondary">
                Quantidade Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {Object.keys(categories).length}
              </Typography>
              <Typography color="textSecondary">
                Categorias
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category and Sort Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Typography variant="h6">🗂️ Controles:</Typography>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Categoria"
            >
              <MenuItem value="todos">Todos</MenuItem>
              {Object.entries(categories).map(([id, nome]) => (
                <MenuItem key={id} value={id}>{nome}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Ordenar por"
            >
              <MenuItem value="nome">Nome</MenuItem>
              <MenuItem value="quantidade">Quantidade</MenuItem>
              <MenuItem value="categoria">Categoria</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Ordem</InputLabel>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              label="Ordem"
            >
              <MenuItem value="asc">A-Z</MenuItem>
              <MenuItem value="desc">Z-A</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={() => setCategoryDialog(true)}
            size="small"
          >
            Gerenciar Categorias
          </Button>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
          sx={{ mr: 2 }}
        >
          Adicionar Item
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<RemoveIcon />}
          onClick={() => handleOpenDialog('remove')}
        >
          Remover Item
        </Button>
      </Box>

      {/* Enhanced Filtering and Search */}
      <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Pesquisar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Categoria"
            >
              <MenuItem value="todos">Todas</MenuItem>
              {Object.entries(categories).map(([key, name]) => (
                <MenuItem key={key} value={key}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Quantidade</InputLabel>
            <Select
              value={quantityFilter}
              onChange={(e) => setQuantityFilter(e.target.value)}
              label="Quantidade"
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="zero">Zero (0)</MenuItem>
              <MenuItem value="low">Baixo (1-10)</MenuItem>
              <MenuItem value="medium">Médio (11-100)</MenuItem>
              <MenuItem value="high">Alto (100+)</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showZeroQuantity}
                onChange={(e) => setShowZeroQuantity(e.target.checked)}
                size="small"
              />
            }
            label="Mostrar Zero"
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearFilters}
          >
            Limpar Filtros
          </Button>
        </Box>
      </Paper>

      {/* Collapsible Inventory Table */}
      <Paper elevation={2}>
        {/* Table Header with Collapse Button */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              📦 Lista de Inventário
            </Typography>
            <Chip 
              label={`${getPaginatedItems().totalItems} itens`} 
              color="primary" 
              size="small" 
            />
          </Box>
          <IconButton
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
            sx={{ 
              transform: inventoryExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={inventoryExpanded}>
          <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortColumn === 'nome'}
                    direction={sortColumn === 'nome' ? sortDirection : 'asc'}
                    onClick={() => handleSort('nome')}
                  >
                    <strong>Nome do Item</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortColumn === 'categoria'}
                    direction={sortColumn === 'categoria' ? sortDirection : 'asc'}
                    onClick={() => handleSort('categoria')}
                  >
                    <strong>Categoria</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortColumn === 'quantidade'}
                    direction={sortColumn === 'quantidade' ? sortDirection : 'asc'}
                    onClick={() => handleSort('quantidade')}
                  >
                    <strong>Quantidade</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortColumn === 'criado_em'}
                    direction={sortColumn === 'criado_em' ? sortDirection : 'asc'}
                    onClick={() => handleSort('criado_em')}
                  >
                    <strong>Criado em</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortColumn === 'atualizado_em'}
                    direction={sortColumn === 'atualizado_em' ? sortDirection : 'asc'}
                    onClick={() => handleSort('atualizado_em')}
                  >
                    <strong>Atualizado em</strong>
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getPaginatedItems().totalItems === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary" sx={{ py: 4 }}>
                      {searchTerm ? 'Nenhum item encontrado para a pesquisa' :
                       selectedCategory !== 'todos' ? `Nenhum item na categoria "${categories[selectedCategory]}"` :
                       'Nenhum item no inventário'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getPaginatedItems().items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {editingItem === item.id ? (
                        // EDITING MODE - GLOBAL NAME SOURCE
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            size="small"
                            fullWidth
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(item.id);
                              }
                              if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleSaveEdit(item.id)}
                            sx={{ minWidth: '70px' }}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleCancelEdit}
                            sx={{ minWidth: '70px' }}
                          >
                            Cancelar
                          </Button>
                        </Box>
                      ) : (
                        // VIEW MODE WITH EDIT BUTTON
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {item.displayName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {item.id}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleStartEdit(item.id, item.displayName)}
                            sx={{ ml: 1, minWidth: 'auto', fontSize: '0.8rem' }}
                          >
                            ✏️ Editar Nome
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItemCategory === item.id ? (
                        // CATEGORY EDITING MODE
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Select
                            value={editedCategoryValue}
                            onChange={(e) => setEditedCategoryValue(e.target.value)}
                            size="small"
                            autoFocus
                            sx={{ minWidth: 120 }}
                          >
                            {Object.entries(categories).map(([id, nome]) => (
                              <MenuItem key={id} value={id}>{nome}</MenuItem>
                            ))}
                          </Select>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleSaveCategoryEdit(item.id)}
                            sx={{ minWidth: '60px' }}
                          >
                            ✓
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleCancelCategoryEdit}
                            sx={{ minWidth: '60px' }}
                          >
                            ✕
                          </Button>
                        </Box>
                      ) : (
                        // CATEGORY VIEW MODE WITH EDIT BUTTON
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={categories[item.categoria] || 'Outros'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleStartCategoryEdit(item.id, item.categoria)}
                            sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                          >
                            ✏️
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {editingQuantity === item.id ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={tempQuantity}
                            onChange={(e) => setTempQuantity(e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ width: 80 }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={handleSaveQuantity}
                            sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                          >
                            ✓
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={handleCancelQuantityEdit}
                            sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                          >
                            ✗
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Chip
                            label={item.quantidade}
                            color={item.quantidade > 100 ? 'success' : item.quantidade > 10 ? 'warning' : 'error'}
                            size="medium"
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleStartQuantityEdit(item.id, item.quantidade)}
                            sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                          >
                            ✏️
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {item.atualizado_em ? new Date(item.atualizado_em).toLocaleString('pt-BR') : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {getPaginatedItems().totalPages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="textSecondary">
              Página {currentPage} de {getPaginatedItems().totalPages} ({getPaginatedItems().totalItems} itens)
            </Typography>
            <Pagination
              count={getPaginatedItems().totalPages}
              page={currentPage}
              onChange={(event, value) => setCurrentPage(value)}
              color="primary"
              size="small"
            />
          </Box>
        )}
        </Collapse>
      </Paper>

      {/* Add/Remove Item Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'add' ? 'Adicionar Item ao Inventário' : 'Remover Item do Inventário'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome do Item"
              value={formData.nomeItem}
              onChange={(e) => setFormData({ ...formData, nomeItem: e.target.value })}
              sx={{ mb: 3 }}
              helperText="Nome do item a ser adicionado/removido"
            />
            <TextField
              fullWidth
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              sx={{ mb: 3 }}
              inputProps={{ min: 1 }}
              helperText={`Quantidade a ser ${actionType === 'add' ? 'adicionada' : 'removida'}`}
            />
            <TextField
              fullWidth
              label="Autor"
              value={formData.autor}
              onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
              helperText="Nome do usuário responsável pela transação"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitItem} 
            variant="contained"
            color={actionType === 'add' ? 'primary' : 'error'}
          >
            {actionType === 'add' ? 'Adicionar' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Category Management Dialog */}
      <Dialog open={categoryDialog} onClose={() => setCategoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Gerenciar Categorias
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Add New Category */}
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Adicionar Nova Categoria</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="ID da Categoria"
                  value={newCategoryData.id}
                  onChange={(e) => setNewCategoryData({...newCategoryData, id: e.target.value.toLowerCase()})}
                  helperText="Ex: ferramentas, medicamentos"
                />
                <TextField
                  size="small"
                  label="Nome da Categoria"
                  value={newCategoryData.nome}
                  onChange={(e) => setNewCategoryData({...newCategoryData, nome: e.target.value})}
                  helperText="Ex: Ferramentas, Medicamentos"
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (newCategoryData.id && newCategoryData.nome) {
                      setCategories({...categories, [newCategoryData.id]: newCategoryData.nome});
                      setNewCategoryData({id: '', nome: ''});
                    }
                  }}
                  disabled={!newCategoryData.id || !newCategoryData.nome}
                >
                  Adicionar
                </Button>
              </Box>
            </Paper>

            {/* Existing Categories */}
            <Typography variant="h6" gutterBottom>Categorias Existentes</Typography>
            <Grid container spacing={2}>
              {Object.entries(categories).map(([id, nome]) => (
                <Grid item xs={12} sm={6} md={4} key={id}>
                  <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {editingCategory === id ? (
                      <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                        <TextField
                          size="small"
                          value={nome}
                          onChange={(e) => setCategories({...categories, [id]: e.target.value})}
                          onKeyPress={(e) => e.key === 'Enter' && setEditingCategory(null)}
                          autoFocus
                        />
                        <Button size="small" onClick={() => setEditingCategory(null)}>
                          ✓
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">{nome}</Typography>
                          <Typography variant="caption" color="textSecondary">{id}</Typography>
                        </Box>
                        <Box>
                          <Button size="small" onClick={() => setEditingCategory(id)}>
                            ✏️
                          </Button>
                          <Button 
                            size="small" 
                            color="error"
                            onClick={() => {
                              const newCategories = {...categories};
                              delete newCategories[id];
                              setCategories(newCategories);
                            }}
                          >
                            🗑️
                          </Button>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;