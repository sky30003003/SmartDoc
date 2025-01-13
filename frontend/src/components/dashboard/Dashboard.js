import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Divider,
  useTheme
} from '@mui/material';
import {
  People as PeopleIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import EmployeeManagement from './EmployeeManagement';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  zIndex: theme.zIndex.drawer + 1,
}));

const MenuButton = styled(Button)(({ theme, active }) => ({
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  borderRadius: theme.shape.borderRadius,
  padding: '8px 16px',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '& .MuiButton-startIcon': {
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  },
}));

const Dashboard = () => {
  const { user, logout } = useAuth0();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout({ returnTo: window.location.origin });
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, active: false },
    { text: 'Angajați', icon: <PeopleIcon />, active: true },
    { text: 'Documente', icon: <DescriptionIcon />, active: false },
    { text: 'Setări', icon: <SettingsIcon />, active: false },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Header */}
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography
            variant="h6"
            component="h1"
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              color: theme.palette.primary.main 
            }}
          >
            SmartDoc
          </Typography>
          <IconButton onClick={handleMenuClick}>
            <Avatar
              alt={user?.name}
              src={user?.picture}
              sx={{ width: 32, height: 32 }}
            />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            sx={{ mt: 1 }}
          >
            <MenuItem onClick={handleMenuClose}>Profil</MenuItem>
            <MenuItem onClick={handleLogout}>Deconectare</MenuItem>
          </Menu>
        </Toolbar>
        
        {/* Navigation Menu */}
        <Divider />
        <Toolbar 
          variant="dense" 
          sx={{ 
            gap: 1,
            minHeight: 48,
            overflowX: 'auto',
            '::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            pb: 1,
          }}
        >
          {menuItems.map((item) => (
            <MenuButton
              key={item.text}
              startIcon={item.icon}
              active={item.active ? 1 : 0}
            >
              {item.text}
            </MenuButton>
          ))}
        </Toolbar>
      </StyledAppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          backgroundColor: theme.palette.background.default,
          flexGrow: 1,
          pt: { xs: 16, sm: 16 },
          pb: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Container 
          maxWidth="lg" 
          sx={{ 
            px: { xs: 2, sm: 3, md: 4 }
          }}
        >
          <EmployeeManagement />
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard; 