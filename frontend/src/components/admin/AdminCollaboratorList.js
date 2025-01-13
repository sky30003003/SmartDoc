import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import AdminPageHeader from '../common/AdminPageHeader';

const AdminCollaboratorList = () => {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/collaborators`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Eroare la obținerea colaboratorilor');
        }

        const data = await response.json();
        setCollaborators(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching collaborators:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCollaborators();
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
      <AdminPageHeader pageName="Colaboratori" />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgb(248, 249, 250)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Nume</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Prenume</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Telefon</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>CNP</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Organizație</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {collaborators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nu există colaboratori în sistem
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              collaborators.map((collaborator) => (
                <TableRow key={collaborator._id}>
                  <TableCell>{collaborator.lastName}</TableCell>
                  <TableCell>{collaborator.firstName}</TableCell>
                  <TableCell>{collaborator.email}</TableCell>
                  <TableCell>{collaborator.phone}</TableCell>
                  <TableCell>{collaborator.cnp}</TableCell>
                  <TableCell>{collaborator.organization?.name || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default AdminCollaboratorList; 