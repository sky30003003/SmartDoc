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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import OrgAdminPageHeader from '../common/OrgAdminPageHeader';
import { useAuth } from '../../context/AuthContext';

const CollaboratorManagement = () => {
  const { organizationName } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    collaborator: null
  });
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cnp: ''
  });

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la obținerea colaboratorilor');
      }

      const data = await response.json();
      setError(null);
      setCollaborators(data);
    } catch (error) {
      setError(error.message);
      setCollaborators([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setFormError(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      cnp: ''
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/collaborators`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Eroare la adăugarea colaboratorului');
      }

      const collaborator = await response.json();
      setCollaborators([collaborator, ...collaborators]);
      handleCloseAddDialog();
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDeleteClick = (collaborator) => {
    setDeleteDialog({
      open: true,
      collaborator: collaborator
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      collaborator: null
    });
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/collaborators/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la ștergerea colaboratorului');
      }

      setCollaborators(collaborators.filter(c => c._id !== id));
      handleDeleteCancel();
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <OrgAdminPageHeader organizationName={organizationName} pageName="Colaboratori" />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
          sx={{
            background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
            '&:hover': {
              background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
            }
          }}
        >
          Adaugă Colaborator
        </Button>
      </Box>

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
              <TableCell align="right" sx={{ fontWeight: 700 }}>Acțiuni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {collaborators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nu există colaboratori înregistrați
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              collaborators.map((collab) => (
                <TableRow key={collab._id}>
                  <TableCell>{collab.lastName}</TableCell>
                  <TableCell>{collab.firstName}</TableCell>
                  <TableCell>{collab.email}</TableCell>
                  <TableCell>{collab.phone}</TableCell>
                  <TableCell>{collab.cnp}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Șterge">
                      <IconButton color="error" onClick={() => handleDeleteClick(collab)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openAddDialog} onClose={handleCloseAddDialog}>
        <DialogTitle>Adaugă Colaborator</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleAdd} sx={{ mt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Nume"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Prenume"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Telefon"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="CNP"
              required
              value={formData.cnp}
              onChange={(e) => setFormData({ ...formData, cnp: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Anulează</Button>
          <Button 
            onClick={handleAdd} 
            variant="contained"
            disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.cnp}
          >
            Adaugă
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirmare ștergere</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să ștergeți colaboratorul "{deleteDialog.collaborator?.lastName} {deleteDialog.collaborator?.firstName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Această acțiune nu poate fi anulată.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Anulează</Button>
          <Button
            onClick={() => handleDelete(deleteDialog.collaborator?._id)}
            color="error"
            variant="contained"
          >
            Șterge
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CollaboratorManagement; 