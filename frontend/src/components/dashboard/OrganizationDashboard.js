import React, { useEffect, useState } from 'react';
import { 
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  useTheme,
  alpha,
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Description as DocumentIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../common/AdminPageHeader';
import DashboardCard from './DashboardCard';

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    organizations: 0,
    users: 0,
    documents: 0,
    employeeCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching stats with token:', token);
        console.log('API URL:', `${process.env.REACT_APP_API_URL}/api/organizations/dashboard-stats`);
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/dashboard-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
          const errorData = await response.text();
          console.error('Error response:', errorData);
          throw new Error('Eroare la obținerea statisticilor');
        }

        const data = await response.json();
        console.log('Stats data:', data);
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
      <AdminPageHeader />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Organizații"
            icon={<BusinessIcon />}
            count={stats.organizations}
            action="Vezi toate organizațiile"
            onClick={() => navigate('/organizations')}
            onAddClick={() => navigate('/organizations/new')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Utilizatori"
            icon={<PeopleIcon />}
            count={stats.users}
            action="Gestionează utilizatorii"
            onClick={() => navigate('/users')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Documente"
            icon={<DocumentIcon />}
            count={stats.documents}
            action="Vezi toate documentele"
            onClick={() => navigate('/documents')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Angajați"
            icon={<PeopleIcon />}
            count={stats.employeeCount}
            action="Vezi toți angajații"
            onClick={() => navigate('/employees')}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrganizationDashboard; 