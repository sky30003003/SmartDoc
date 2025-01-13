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

const AdminDocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/documents`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Eroare la obținerea documentelor');
        }

        const data = await response.json();
        setDocuments(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
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
      <AdminPageHeader pageName="Documente" />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgb(248, 249, 250)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Nume Document</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Organizație</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tip</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Data Încărcării</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nu există documente în sistem
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc._id}>
                  <TableCell>{doc.originalName || doc.title || 'N/A'}</TableCell>
                  <TableCell>{doc.organization?.name || 'N/A'}</TableCell>
                  <TableCell>{doc.fileType || 'N/A'}</TableCell>
                  <TableCell>
                    {doc.uploadedAt ? 
                      new Date(doc.uploadedAt).toLocaleDateString('ro-RO') : 
                      'N/A'
                    }
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default AdminDocumentList; 