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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  FormGroup,
  LinearProgress
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Folder as FolderIcon
} from '@mui/icons-material';

const BackupRestore = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createBackupDialog, setCreateBackupDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [selectedData, setSelectedData] = useState({
    inventory: true,
    users: true,
    pricing: true,
    recipes: true,
    balance: true,
    config: true
  });
  const [alert, setAlert] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('http://localhost:8084/api/backup/list');
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Error loading backups:', error);
      setAlert({ type: 'error', message: 'Erro ao carregar lista de backups.' });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleCreateBackup = () => {
    const defaultName = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    setBackupName(defaultName);
    setBackupDescription('');
    setCreateBackupDialog(true);
  };

  const handleRestoreBackup = (backup) => {
    setSelectedBackup(backup);
    setRestoreDialog(true);
  };

  const handleDeleteBackup = async (backupId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8084/api/backup/${backupId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Backup excluído com sucesso!' });
        loadBackups();
      } else {
        setAlert({ type: 'error', message: result.error || 'Erro ao excluir backup.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Erro de conexão com o servidor.' });
    }
  };

  const handleDownloadBackup = async (backupId, filename) => {
    try {
      const response = await fetch(`http://localhost:8084/api/backup/download/${backupId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        
        setAlert({ type: 'success', message: 'Backup baixado com sucesso!' });
      } else {
        setAlert({ type: 'error', message: 'Erro ao baixar backup.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Erro de conexão com o servidor.' });
    }
  };

  const executeCreateBackup = async () => {
    if (!backupName.trim()) {
      setAlert({ type: 'error', message: 'Por favor, insira um nome para o backup.' });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const response = await fetch('http://localhost:8084/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: backupName,
          description: backupDescription,
          selectedData: selectedData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Backup criado com sucesso!' });
        setCreateBackupDialog(false);
        loadBackups();
      } else {
        setAlert({ type: 'error', message: result.error || 'Erro ao criar backup.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Erro de conexão com o servidor.' });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const executeRestore = async () => {
    if (!selectedBackup) return;

    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Tem certeza que deseja restaurar o backup "${selectedBackup.name}"? Todos os dados atuais serão substituídos.`)) {
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const response = await fetch(`http://localhost:8084/api/backup/restore/${selectedBackup.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setAlert({ 
          type: 'success', 
          message: 'Backup restaurado com sucesso! A aplicação será reiniciada em 3 segundos...' 
        });
        setRestoreDialog(false);
        
        // Restart application after restore
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setAlert({ type: 'error', message: result.error || 'Erro ao restaurar backup.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Erro de conexão com o servidor.' });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setAlert({ type: 'error', message: 'Por favor, selecione um arquivo .zip de backup válido.' });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('backup', file);

    try {
      const response = await fetch('http://localhost:8084/api/backup/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Backup importado com sucesso!' });
        loadBackups();
      } else {
        setAlert({ type: 'error', message: result.error || 'Erro ao importar backup.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Erro de conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
    
    event.target.value = '';
  };

  const calculateTotalSize = () => {
    return backups.reduce((total, backup) => total + (backup.size || 0), 0);
  };

  const dataTypes = [
    { key: 'inventory', label: 'Inventário e Transações', icon: <StorageIcon /> },
    { key: 'users', label: 'Usuários e Funções', icon: <StorageIcon /> },
    { key: 'pricing', label: 'Preços e Categorias', icon: <StorageIcon /> },
    { key: 'recipes', label: 'Receitas', icon: <StorageIcon /> },
    { key: 'balance', label: 'Saldo e Pagamentos', icon: <StorageIcon /> },
    { key: 'config', label: 'Configurações', icon: <StorageIcon /> }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          💾 Backup e Restauração
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => document.getElementById('import-backup-file').click()}
            sx={{ mr: 1 }}
          >
            Importar Backup
          </Button>
          <IconButton onClick={loadBackups} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button 
            variant="contained" 
            startIcon={<BackupIcon />}
            onClick={handleCreateBackup}
          >
            Criar Backup
          </Button>
          <input
            id="import-backup-file"
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleImportBackup}
          />
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

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="indeterminate" />
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
            Processando...
          </Typography>
        </Box>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Backups
              </Typography>
              <Typography variant="h4" color="primary">
                {backups.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Espaço Total
              </Typography>
              <Typography variant="h4" color="secondary">
                {formatFileSize(calculateTotalSize())}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Último Backup
              </Typography>
              <Typography variant="h6" color="success.main">
                {backups.length > 0 ? 
                  formatDate(Math.max(...backups.map(b => new Date(b.created_at)))) : 
                  'Nenhum'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Status do Sistema
              </Typography>
              <Chip 
                icon={<CheckIcon />}
                label="Funcionando"
                color="success"
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backups Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nome</strong></TableCell>
              <TableCell><strong>Descrição</strong></TableCell>
              <TableCell align="right"><strong>Tamanho</strong></TableCell>
              <TableCell align="right"><strong>Data de Criação</strong></TableCell>
              <TableCell><strong>Conteúdo</strong></TableCell>
              <TableCell align="center"><strong>Ações</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhum backup encontrado
                </TableCell>
              </TableRow>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {backup.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {backup.description || 'Sem descrição'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatFileSize(backup.size || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatDate(backup.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {backup.includes?.map((item, index) => (
                        <Chip 
                          key={index}
                          label={item}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
                      size="small"
                      onClick={() => handleDownloadBackup(backup.id, backup.filename)}
                      title="Baixar"
                      sx={{ mr: 0.5 }}
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton 
                      color="success" 
                      size="small"
                      onClick={() => handleRestoreBackup(backup)}
                      title="Restaurar"
                      sx={{ mr: 0.5 }}
                    >
                      <RestoreIcon />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small"
                      onClick={() => handleDeleteBackup(backup.id)}
                      title="Excluir"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Backup Dialog */}
      <Dialog open={createBackupDialog} onClose={() => setCreateBackupDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          💾 Criar Novo Backup
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nome do Backup"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Nome único para identificar este backup"
            />
            
            <TextField
              fullWidth
              label="Descrição (opcional)"
              value={backupDescription}
              onChange={(e) => setBackupDescription(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 3 }}
              placeholder="Descreva o que este backup contém..."
            />

            <Typography variant="h6" gutterBottom>
              Selecionar Dados para Backup:
            </Typography>
            
            <FormGroup>
              {dataTypes.map((dataType) => (
                <FormControlLabel
                  key={dataType.key}
                  control={
                    <Checkbox
                      checked={selectedData[dataType.key]}
                      onChange={(e) => setSelectedData(prev => ({
                        ...prev,
                        [dataType.key]: e.target.checked
                      }))}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {dataType.icon}
                      <Typography sx={{ ml: 1 }}>
                        {dataType.label}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>

            {Object.values(selectedData).every(v => !v) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Selecione pelo menos um tipo de dados para fazer backup.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateBackupDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={executeCreateBackup} 
            variant="contained"
            startIcon={<BackupIcon />}
            disabled={loading || Object.values(selectedData).every(v => !v)}
          >
            Criar Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          🔄 Restaurar Backup
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Atenção: Esta operação irá substituir todos os dados atuais!
              </Typography>
              <Typography variant="body2">
                Certifique-se de ter um backup dos dados atuais antes de prosseguir.
              </Typography>
            </Alert>

            {selectedBackup && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Detalhes do Backup:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Nome"
                      secondary={selectedBackup.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Data de Criação"
                      secondary={formatDate(selectedBackup.created_at)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Tamanho"
                      secondary={formatFileSize(selectedBackup.size || 0)}
                    />
                  </ListItem>
                </List>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={executeRestore} 
            variant="contained"
            color="warning"
            startIcon={<RestoreIcon />}
            disabled={loading}
          >
            Restaurar Backup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupRestore;