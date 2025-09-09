import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Tabs, 
  Tab, 
  Box, 
  Paper,
  Slide
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Kitchen as RecipesIcon,
  Train as TrainIcon,
  SupervisorAccount as ManagerIcon,
  Settings as SettingsIcon,
  Warehouse as StockManagementIcon,
  Dns as ServerIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 0;
    if (path.includes('/stock-management')) return 1;
    if (path.includes('/users')) return 2;
    if (path.includes('/managers')) return 3;
    if (path.includes('/ferroviaria')) return 4;
    if (path.includes('/recipes')) return 5;
    if (path.includes('/stock-config')) return 6;
    if (path.includes('/server')) return 7;
    if (path.includes('/admin')) return 8;
    return 0;
  };

  // Always show navigation - no scroll hiding
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleTabChange = (event, newValue) => {
    const routes = [
      '/dashboard', 
      '/stock-management', 
      '/users',
      '/managers', 
      '/ferroviaria',
      '/recipes',
      '/stock-config',
      '/server',
      '/admin'
    ];
    navigate(routes[newValue]);
  };

  return (
    <Tabs 
      value={getCurrentTab()} 
      onChange={handleTabChange}
      variant="scrollable"
      scrollButtons="auto"
      centered={false}
      sx={{
        '& .MuiTabs-indicator': {
          backgroundColor: '#4287f5',
          height: 3,
          borderRadius: '3px',
          boxShadow: '0 0 15px rgba(66, 135, 245, 0.8)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '& .MuiTab-root': {
          minHeight: '48px',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          minWidth: '100px',
          padding: '8px 16px',
          color: 'rgba(255, 255, 255, 0.7)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '8px',
          margin: '0 4px',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            transition: 'left 0.6s ease',
          },
          '&:hover': {
            color: 'rgba(255, 255, 255, 0.95)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(66, 135, 245, 0.3)',
            '&::before': {
              left: '100%',
            },
          },
          '&.Mui-selected': {
            color: '#fff',
            backgroundColor: 'rgba(66, 135, 245, 0.2)',
            textShadow: '0 0 10px rgba(66, 135, 245, 0.5)',
            transform: 'scale(1.05)',
            boxShadow: '0 2px 8px rgba(66, 135, 245, 0.4)',
          },
          '&:active': {
            transform: 'scale(0.98)',
            transition: 'transform 0.1s ease',
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.2rem',
            marginRight: '6px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            transition: 'all 0.3s ease',
          },
          '&:hover .MuiSvgIcon-root': {
            transform: 'scale(1.1) rotate(5deg)',
            filter: 'drop-shadow(0 4px 8px rgba(66, 135, 245, 0.4))',
          },
          '&.Mui-selected .MuiSvgIcon-root': {
            transform: 'scale(1.1)',
            filter: 'drop-shadow(0 0 10px rgba(66, 135, 245, 0.6))',
          }
        },
        '& .MuiTabs-scrollButtons': {
          color: 'rgba(255, 255, 255, 0.7)',
          '&.Mui-disabled': {
            opacity: 0.3,
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        },
        '& .MuiTabs-flexContainer': {
          alignItems: 'center',
        }
      }}
    >
      <Tab 
        icon={<DashboardIcon />} 
        label="Dashboard" 
        iconPosition="start"
      />
      <Tab 
        icon={<StockManagementIcon />} 
        label="Estoque" 
        iconPosition="start"
      />
      <Tab 
        icon={<PeopleIcon />} 
        label="Trabalhadores" 
        iconPosition="start"
      />
      <Tab 
        icon={<ManagerIcon />} 
        label="Gerentes" 
        iconPosition="start"
      />
      <Tab 
        icon={<TrainIcon />} 
        label="Ferrovia" 
        iconPosition="start"
      />
      <Tab 
        icon={<RecipesIcon />} 
        label="Receitas" 
        iconPosition="start"
      />
      <Tab 
        icon={<SettingsIcon />} 
        label="Configuração" 
        iconPosition="start"
      />
      <Tab 
        icon={<ServerIcon />} 
        label="Servidor" 
        iconPosition="start"
      />
      <Tab 
        icon={<AdminIcon />} 
        label="Admin" 
        iconPosition="start"
      />
    </Tabs>
  );
};

export default Navigation;