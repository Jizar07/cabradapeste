import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Nature as NatureIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const PlantTracker = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plantData, setPlantData] = useState(null);
  const [dateRange, setDateRange] = useState({
    inicio: new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, -1),
    fim: new Date(new Date().setHours(23, 59, 59, 999)).toISOString().slice(0, -1)
  });

  useEffect(() => {
    // Set default date range to Aug 1 - Aug 3 as requested
    const aug1 = new Date('2025-08-01T00:00:00');
    const aug3 = new Date('2025-08-03T23:59:59');
    
    setDateRange({
      inicio: aug1.toISOString().slice(0, -1),
      fim: aug3.toISOString().slice(0, -1)
    });
  }, []);

  const fetchPlantData = async () => {
    if (!dateRange.inicio || !dateRange.fim) {
      setError('Por favor, selecione as datas de início e fim');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const inicioISO = new Date(dateRange.inicio).toISOString();
      const fimISO = new Date(dateRange.fim).toISOString();
      
      const response = await fetch(
        `/api/usuarios/plantas?dataInicio=${encodeURIComponent(inicioISO)}&dataFim=${encodeURIComponent(fimISO)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setPlantData(data.dados);
        } else {
          setError(data.erro || 'Erro ao carregar dados de plantas');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.erro || 'Erro ao carregar dados de plantas');
      }
    } catch (error) {
      console.error('Error fetching plant data:', error);
      setError('Erro de conexão ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = () => {
    if (!plantData) return '';
    
    const inicio = new Date(plantData.periodo.inicio);
    const fim = new Date(plantData.periodo.fim);
    
    return `${inicio.toLocaleDateString('pt-BR')} - ${fim.toLocaleDateString('pt-BR')}`;
  };

  const getRoleColor = (funcao) => {
    switch (funcao) {
      case 'gerente': return 'primary';
      case 'trabalhador': return 'info';
      default: return 'default';
    }
  };

  const getValueColor = (valor) => {
    if (valor >= 100) return 'success';
    if (valor >= 50) return 'warning';
    return 'default';
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NatureIcon color="success" />
          🌱 Rastreamento de Plantas por Usuário
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Visualize quantas plantas cada usuário entregou em um período específico
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Date Range Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon fontSize="small" />
          Período de Análise
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Data/Hora Início"
              type="datetime-local"
              value={dateRange.inicio}
              onChange={(e) => setDateRange({ ...dateRange, inicio: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Data/Hora Fim"
              type="datetime-local"
              value={dateRange.fim}
              onChange={(e) => setDateRange({ ...dateRange, fim: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={fetchPlantData}
              disabled={loading}
              fullWidth
              startIcon={loading ? <CircularProgress size={20} /> : <TrendingUpIcon />}
            >
              {loading ? 'Carregando...' : 'Analisar Período'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Results */}
      {plantData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {plantData.resumo.totalUsuarios}
                  </Typography>
                  <Typography color="textSecondary">
                    Usuários Ativos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {plantData.resumo.totalPlantas.toLocaleString()}
                  </Typography>
                  <Typography color="textSecondary">
                    Total de Plantas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    ${plantData.resumo.valorTotal.toFixed(2)}
                  </Typography>
                  <Typography color="textSecondary">
                    Valor Estimado
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={1}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="info.main">
                    {formatDateRange()}
                  </Typography>
                  <Typography color="textSecondary">
                    Período Analisado
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Users Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Usuário</strong></TableCell>
                  <TableCell><strong>Função</strong></TableCell>
                  <TableCell align="center"><strong>Total de Plantas</strong></TableCell>
                  <TableCell align="center"><strong>Valor Estimado</strong></TableCell>
                  <TableCell align="center"><strong>Detalhes</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plantData.usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary">
                        Nenhuma planta encontrada no período selecionado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  plantData.usuarios.map((usuario, index) => (
                    <TableRow key={usuario.usuario_id}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="bold">
                          {usuario.nome}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {usuario.usuario_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={usuario.funcao === 'gerente' ? 'Gerente' : 'Trabalhador'}
                          color={getRoleColor(usuario.funcao)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="success.main">
                          {usuario.totalPlantas.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`$${usuario.valorEstimado.toFixed(2)}`}
                          color={getValueColor(usuario.valorEstimado)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Accordion elevation={0}>
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ minHeight: 'auto', '& .MuiAccordionSummary-content': { margin: '8px 0' } }}
                          >
                            <Typography variant="body2" color="primary">
                              Ver Plantas ({usuario.plantas.length} tipos)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0 }}>
                            <List dense>
                              {usuario.plantas.map((planta, plantaIndex) => (
                                <div key={plantaIndex}>
                                  <ListItem sx={{ px: 0 }}>
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Typography variant="body2" fontWeight="bold">
                                            {planta.nome}
                                          </Typography>
                                          <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Chip 
                                              label={`${planta.quantidade}x`} 
                                              size="small" 
                                              color="success" 
                                              variant="outlined"
                                            />
                                            <Chip 
                                              label={`$${planta.valor.toFixed(2)}`} 
                                              size="small" 
                                              color="warning" 
                                              variant="outlined"
                                            />
                                          </Box>
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                  {plantaIndex < usuario.plantas.length - 1 && <Divider />}
                                </div>
                              ))}
                            </List>
                          </AccordionDetails>
                        </Accordion>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
};

export default PlantTracker;