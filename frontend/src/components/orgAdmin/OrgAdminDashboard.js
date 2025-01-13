import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  People as PeopleIcon,
  Group as GroupIcon,
  Description as DocumentIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const OrgAdminDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrgStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/organizations/${currentUser.organization}/stats`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Eroare la obținerea statisticilor');
        }

        const data = await response.json();
        setStats(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgStats();
  }, [currentUser.organization]);

  const cards = [
    {
      title: 'Documente',
      icon: <DocumentIcon sx={{ fontSize: 40 }} />,
      count: stats?.documents || 0,
      action: 'Gestionează documente',
      onClick: () => navigate('/documents'),
      color: 'rgb(26, 115, 232)',
      description: 'Gestionează toate documentele organizației'
    },
    {
      title: 'Angajați',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      count: stats?.employees || 0,
      action: 'Gestionează angajați',
      onClick: () => navigate('/employees'),
      color: 'rgb(46, 125, 50)',
      description: 'Administrează angajații organizației'
    },
    {
      title: 'Colaboratori',
      icon: <GroupIcon sx={{ fontSize: 40 }} />,
      count: stats?.collaborators || 0,
      action: 'Gestionează colaboratori',
      onClick: () => navigate('/collaborators'),
      color: 'rgb(211, 47, 47)',
      description: 'Administrează colaboratorii externi'
    }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccountIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Bun venit, {currentUser.firstName}!
            </Typography>
            <Typography variant="subtitle1">
              Panou de control pentru {currentUser.organizationName}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
              onClick={card.onClick}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      p: 1,
                      borderRadius: 1,
                      bgcolor: `${card.color}15`,
                      color: card.color,
                      mr: 2
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography variant="h6">{card.title}</Typography>
                </Box>
                <Typography variant="h3" sx={{ mb: 1, color: card.color }}>
                  {card.count}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {card.description}
                </Typography>
                <Button 
                  variant="outlined" 
                  fullWidth
                  sx={{ 
                    color: card.color,
                    borderColor: card.color,
                    '&:hover': {
                      borderColor: card.color,
                      bgcolor: `${card.color}15`
                    }
                  }}
                >
                  {card.action}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Settings Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Setări Organizație
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Modifică datele organizației și setările contului
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/organization-settings')}
              sx={{
                background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
                '&:hover': {
                  background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
                }
              }}
            >
              Setări
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default OrgAdminDashboard; 