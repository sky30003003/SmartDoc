import React, { useEffect, useState } from 'react';
import { 
  Box,
  Grid,
  Container,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Typography,
  Button
} from '@mui/material';
import {
  Business as BusinessIcon,
  Description as DocumentIcon,
  People as PeopleIcon,
  Group as CollaboratorsIcon,
  InfoOutlined
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import AdminPageHeader from '../common/AdminPageHeader';
import DashboardCard from './DashboardCard';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    organizations: 0,
    documents: 0,
    employeeCount: 0,
    collaboratorCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Eroare la obținerea statisticilor');
        }

        const data = await response.json();
        console.log('Admin Stats:', data);
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
        <Grid item xs={12} sm={6} md={6}>
          <DashboardCard
            title="Organizații"
            icon={<BusinessIcon />}
            count={stats.organizations}
            action="Vezi toate organizațiile"
            onClick={() => navigate('/organizations')}
            onAddClick={() => navigate('/organizations/new')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={6}>
          <DashboardCard
            title="Documente"
            icon={<DocumentIcon />}
            count={stats.documents}
            action="Vezi toate documentele"
            onClick={() => navigate('/admin/documents')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={6}>
          <DashboardCard
            title="Angajați"
            icon={<PeopleIcon />}
            count={stats.employeeCount}
            action="Vezi toți angajații"
            onClick={() => navigate('/admin/employees')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={6}>
          <DashboardCard
            title="Colaboratori"
            icon={<CollaboratorsIcon />}
            count={stats.collaboratorCount}
            action="Vezi toți colaboratorii"
            onClick={() => navigate('/admin/collaborators')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                <InfoOutlined sx={{ mr: 1 }} />
                Informații Semnătură Digitală
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Detalii despre implementarea semnăturii digitale și conformitatea cu legislația
              </Typography>
              <Button
                variant="contained"
                color="primary"
                component={Link}
                to="/admin/digital-signature-info"
                fullWidth
              >
                Vizualizează
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard; 