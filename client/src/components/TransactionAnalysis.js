import React, { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Chip, IconButton, Collapse, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, LinearProgress, Tabs, Tab, Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

const TransactionAnalysis = ({ analysis }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter and sort transactions
  const getFilteredTransactions = (transactions) => {
    if (!transactions) return [];
    
    let filtered = [...transactions];
    
    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(t => 
        (t.displayName || t.item || '').toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.tipo === filters.type);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (filters.sortBy) {
        case 'date':
          compareValue = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'quantity':
          compareValue = (a.quantidade || 0) - (b.quantidade || 0);
          break;
        case 'name':
          compareValue = (a.displayName || a.item || '').localeCompare(b.displayName || b.item || '');
          break;
        default:
          compareValue = 0;
      }
      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return filtered;
  };

  if (!analysis) return null;

  return (
    <Box>
      {/* Main Tabs */}
      <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 2 }}>
        <Tab label={
          <Badge badgeContent={analysis.totalTransacoes} color="primary">
            Overview
          </Badge>
        } />
        <Tab label={
          <Badge badgeContent={analysis.analiseDetalhada?.summary?.totalSeedsTaken || 0} color="success">
            Seeds/Plants
          </Badge>
        } />
        <Tab label={
          <Badge badgeContent={analysis.analiseDetalhada?.animalsFeed?.totalAnimals || 0} color="warning">
            Animals/Feed
          </Badge>
        } />
        <Tab label={
          <Badge badgeContent={analysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0} color="error">
            Tools/Buckets
          </Badge>
        } />
        <Tab label="All Transactions" />
      </Tabs>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Box>
          {/* Honesty Score */}
          <Card sx={{ mb: 2, background: `linear-gradient(135deg, ${
            analysis.pontuacaoHonestidade >= 90 ? '#4caf50' : 
            analysis.pontuacaoHonestidade >= 70 ? '#ff9800' : 
            analysis.pontuacaoHonestidade >= 50 ? '#ff5722' : '#f44336'
          } 0%, ${
            analysis.pontuacaoHonestidade >= 90 ? '#66bb6a' : 
            analysis.pontuacaoHonestidade >= 70 ? '#ffa726' : 
            analysis.pontuacaoHonestidade >= 50 ? '#ff7043' : '#ef5350'
          } 100%)` }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography variant="h6">🏆 Honesty Score: {analysis.pontuacaoHonestidade}%</Typography>
              <Typography>Based on {analysis.totalTransacoes} transactions</Typography>
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4">{analysis.analiseDetalhada?.summary?.totalSeedsTaken || 0}</Typography>
                  <Typography variant="body2">Seeds Taken</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Expected: {analysis.analiseDetalhada?.summary?.totalPlantsExpected || 0} plants
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4">{analysis.analiseDetalhada?.summary?.totalPlantsReturned || 0}</Typography>
                  <Typography variant="body2">Plants Returned</Typography>
                  <Typography variant="caption" color={
                    (analysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0) >= 80 ? 'success.main' : 'error.main'
                  }>
                    {analysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0}% efficiency
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4">${analysis.analiseDetalhada?.summary?.bucketsOwed || 0}</Typography>
                  <Typography variant="body2">Buckets Owed</Typography>
                  <Typography variant="caption" color="error.main">
                    {analysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned || 0} not returned
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4">
                    {analysis.analiseDetalhada?.summary?.suspiciousActivity ? '⚠️' : '✅'}
                  </Typography>
                  <Typography variant="body2">Status</Typography>
                  <Typography variant="caption">
                    {analysis.analiseDetalhada?.summary?.suspiciousActivity ? 'Needs Review' : 'All Clear'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {selectedTab === 1 && (
        <Box>
          {/* Seeds/Plants Analysis */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>🌱 Seeds to Plants Conversion Analysis</Typography>
              
              {Object.entries(analysis.analiseDetalhada?.seedsPlants || {}).map(([seedType, data]) => (
                <Box key={seedType} sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {data.displayName || seedType}
                    </Typography>
                    <IconButton onClick={() => toggleSection(`seed-${seedType}`)}>
                      {expandedSections[`seed-${seedType}`] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={3}>
                      <Typography variant="body2">Seeds: {data.seedsTaken}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2">Expected: {data.plantsExpected}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2">Returned: {data.plantsReturned}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Chip 
                        label={`${data.efficiency}% efficiency`}
                        color={data.efficiency >= 80 ? 'success' : data.efficiency >= 50 ? 'warning' : 'error'}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                  
                  <Collapse in={expandedSections[`seed-${seedType}`]}>
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(100, data.efficiency)} 
                        sx={{ mb: 1, height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        Transactions: {data.transactions?.length || 0}
                      </Typography>
                      {data.originalIds && data.originalIds.length > 1 && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '10px' }}>
                          Item IDs: {data.originalIds.join(', ')}
                        </Typography>
                      )}
                      
                      {/* Individual Transaction Details */}
                      {data.transactions && data.transactions.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Individual Transactions:</Typography>
                          <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Date</TableCell>
                                  <TableCell>Type</TableCell>
                                  <TableCell>Item</TableCell>
                                  <TableCell align="right">Quantity</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {data.transactions.map((transaction, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      <Typography variant="caption">
                                        {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={transaction.tipo || 'unknown'} 
                                        size="small" 
                                        color={transaction.tipo === 'adicionar' ? 'success' : 'error'}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption">
                                        {transaction.displayName || transaction.item}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                        {transaction.quantidade}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              ))}
              
              {/* Total Summary */}
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="h6">
                  Total: {analysis.analiseDetalhada?.summary?.totalSeedsTaken || 0} seeds → 
                  {' '}{analysis.analiseDetalhada?.summary?.totalPlantsReturned || 0} plants 
                  ({analysis.analiseDetalhada?.summary?.overallPlantEfficiency || 0}% efficiency)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {selectedTab === 2 && (
        <Box>
          {/* Animals/Feed Analysis */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>🐄 Animals & Feed Analysis</Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, backgroundColor: '#fce4ec', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>🐄 Animals</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="error.main">Withdrawn: {analysis.analiseDetalhada?.animalsFeed?.totalAnimalsOut || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="success.main">Returned: {analysis.analiseDetalhada?.animalsFeed?.totalAnimalsIn || 0}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Net Used: {analysis.analiseDetalhada?.animalsFeed?.netAnimals || 0}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2">Expected Deliveries: {analysis.analiseDetalhada?.animalsFeed?.deliveriesExpected || 0}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>🥕 Feed (Ração)</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="error.main">Withdrawn: {analysis.analiseDetalhada?.animalsFeed?.totalFeedOut || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="success.main">Returned: {analysis.analiseDetalhada?.animalsFeed?.totalFeedIn || 0}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Net Used: {analysis.analiseDetalhada?.animalsFeed?.netFeed || 0}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color={
                          Math.abs((analysis.analiseDetalhada?.animalsFeed?.actualFeedRatio || 0) - 2) < 0.5 ? 'success.main' : 'error.main'
                        }>
                          Ratio: {analysis.analiseDetalhada?.animalsFeed?.actualFeedRatio?.toFixed(2) || 0} (Expected: 2.0)
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Animal Withdrawals */}
              {analysis.analiseDetalhada?.animalsFeed?.animalWithdrawals && analysis.analiseDetalhada.animalsFeed.animalWithdrawals.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>🐄 Animal Withdrawals ({analysis.analiseDetalhada.animalsFeed.animalWithdrawals.length})</Typography>
                    <IconButton onClick={() => toggleSection('animals')} size="small">
                      {expandedSections['animals'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections['animals']}>
                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analysis.analiseDetalhada.animalsFeed.animalWithdrawals.map((transaction, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={transaction.tipo || 'remover'} 
                                  size="small" 
                                  color="error"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {transaction.displayName || transaction.item}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {transaction.quantidade}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              )}
              
              {/* Animal Returns */}
              {analysis.analiseDetalhada?.animalsFeed?.animalReturns && analysis.analiseDetalhada.animalsFeed.animalReturns.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>🔄 Animal Returns ({analysis.analiseDetalhada.animalsFeed.animalReturns.length})</Typography>
                    <IconButton onClick={() => toggleSection('animal-returns')} size="small">
                      {expandedSections['animal-returns'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections['animal-returns']}>
                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analysis.analiseDetalhada.animalsFeed.animalReturns.map((transaction, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label="adicionar" 
                                  size="small" 
                                  color="success"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {transaction.displayName || transaction.item}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {transaction.quantidade}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              )}
              
              {/* Feed Withdrawals */}
              {analysis.analiseDetalhada?.animalsFeed?.feedWithdrawals && analysis.analiseDetalhada.animalsFeed.feedWithdrawals.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>🥕 Feed Withdrawals ({analysis.analiseDetalhada.animalsFeed.feedWithdrawals.length})</Typography>
                    <IconButton onClick={() => toggleSection('feed')} size="small">
                      {expandedSections['feed'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections['feed']}>
                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analysis.analiseDetalhada.animalsFeed.feedWithdrawals.map((transaction, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={transaction.tipo || 'remover'} 
                                  size="small" 
                                  color="warning"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {transaction.displayName || transaction.item}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {transaction.quantidade}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              )}
              
              {/* Feed Returns */}
              {analysis.analiseDetalhada?.animalsFeed?.feedReturns && analysis.analiseDetalhada.animalsFeed.feedReturns.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>🔄 Feed Returns ({analysis.analiseDetalhada.animalsFeed.feedReturns.length})</Typography>
                    <IconButton onClick={() => toggleSection('feed-returns')} size="small">
                      {expandedSections['feed-returns'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections['feed-returns']}>
                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analysis.analiseDetalhada.animalsFeed.feedReturns.map((transaction, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label="adicionar" 
                                  size="small" 
                                  color="success"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {transaction.displayName || transaction.item}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {transaction.quantidade}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              )}
              
              {/* Product Returns */}
              {analysis.analiseDetalhada?.animalsFeed?.productTransactions && analysis.analiseDetalhada.animalsFeed.productTransactions.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>📦 Product Returns ({analysis.analiseDetalhada.animalsFeed.productTransactions.length})</Typography>
                    <IconButton onClick={() => toggleSection('products')} size="small">
                      {expandedSections['products'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections['products']}>
                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analysis.analiseDetalhada.animalsFeed.productTransactions.map((transaction, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={transaction.tipo || 'adicionar'} 
                                  size="small" 
                                  color="success"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {transaction.displayName || transaction.item}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {transaction.quantidade}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {selectedTab === 3 && (
        <Box>
          {/* Tools/Buckets Analysis */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>🔧 Tools & Buckets Tracking</Typography>
              
              <Alert severity={analysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned > 0 ? 'error' : 'success'} sx={{ mb: 2 }}>
                {analysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned > 0 ? (
                  <>
                    <strong>{analysis.analiseDetalhada?.toolsBuckets?.bucketsNotReturned} buckets not returned!</strong>
                    <br />
                    Cost owed: ${analysis.analiseDetalhada?.toolsBuckets?.bucketCostOwed?.toFixed(2)}
                  </>
                ) : (
                  'All buckets returned properly!'
                )}
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography>Buckets Taken: {analysis.analiseDetalhada?.toolsBuckets?.bucketsTaken || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>Buckets Returned: {analysis.analiseDetalhada?.toolsBuckets?.bucketsReturned || 0}</Typography>
                </Grid>
              </Grid>
              
              {/* Other Tools */}
              {(analysis.analiseDetalhada?.toolsBuckets?.otherToolsTaken?.length > 0) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Other Tools Taken:</Typography>
                  {analysis.analiseDetalhada?.toolsBuckets?.otherToolsTaken.slice(0, 5).map((tool, idx) => (
                    <Chip key={idx} label={`${tool.displayName || tool.item} x${tool.quantidade}`} size="small" sx={{ m: 0.5 }} />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Food/Drink Consumption */}
          {analysis.analiseDetalhada?.foodDrink?.totalConsumed > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>🍽️ Food & Drink Consumption</Typography>
                
                <Alert severity={
                  analysis.analiseDetalhada?.foodDrink?.suspiciousConsumption?.length > 0 ? 'warning' : 'info'
                } sx={{ mb: 2 }}>
                  Total consumed: {analysis.analiseDetalhada?.foodDrink?.totalConsumed} items
                  {analysis.analiseDetalhada?.foodDrink?.suspiciousConsumption?.length > 0 && (
                    <><br />⚠️ Suspicious consumption detected!</>
                  )}
                </Alert>
                
                {analysis.analiseDetalhada?.foodDrink?.transactions?.slice(0, 10).map((item, idx) => (
                  <Chip 
                    key={idx} 
                    label={`${item.displayName || item.item} x${item.quantidade}`} 
                    color={(item.quantidade || 0) > 10 ? 'error' : 'default'}
                    size="small" 
                    sx={{ m: 0.5 }} 
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {selectedTab === 4 && (
        <Box>
          {/* All Transactions with Filters */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search transactions..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      label="Type"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="adicionar">Added</MenuItem>
                      <MenuItem value="remover">Removed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      label="Sort By"
                    >
                      <MenuItem value="date">Date</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                      <MenuItem value="quantity">Quantity</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Order</InputLabel>
                    <Select
                      value={filters.sortOrder}
                      onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
                      label="Order"
                    >
                      <MenuItem value="desc">Newest First</MenuItem>
                      <MenuItem value="asc">Oldest First</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" color="textSecondary">
                    Showing {getFilteredTransactions(analysis.todasTransacoes).length} of {analysis.totalTransacoes}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          {/* Transactions Table */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredTransactions(analysis.todasTransacoes).map((transaction, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(transaction.timestamp).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.tipo} 
                        size="small" 
                        color={transaction.tipo === 'adicionar' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{transaction.displayName || transaction.item}</TableCell>
                    <TableCell align="right">{transaction.quantidade}</TableCell>
                    <TableCell>{transaction.categoria || 'unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default TransactionAnalysis;