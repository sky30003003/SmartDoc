import React, { useEffect, useState } from 'react';
import { 
  Box,
  Grid,
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Description as DocumentIcon,
  Group as CollaboratorsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import OrgAdminPageHeader from '../common/OrgAdminPageHeader';
import { useAuth } from '../../context/AuthContext';
import DashboardCard from './DashboardCard';

const OrgAdminDashboard = () => {
  const navigate = useNavigate();
  const { organizationName } = useAuth();
  const [stats, setStats] = useState({
    documents: 0,
    employeeCount: 0,
    collaborators: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/dashboard-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Eroare la obținerea statisticilor');
        }

        const data = await response.json();
        console.log('Org Admin Stats:', data);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <OrgAdminPageHeader organizationName={organizationName} pageName="Dashboard" />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Documente"
            icon={<DocumentIcon />}
            count={stats.documents}
            action="Vezi toate documentele"
            onClick={() => navigate('/org-admin/documents')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Angajați"
            icon={<PeopleIcon />}
            count={stats.employeeCount}
            action="Vezi toți angajații"
            onClick={() => navigate('/org-admin/employees')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Colaboratori"
            icon={<CollaboratorsIcon />}
            count={stats.collaborators}
            action="Vezi toți colaboratorii"
            onClick={() => navigate('/org-admin/collaborators')}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrgAdminDashboard; 