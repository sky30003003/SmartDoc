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
  Tooltip,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import OrgAdminPageHeader from '../common/OrgAdminPageHeader';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const EmployeeManagement = () => {
  const { currentUser, organizationName } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    employee: null
  });
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cnp: ''
  });
  const [documentsDialog, setDocumentsDialog] = useState({
    open: false,
    employee: null
  });
  const [deleteDocumentDialog, setDeleteDocumentDialog] = useState({
    open: false,
    employee: null,
    document: null
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la obținerea angajaților');
      }

      const data = await response.json();
      setError(null);
      setEmployees(data);
    } catch (error) {
      setError(error.message);
      setEmployees([]);
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Eroare la adăugarea angajatului');
      }

      const employee = await response.json();
      setEmployees([employee, ...employees]);
      handleCloseAddDialog();
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDeleteClick = (employee) => {
    setDeleteDialog({
      open: true,
      employee: employee
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      employee: null
    });
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la ștergerea angajatului');
      }

      setEmployees(employees.filter(emp => emp._id !== id));
      handleDeleteCancel();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleViewDetails = (employee) => {
    navigate(`/org-admin/employees/${employee._id}`);
  };

  const handleEdit = (employee) => {
    navigate(`/org-admin/employees/${employee._id}/edit`);
  };

  const handleViewDocuments = (employee) => {
    setDocumentsDialog({
      open: true,
      employee: employee
    });
  };

  const handleDeleteDocument = async (employeeId, documentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/${employeeId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la ștergerea documentului');
      }

      setDeleteDocumentDialog({
        open: false,
        employee: null,
        document: null
      });

      const employeesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!employeesResponse.ok) {
        throw new Error('Eroare la actualizarea listei de angajați');
      }

      const updatedEmployees = await employeesResponse.json();
      setEmployees(updatedEmployees);

      const updatedEmployee = updatedEmployees.find(emp => emp._id === employeeId);
      
      if (updatedEmployee) {
        setDocumentsDialog({
          open: true,
          employee: updatedEmployee
        });
      } else {
        setDocumentsDialog({
          open: false,
          employee: null
        });
      }

      setSuccessMessage('Documentul a fost șters cu succes');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
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
      <Box sx={{ mb: 4 }}>
        <OrgAdminPageHeader organizationName={organizationName} pageName="Angajați" />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          Adaugă Angajat
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
              <TableCell sx={{ fontWeight: 700 }}>Documente</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Acțiuni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nu există angajați înregistrați
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp._id}>
                  <TableCell>{emp.lastName}</TableCell>
                  <TableCell>{emp.firstName}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.phone}</TableCell>
                  <TableCell>{emp.cnp}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<DocumentIcon />}
                      label={`${emp.documentCount} documente`}
                      onClick={() => handleViewDocuments(emp)}
                      color={emp.documentCount > 0 ? "primary" : "default"}
                      variant="outlined"
                      sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Vezi detalii">
                        <IconButton size="small" onClick={() => handleViewDetails(emp)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editează">
                        <IconButton size="small" onClick={() => handleEdit(emp)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Șterge">
                        <IconButton color="error" size="small" onClick={() => handleDeleteClick(emp)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openAddDialog} onClose={handleCloseAddDialog}>
        <DialogTitle>Adaugă Angajat</DialogTitle>
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
            Sigur doriți să ștergeți angajatul "{deleteDialog.employee?.lastName} {deleteDialog.employee?.firstName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Această acțiune nu poate fi anulată.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Anulează</Button>
          <Button
            onClick={() => handleDelete(deleteDialog.employee?._id)}
            color="error"
            variant="contained"
          >
            Șterge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={documentsDialog.open}
        onClose={() => setDocumentsDialog({ open: false, employee: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Documente - {documentsDialog.employee?.firstName} {documentsDialog.employee?.lastName}
        </DialogTitle>
        <DialogContent>
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          {documentsDialog.employee?.documents.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
              Nu există documente asociate
            </Typography>
          ) : (
            <List>
              {documentsDialog.employee?.documents.map((doc) => (
                <ListItem key={doc.documentId}>
                  <ListItemText
                    primary={doc.title}
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.primary">
                          Status: {' '}
                          <Chip
                            label={doc.status === 'signed' ? 'Semnat' : 'În așteptare'}
                            color={doc.status === 'signed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </Typography>
                        {doc.signedAt && (
                          <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                            Semnat la: {new Date(doc.signedAt).toLocaleString('ro-RO')}
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => setDeleteDocumentDialog({
                        open: true,
                        employee: documentsDialog.employee,
                        document: doc
                      })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentsDialog({ open: false, employee: null })}>
            Închide
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDocumentDialog.open}
        onClose={() => setDeleteDocumentDialog({ open: false, employee: null, document: null })}
      >
        <DialogTitle>Confirmare ștergere document</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să ștergeți documentul "{deleteDocumentDialog.document?.title}" 
            al angajatului {deleteDocumentDialog.employee?.firstName} {deleteDocumentDialog.employee?.lastName}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Această acțiune nu poate fi anulată.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDocumentDialog({ open: false, employee: null, document: null })}>
            Anulează
          </Button>
          <Button
            onClick={() => handleDeleteDocument(
              deleteDocumentDialog.employee?._id,
              deleteDocumentDialog.document?.documentId
            )}
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

export default EmployeeManagement; 