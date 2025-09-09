import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Container, Alert, Snackbar } from '@mui/material';
import { io } from 'socket.io-client';

// Components - Sistema Completo com 8 Módulos
import Dashboard from './components/Dashboard';
import StockManagement from './components/StockManagement';
import Users from './components/Users';
import Managers from './components/Managers';
import Ferroviaria from './components/Ferroviaria';
import Server from './components/Server';
import Recipes from './components/Recipes';
import StockConfiguration from './components/StockConfiguration';
import Navigation from './components/Navigation';
import ScrollToTop from './components/ScrollToTop';
import AdminPanel from './components/AdminPanel';

// Context
import { SocketContext } from './context/SocketContext';

function App() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    // Initialize Socket.io connection
    // In production, use relative URL to connect to same domain
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : (process.env.REACT_APP_SERVER_URL || 'http://localhost:4050');
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔗 Connected to server');
      setConnectionStatus('connected');
      setNotification({
        open: true,
        message: 'Conectado ao servidor! 🎉',
        severity: 'success'
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnectionStatus('disconnected');
      setNotification({
        open: true,
        message: 'Conexão perdida com o servidor',
        severity: 'error'
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setNotification({
        open: true,
        message: 'Erro na conexão com o servidor',
        severity: 'error'
      });
    });

    // Listen for real-time updates - Sistema em Português
    newSocket.on('inventario:atualizado', (data) => {
      console.log('📦 Inventário atualizado:', data);
    });

    newSocket.on('usuarios:atualizado', (data) => {
      console.log('👥 Usuários atualizados:', data);
    });

    newSocket.on('dashboard:atualizado', (data) => {
      console.log('📊 Dashboard atualizado:', data);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4caf50';
      case 'connecting': return '#ff9800';
      case 'disconnected': 
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'disconnected': return 'Desconectado';
      case 'error': return 'Erro de Conexão';
      default: return 'Desconhecido';
    }
  };


  return (
    <SocketContext.Provider value={socket}>
      <Box sx={{ flexGrow: 1 }}>
        {/* App Bar with Navigation */}
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
          <Toolbar sx={{ 
            minHeight: '64px !important', 
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="h6" component="div" sx={{ 
              minWidth: 'fit-content',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}>
              🌾 Fazenda
            </Typography>
            
            {/* Navigation in same bar - centered */}
            <Box sx={{ 
              flexGrow: 1,
              display: 'flex',
              justifyContent: 'center',
              mx: 2
            }}>
              <Navigation />
            </Box>
            
            {/* Connection Status and Dark Mode Toggle */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              minWidth: 'fit-content'
            }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getConnectionColor(),
                  transition: 'all 0.3s ease',
                  boxShadow: `0 0 10px ${getConnectionColor()}`,
                }}
              />
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {getConnectionText()}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
        
        {/* Main Content - 8 Módulos Completos */}
        <Container maxWidth="xl">
          {/* Add top padding to account for fixed AppBar */}
          <Box sx={{ mt: 10 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/stock-management" element={<StockManagement />} />
              <Route path="/users" element={<Users />} />
              <Route path="/managers" element={<Managers />} />
              <Route path="/ferroviaria" element={<Ferroviaria />} />
              <Route path="/server" element={<Server />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/stock-config" element={<StockConfiguration />} />
              <Route path="/admin" element={<AdminPanel />} />
              {/* Legacy routes for backward compatibility */}
              <Route path="/inventory" element={<Navigate to="/stock-management" replace />} />
              <Route path="/pricing" element={<Navigate to="/stock-management" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        </Container>

        {/* Scroll to Top Button */}
        <ScrollToTop />



        {/* Notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleNotificationClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleNotificationClose}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </SocketContext.Provider>
  );
}

export default App;