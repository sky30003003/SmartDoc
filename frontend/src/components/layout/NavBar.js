import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
  IconButton,
  Button,
  useTheme,
  Container
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { ReactComponent as SmartDocLogo } from '../../assets/smartdoc-logo.svg';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const NavBar = ({ onToggleDrawer }) => {
  const { logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isOrgAdmin = currentUser?.role === 'org_admin';

  return (
    <AppBar 
      position="fixed" 
      sx={{
        background: 'transparent',
        borderRadius: 0,
        boxShadow: 'none',
        backdropFilter: 'saturate(200%) blur(1.875rem)',
        color: '#fff',
        border: 0,
        minHeight: '75px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: theme.zIndex.drawer + 1
      }}
    >
      <Container 
        maxWidth="lg" 
        sx={{
          background: 'linear-gradient(195deg, rgb(66, 66, 74), rgb(25, 25, 25))',
          borderRadius: '0.75rem',
          boxShadow: 'rgb(0 0 0 / 5%) 0rem 1.25rem 1.6875rem 0rem',
          mt: 2,
          mb: 2
        }}
      >
        <Toolbar sx={{ width: '100%', minHeight: '75px !important', px: 0 }}>
          <Box 
            component={SmartDocLogo} 
            sx={{ 
              width: 40, 
              height: 40, 
              mr: 2,
              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'
            }} 
          />

          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="h5" 
              component="div"
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mr: 1
              }}
            >
              SmartDoc
            </Typography>
            <Typography 
              variant="body2"
              sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
                fontWeight: 300,
                letterSpacing: '0.025rem',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: '-10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1px',
                  height: '15px',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              Soluție inteligentă de management al documentelor
            </Typography>
          </Box>

          {isOrgAdmin && (
            <IconButton 
              color="inherit"
              onClick={() => navigate('/org-admin/settings')}
              sx={{
                borderRadius: '0.5rem',
                mr: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }
              }}
            >
              <SettingsIcon />
            </IconButton>
          )}

          <Button
            color="inherit"
            onClick={logout}
            startIcon={<LogoutIcon />}
            sx={{
              textTransform: 'none',
              borderRadius: '0.5rem',
              px: 2,
              py: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            Deconectare
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default NavBar; 