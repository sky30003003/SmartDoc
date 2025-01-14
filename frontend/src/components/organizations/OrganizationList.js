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
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Checkbox,
  Stack,
  Link,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../common/AdminPageHeader';
import { Link as RouterLink } from 'react-router-dom';

const OrganizationList = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    organization: null
  });
  const [selected, setSelected] = useState([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [deleteSuccessDialog, setDeleteSuccessDialog] = useState(false);
  const [deletedOrgName, setDeletedOrgName] = useState('');
  const [bulkDeleteSuccessDialog, setBulkDeleteSuccessDialog] = useState(false);
  const [deletedOrgsCount, setDeletedOrgsCount] = useState(0);
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    organization: null
  });

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error('Eroare la obținerea organizațiilor');
        }

        const data = await response.json();
        console.log('Organizations data:', data);
        setOrganizations(data);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleDeleteClick = (org, e) => {
    e.stopPropagation();
    setDeleteDialog({
      open: true,
      organization: org
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/organizations/${deleteDialog.organization._id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la ștergerea organizației');
      }

      // Salvăm numele organizației înainte să o ștergem din state
      setDeletedOrgName(deleteDialog.organization.name);

      // Actualizăm lista de organizații
      setOrganizations(organizations.filter(
        org => org._id !== deleteDialog.organization._id
      ));
      setDeleteDialog({ open: false, organization: null });
      setDeleteSuccessDialog(true);
    } catch (error) {
      setError(error.message);
      console.error('Error deleting organization:', error);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, organization: null });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(organizations.map(org => org._id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (event, id) => {
    if (event.target.checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter(orgId => orgId !== id));
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Salvăm numărul de organizații șterse pentru mesajul de succes
      const deletedCount = selected.length;
      
      await Promise.all(selected.map(orgId => 
        fetch(`${process.env.REACT_APP_API_URL}/api/organizations/${orgId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ));

      // Actualizăm lista de organizații
      setOrganizations(organizations.filter(org => !selected.includes(org._id)));
      setSelected([]);
      setBulkDeleteDialog(false);
      setDeletedOrgsCount(deletedCount);
      setBulkDeleteSuccessDialog(true);
    } catch (error) {
      setError('Eroare la ștergerea organizațiilor');
      console.error('Error bulk deleting organizations:', error);
    }
  };

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
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            <Link 
              component={RouterLink} 
              to="/dashboard" 
              sx={{ 
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Dashboard Administrator
            </Link>
            <Typography 
              component="span" 
              sx={{ 
                color: 'text.secondary',
                mx: 1
              }}
            >
              ::
            </Typography>
            Organizații
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/organizations/new')}
            sx={{
              background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
              '&:hover': {
                background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
              }
            }}
          >
            Adaugă Organizație
          </Button>
        </Box>
      </Box>

      {selected.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={() => setBulkDeleteDialog(true)}
          >
            Șterge Organizațiile Selectate ({selected.length})
          </Button>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgb(248, 249, 250)' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < organizations.length}
                  checked={organizations.length > 0 && selected.length === organizations.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'rgb(52, 71, 103)'
                }}
              >Organizație</TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'rgb(52, 71, 103)',
                  textAlign: 'center'
                }}
              >Documente</TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'rgb(52, 71, 103)',
                  textAlign: 'center'
                }}
              >Angajați</TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'rgb(52, 71, 103)',
                  textAlign: 'center'
                }}
              >Colaboratori</TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  color: 'rgb(52, 71, 103)'
                }}
              >Acțiuni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nu există organizații în sistem
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org._id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={selected.includes(org._id)}
                      onChange={(e) => handleSelectOne(e, org._id)}
                    />
                  </TableCell>
                  <TableCell>{org.name}</TableCell>
                  <TableCell align="center">{org.documentsCount || 0}</TableCell>
                  <TableCell align="center">{org.employeesCount || 0}</TableCell>
                  <TableCell align="center">{org.collaboratorsCount || 0}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Vezi detalii">
                      <IconButton
                        color="primary"
                        onClick={() => setDetailsDialog({
                          open: true,
                          organization: org
                        })}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editează">
                      <IconButton size="small" onClick={() => navigate(`/organizations/${org._id}/edit`)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Șterge Organizație">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => handleDeleteClick(org, e)}
                      >
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

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirmare ștergere</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sigur doriți să ștergeți organizația "{deleteDialog.organization?.name}"?
            Această acțiune va șterge și administratorul organizației.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Anulează</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Șterge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
      >
        <DialogTitle>Confirmare ștergere multiplă</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sigur doriți să ștergeți {selected.length} organizații?
            Această acțiune va șterge și administratorii organizațiilor respective.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialog(false)}>
            Anulează
          </Button>
          <Button 
            onClick={handleBulkDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Șterge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteSuccessDialog}
        onClose={() => setDeleteSuccessDialog(false)}
      >
        <DialogTitle sx={{ color: 'success.main' }}>
          Organizație ștearsă cu succes
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Organizația <strong>{deletedOrgName}</strong> și toate datele asociate au fost șterse cu succes:
          </Typography>
          <Box sx={{ mt: 2, pl: 2 }}>
            <Typography variant="body2">• Administratorul organizației</Typography>
            <Typography variant="body2">• Toți angajații</Typography>
            <Typography variant="body2">• Toți colaboratorii</Typography>
            <Typography variant="body2">• Toate documentele</Typography>
            <Typography variant="body2">• Folderul de stocare</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteSuccessDialog(false)}
            variant="contained"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bulkDeleteSuccessDialog}
        onClose={() => setBulkDeleteSuccessDialog(false)}
      >
        <DialogTitle sx={{ color: 'success.main' }}>
          Organizații șterse cu succes
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Au fost șterse cu succes <strong>{deletedOrgsCount}</strong> organizații și toate datele asociate acestora:
          </Typography>
          <Box sx={{ mt: 2, pl: 2 }}>
            <Typography variant="body2">• Administratorii organizațiilor</Typography>
            <Typography variant="body2">• Toți angajații</Typography>
            <Typography variant="body2">• Toți colaboratorii</Typography>
            <Typography variant="body2">• Toate documentele</Typography>
            <Typography variant="body2">• Folderele de stocare</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBulkDeleteSuccessDialog(false)}
            variant="contained"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, organization: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalii Organizație</DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemText
                primary="Nume"
                secondary={detailsDialog.organization?.name}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Email"
                secondary={detailsDialog.organization?.email}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Telefon"
                secondary={detailsDialog.organization?.phone}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="CUI/CNP"
                secondary={detailsDialog.organization?.cuiCnp}
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog({ open: false, organization: null })}>
            Închide
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrganizationList; 