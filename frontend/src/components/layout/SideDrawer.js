import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Description as DocumentIcon,
  Handshake as HandshakeIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SideDrawer = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const menuItems = isAdmin ? [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' }
  ] : [
    { text: 'Angajați', icon: <PeopleIcon />, path: '/employees' },
    { text: 'Documente', icon: <DocumentIcon />, path: '/documents' },
    { text: 'Colaboratori', icon: <HandshakeIcon />, path: '/collaborators' }
  ];

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="temporary"
      PaperProps={{
        sx: {
          width: 280,
          background: 'linear-gradient(195deg, rgb(66, 66, 74), rgb(25, 25, 25))',
          color: '#fff',
          p: 2,
          mt: '75px'
        }
      }}
    >
      <List>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            onClick={() => {
              navigate(item.path);
              onClose();
            }}
            sx={{
              borderRadius: '0.75rem',
              mb: 1,
              backgroundColor: location.pathname === item.path ? 
                'rgba(255, 255, 255, 0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                sx: { fontWeight: location.pathname === item.path ? 500 : 400 }
              }}
            />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default SideDrawer; 