import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import OrgAdminPageHeader from '../common/OrgAdminPageHeader';
import { useAuth } from '../../context/AuthContext';
import { Edit as EditIcon } from '@mui/icons-material';

const ViewEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organizationName } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Eroare la obținerea datelor angajatului');
        }

        const data = await response.json();
        setEmployee(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <OrgAdminPageHeader 
          organizationName={organizationName} 
          pageName={`Detalii Angajat: ${employee?.firstName} ${employee?.lastName}`} 
        />
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/org-admin/employees/${id}/edit`)}
          sx={{
            background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
            '&:hover': {
              background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
            }
          }}
        >
          Editează
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informații Personale
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Nume
              </Typography>
              <Typography variant="body1">
                {employee?.lastName}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Prenume
              </Typography>
              <Typography variant="body1">
                {employee?.firstName}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">
                {employee?.email}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Telefon
              </Typography>
              <Typography variant="body1">
                {employee?.phone}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                CNP
              </Typography>
              <Typography variant="body1">
                {employee?.cnp}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ViewEmployee; 