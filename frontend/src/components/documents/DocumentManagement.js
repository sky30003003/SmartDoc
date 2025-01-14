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
  DialogContentText,
  DialogActions,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Info as InfoIcon,
  VerifiedUser as VerifiedUserIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  Circle as CircleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import OrgAdminPageHeader from '../common/OrgAdminPageHeader';
import { useAuth } from '../../context/AuthContext';
import { useSignature } from '../../context/SignatureContext';
import SignatureStatusDialog from './SignatureStatusDialog';
import DocumentViewer from './DocumentViewer';

const DocumentManagement = () => {
  const { currentUser, organizationName } = useAuth();
  const { verifySignature, getVerificationResult, clearVerificationData } = useSignature();
  const { enqueueSnackbar } = useSnackbar();
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    document: null,
    isBulk: false
  });
  const [signDialog, setSignDialog] = useState({
    open: false,
    document: null
  });
  const [uploadData, setUploadData] = useState({
    title: '',
    file: null,
    requiredSignatures: [
      { role: 'admin', order: null, required: false },
      { role: 'collaborator', order: null, required: false },
      { role: 'employee', order: null, required: false }
    ]
  });
  const [downloading, setDownloading] = useState(false);
  const [sendToSignDialog, setSendToSignDialog] = useState({
    open: false,
    document: null
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [statusDialog, setStatusDialog] = useState({ open: false, document: null });
  const [signatureStatuses, setSignatureStatuses] = useState({});
  const [verifyDialog, setVerifyDialog] = useState({ open: false, document: null });
  const [verificationResult, setVerificationResult] = useState(null);
  const token = localStorage.getItem('token');
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [viewDialog, setViewDialog] = useState({
    open: false,
    document: null,
    employeeCopy: null
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [infoDialog, setInfoDialog] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);

  // Helper function to get role name
  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'collaborator':
        return 'Colaborator';
      case 'employee':
        return 'Angajați';
      default:
        return role;
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la obținerea documentelor');
      }

      const data = await response.json();
      console.log('=== Response from /api/documents ===');
      console.log('All documents:', data);
      data.forEach(doc => {
        console.log(`Document ${doc._id}:`, {
          title: doc.title,
          signatureConfig: doc.signatureConfig,
          employeeCopies: doc.employeeCopies
        });
      });
      console.log('================================');
      
      setError(null);
      setDocuments(data);
    } catch (error) {
      setError(error.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

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
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    setUploadError(null);
    setUploadData({ title: '', file: null, requiredSignatures: [
      { role: 'admin', order: null, required: false },
      { role: 'collaborator', order: null, required: false },
      { role: 'employee', order: null, required: false }
    ] });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.title) {
      setUploadError('Titlul și fișierul sunt obligatorii');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('title', uploadData.title);
      
      // Adăugăm configurația semnăturilor
      const signatureConfig = uploadData.requiredSignatures
        .filter(sig => sig.required)
        .sort((a, b) => a.order - b.order)
        .map(sig => ({
          role: sig.role,
          order: sig.order
        }));
      
      // Dacă nu sunt semnături selectate, trimitem un array gol
      formData.append('signatureConfig', JSON.stringify(signatureConfig));

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Eroare la încărcarea documentului');
      }

      const document = await response.json();
      setDocuments([document, ...documents]);
      handleCloseUploadDialog();
      
      // Mesaj de succes cu configurare specifică pentru vizibilitate
      const successMessage = signatureConfig.length > 0 
        ? `Documentul a fost încărcat cu succes și necesită ${signatureConfig.length} ${signatureConfig.length === 1 ? 'semnătură' : 'semnături'}`
        : 'Documentul a fost încărcat cu succes și nu necesită semnături';
        
      enqueueSnackbar(successMessage, {
        variant: 'success',
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'center'
        },
        autoHideDuration: 5000,
        preventDuplicate: true
      });
    } catch (error) {
      setUploadError(error.message);
      // Mesaj de eroare cu configurare specifică pentru vizibilitate
      enqueueSnackbar(error.message, {
        variant: 'error',
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'center'
        },
        autoHideDuration: 5000,
        preventDuplicate: true
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Verificăm mărimea fișierului (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Fișierul este prea mare. Limita este de 10MB.');
        return;
      }

      // Verificăm tipul fișierului - doar PDF permis
      if (file.type !== 'application/pdf') {
        setUploadError('Sunt acceptate doar fișiere PDF.');
        setUploadData({ ...uploadData, file: null });
        return;
      }

      setUploadError(null);
      setUploadData({ ...uploadData, file });
    }
  };

  const handleDeleteClick = (document) => {
    setDeleteDialog({
      open: true,
      document: document,
      isBulk: false
    });
  };

  const handleBulkDeleteClick = () => {
    setDeleteDialog({
      open: true,
      document: null,
      isBulk: true
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      document: null,
      isBulk: false
    });
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la ștergerea documentului');
      }

      setDocuments(documents.filter(doc => doc._id !== id));
      handleDeleteCancel();
      enqueueSnackbar('Documentul a fost șters cu succes', { variant: 'success' });
    } catch (error) {
      setError(error.message);
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/download/${doc._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la descărcarea documentului');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Eroare la descărcarea documentului');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendToSign = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/${documentId}/send-to-sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la trimiterea documentului spre semnare');
      }

      const result = await response.json();
      setSuccessMessage(`Documentul a fost trimis spre semnare la ${result.sentCount} angajați`);
      setSendToSignDialog({ open: false, document: null });

      // Reîmprospătăm lista de documente
      const updatedDocumentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!updatedDocumentsResponse.ok) {
        throw new Error('Eroare la obținerea documentelor actualizate');
      }

      const updatedDocuments = await updatedDocumentsResponse.json();
      setDocuments(updatedDocuments);

      // Actualizăm dialogul de status dacă este deschis
      if (statusDialog.open && statusDialog.document) {
        const updatedDocument = updatedDocuments.find(doc => doc._id === statusDialog.document._id);
        if (updatedDocument) {
          setStatusDialog({
            open: true,
            document: updatedDocument
          });
        }
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignDialogClose = () => {
    setSignDialog({
      open: false,
      document: null
    });
  };

  const handleSendToSignConfirm = () => {
    if (signDialog.document) {
      handleSendToSign(signDialog.document._id);
    }
    handleSignDialogClose();
  };

  const handleViewStatus = (doc) => {
    setStatusDialog({
      open: true,
      document: doc
    });
  };

  const handleStatusDialogClose = () => {
    setStatusDialog({
      open: false,
      document: null
    });
  };

  const handleVerifyClick = async (documentId, signatureId) => {
    try {
      const result = await verifySignature(documentId, signatureId);
      console.log('Verification result:', result);
      return result;
    } catch (error) {
      console.error('Error verifying signature:', error);
      enqueueSnackbar('Eroare la verificarea semnăturii', { variant: 'error' });
      throw error;
    }
  };

  const getStatusChipProps = (document, copy) => {
    const signatureStatus = signatureStatuses[`${document._id}_${copy.employee}`];
    console.log('Getting status chip props for', copy.employeeName, ':', signatureStatus);
    
    if (copy.status === 'pending') {
      return {
        label: 'În așteptare',
        color: 'warning'
      };
    }
    
    if (copy.status === 'signed') {
      if (signatureStatus === undefined) {
        return {
          label: 'Verificare...',
          color: 'default'
        };
      }
      
      return signatureStatus ? {
        label: 'Semnat și Valid',
        color: 'success'
      } : {
        label: 'Semnat dar Invalid',
        color: 'error'
      };
    }
    
    return {
      label: 'Netrimis',
      color: 'default'
    };
  };

  const handleViewDialogClose = () => {
    setViewDialog({
      open: false,
      document: null,
      employeeCopy: null
    });
  };

  const handleSelectDocument = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleSelectAllDocuments = (event) => {
    if (event.target.checked) {
      setSelectedDocuments(documents.map(doc => doc._id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/bulk-delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentIds: selectedDocuments })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la ștergerea documentelor');
      }

      const result = await response.json();
      
      // Reîmprospătăm lista de documente de la server
      await fetchDocuments();
      
      setSelectedDocuments([]);
      handleDeleteCancel();
      enqueueSnackbar(`${result.deletedCount} documente au fost șterse cu succes`, { 
        variant: 'success',
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'center'
        },
        autoHideDuration: 5000
      });
    } catch (error) {
      console.error('Error during bulk delete:', error);
      setError(error.message);
      enqueueSnackbar(error.message || 'Eroare la ștergerea documentelor', { 
        variant: 'error',
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'center'
        },
        autoHideDuration: 5000
      });
      
      // Reîmprospătăm oricum lista pentru a ne asigura că este sincronizată
      await fetchDocuments();
    }
  };

  const handleViewDocument = (document, employeeCopy) => {
    console.log('Selected employee copy:', employeeCopy);
    setSelectedDocument({
      ...document,
      employeeCopies: [employeeCopy]
    });
    setViewDialogOpen(true);
  };

  const handleSignatureSelect = (index) => {
    const newSigs = [...uploadData.requiredSignatures];
    const currentSig = newSigs[index];
    
    if (currentSig.required) {
      // Dacă deselectăm, resetăm ordinea și actualizăm restul ordinelor
      const oldOrder = currentSig.order;
      currentSig.required = false;
      currentSig.order = null;
      
      // Actualizăm ordinea pentru restul semnăturilor
      newSigs.forEach(sig => {
        if (sig.order > oldOrder) {
          sig.order -= 1;
        }
      });
    } else {
      // Dacă selectăm, adăugăm următorul număr disponibil
      const maxOrder = Math.max(...newSigs.filter(s => s.required).map(s => s.order || 0), 0);
      currentSig.required = true;
      currentSig.order = maxOrder + 1;
    }
    
    setUploadData({ ...uploadData, requiredSignatures: newSigs });
  };

  // Modificăm funcția de grupare pentru a sorta categoriile
  const groupAndSortDocumentsBySignatureConfig = (docs) => {
    const groups = {};
    
    docs.forEach(doc => {
      let key;
      if (!doc.signatureConfig || doc.signatureConfig.length === 0) {
        key = 'Fără semnături necesare';
      } else {
        key = doc.signatureConfig
          .sort((a, b) => a.order - b.order)
          .map(sig => getRoleName(sig.role))
          .join(' → ');
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(doc);
    });

    // Sortăm categoriile astfel încât "Fără semnături necesare" să fie ultima
    return Object.entries(groups).sort(([keyA], [keyB]) => {
      if (keyA === 'Fără semnături necesare') return 1;
      if (keyB === 'Fără semnături necesare') return -1;
      return keyA.localeCompare(keyB);
    });
  };

  const handleToggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleToggleAllCategories = () => {
    const categories = groupAndSortDocumentsBySignatureConfig(documents).map(([category]) => category);
    const newExpandedState = !allExpanded;
    
    const newExpandedCategories = {};
    categories.forEach(category => {
      newExpandedCategories[category] = newExpandedState;
    });
    
    setExpandedCategories(newExpandedCategories);
    setAllExpanded(newExpandedState);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box sx={{ mb: 2 }}>
        <OrgAdminPageHeader organizationName={organizationName} pageName="Documente" />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDeleteClick}
            disabled={selectedDocuments.length === 0}
          >
            Șterge ({selectedDocuments.length})
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={allExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={handleToggleAllCategories}
          >
            {allExpanded ? 'Restrânge tot' : 'Extinde tot'}
          </Button>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<UploadIcon />}
          onClick={() => setOpenUploadDialog(true)}
          sx={{
            background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
            '&:hover': {
              background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
            }
          }}
        >
          Încarcă Document
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1, py: 0 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 1, py: 0 }}>
          {successMessage}
        </Alert>
      )}

      {groupAndSortDocumentsBySignatureConfig(documents).map(([category, docs]) => (
        <Box key={category} sx={{ mb: 2 }}>
          <Box
            onClick={() => handleToggleCategory(category)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mb: 1,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                borderRadius: 1
              }
            }}
          >
            <IconButton size="small">
              {expandedCategories[category] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography 
              variant="subtitle1"
              sx={{ 
                flex: 1,
                ml: 1,
                pb: 0.5,
                fontWeight: 600,
                borderBottom: '2px solid',
                borderColor: 'primary.main'
              }}
            >
              {category} ({docs.length})
            </Typography>
          </Box>
          
          {expandedCategories[category] && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgb(248, 249, 250)' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        indeterminate={
                          selectedDocuments.length > 0 && 
                          selectedDocuments.length < docs.length &&
                          docs.some(doc => selectedDocuments.includes(doc._id))
                        }
                        checked={
                          docs.length > 0 && 
                          docs.every(doc => selectedDocuments.includes(doc._id))
                        }
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedDocuments(prev => [
                              ...prev,
                              ...docs.map(doc => doc._id).filter(id => !prev.includes(id))
                            ]);
                          } else {
                            setSelectedDocuments(prev => 
                              prev.filter(id => !docs.map(doc => doc._id).includes(id))
                            );
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Titlu</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Nume Fișier</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Mărime</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Data Încărcării</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Status Semnături</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>Acțiuni</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {docs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nu există documente în această categorie
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    docs.map((doc) => (
                      <TableRow key={doc._id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selectedDocuments.includes(doc._id)}
                            onChange={() => handleSelectDocument(doc._id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={doc.title}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 70,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {doc.title}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={doc.originalName}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 70,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {doc.originalName}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</TableCell>
                        <TableCell>
                          {doc.uploadedAt ? 
                            new Date(doc.uploadedAt).toLocaleDateString('ro-RO', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            }) : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {doc.signatureConfig && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 150 }}>
                              {doc.signatureConfig.map((config) => {
                                const employeeCopy = config.role === 'employee' 
                                  ? doc.employeeCopies?.find(copy => copy.employee)
                                  : null;

                                let color;
                                let progress = 0;
                                let statusText = '';

                                if (!employeeCopy) {
                                  color = 'grey.400';
                                  statusText = 'Nesemnat';
                                } else if (employeeCopy.status === 'pending_signature') {
                                  color = '#ff9800';
                                  progress = 50;
                                  statusText = 'În așteptare';
                                } else if (employeeCopy.status === 'signed') {
                                  color = '#4caf50';
                                  progress = 100;
                                  statusText = 'Semnat';
                                }

                                const getIcon = (role) => {
                                  switch (role) {
                                    case 'admin':
                                      return <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />;
                                    case 'collaborator':
                                      return <PersonIcon sx={{ fontSize: 16 }} />;
                                    case 'employee':
                                      return <GroupIcon sx={{ fontSize: 16 }} />;
                                    default:
                                      return null;
                                  }
                                };

                                return (
                                  <Tooltip
                                    key={config.role}
                                    title={`${getRoleName(config.role)} - ${statusText}`}
                                  >
                                    <Box sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center',
                                      gap: 1
                                    }}>
                                      <Box sx={{ 
                                        color: color,
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}>
                                        {getIcon(config.role)}
                                      </Box>
                                      <Box
                                        sx={{
                                          flexGrow: 1,
                                          height: 4,
                                          bgcolor: 'grey.200',
                                          borderRadius: 2,
                                          position: 'relative',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: `${progress}%`,
                                            height: '100%',
                                            bgcolor: color,
                                            position: 'absolute',
                                            transition: 'all 0.3s ease',
                                            borderRadius: 2
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {doc.signatureConfig && doc.signatureConfig.length > 0 && (
                              <>
                                <Tooltip title="Trimite la semnat">
                                  <IconButton 
                                    onClick={() => setSendToSignDialog({ open: true, document: doc })}
                                    color="primary"
                                    size="small"
                                  >
                                    <SendIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Vezi status semnături">
                                  <IconButton 
                                    onClick={() => handleViewStatus(doc)}
                                    color="info"
                                    size="small"
                                  >
                                    <InfoIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="Descarcă">
                              <IconButton 
                                onClick={() => handleDownload(doc)}
                                size="small"
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Șterge">
                              <IconButton 
                                color="error" 
                                onClick={() => setDeleteDialog({ open: true, document: doc })}
                                size="small"
                              >
                                <DeleteIcon fontSize="small" />
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
          )}
        </Box>
      ))}

      <Dialog 
        open={openUploadDialog} 
        onClose={handleCloseUploadDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Încarcă Document</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleUpload} sx={{ mt: 2 }}>
            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {uploadError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Titlu"
              required
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Configurarea ordinii semnăturilor
              </Typography>
              <IconButton
                onClick={() => setInfoDialog(true)}
                size="small"
                sx={{ ml: 1 }}
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              {uploadData.requiredSignatures.map((sig, index) => (
                <Box 
                  key={sig.role} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: sig.required ? 'primary.50' : 'grey.50',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {sig.required && sig.order && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          minWidth: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5,
                          fontSize: '0.875rem'
                        }}
                      >
                        {sig.order}
                      </Typography>
                    )}
                    <Typography variant="body1">
                      {sig.role === 'admin' && 'Administrator'}
                      {sig.role === 'collaborator' && 'Colaborator'}
                      {sig.role === 'employee' && 'Angajați'}
                    </Typography>
                  </Box>
                  <Checkbox
                    checked={sig.required}
                    onChange={() => handleSignatureSelect(index)}
                    color="primary"
                  />
                </Box>
              ))}
            </Box>

            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-input"
                accept=".pdf,application/pdf"
              />
              <label htmlFor="file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {uploadData.file ? uploadData.file.name : 'Selectează Fișier PDF'}
                </Button>
              </label>
              {!uploadData.file && (
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  Doar fișiere PDF sunt acceptate
                </Typography>
              )}
              {uploadData.file && (
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  Mărime: {(uploadData.file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseUploadDialog}>Anulează</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained"
            disabled={!uploadData.file || !uploadData.title}
          >
            Încarcă
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>
          {deleteDialog.isBulk ? 'Confirmare ștergere în masă' : 'Confirmare ștergere'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteDialog.isBulk ? (
              <>
                Sunteți sigur că doriți să ștergeți {selectedDocuments.length} documente?
                <br />
                <strong>Atenție:</strong> Această acțiune va șterge și documentele semnate, precum și toate copiile acestora de la angajați.
              </>
            ) : (
              <>
                Sunteți sigur că doriți să ștergeți documentul "{deleteDialog.document?.title}"?
                <br />
                <strong>Atenție:</strong> Această acțiune va șterge și documentul semnat, precum și toate copiile acestuia de la angajați.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Anulează</Button>
          <Button
            onClick={() => deleteDialog.isBulk ? handleBulkDelete() : handleDelete(deleteDialog.document._id)}
            color="error"
            variant="contained"
          >
            Șterge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={signDialog.open}
        onClose={handleSignDialogClose}
      >
        <DialogTitle>Confirmare trimitere la semnat</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să trimiteți documentul "{signDialog.document?.title}" spre semnare?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSignDialogClose}>Anulează</Button>
          <Button
            onClick={handleSendToSignConfirm}
            variant="contained"
            color="primary"
          >
            Trimite
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={sendToSignDialog.open}
        onClose={() => setSendToSignDialog({ open: false, document: null })}
      >
        <DialogTitle>Confirmare trimitere la semnat</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să trimiteți documentul "{sendToSignDialog.document?.title}" spre semnare?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Email-urile vor fi trimise doar către angajații care au acest document asociat.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendToSignDialog({ open: false, document: null })}>
            Anulează
          </Button>
          <Button
            onClick={() => handleSendToSign(sendToSignDialog.document?._id)}
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
          >
            Trimite
          </Button>
        </DialogActions>
      </Dialog>

      <SignatureStatusDialog
        open={statusDialog.open}
        document={statusDialog.document}
        onClose={handleStatusDialogClose}
        onVerifyClick={handleVerifyClick}
        onViewDocument={handleViewDocument}
      />

      <Dialog 
        open={verifyDialog.open} 
        onClose={() => setVerifyDialog({ open: false, document: null, employeeCopy: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Verificare Semnătură Electronică
        </DialogTitle>
        <DialogContent>
          {verificationResult ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                {verificationResult.isValid ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                    <VerifiedUserIcon sx={{ mr: 1 }} />
                    Semnătură Validă
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                    <ErrorIcon sx={{ mr: 1 }} />
                    Semnătură Invalidă
                  </Box>
                )}
              </Typography>
              
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Detalii Semnătură:
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Semnatar"
                    secondary={verificationResult.employeeName}
                  />
                </ListItem>
                {verificationResult.employeeEmail && (
                  <ListItem>
                    <ListItemText 
                      primary="Email"
                      secondary={verificationResult.employeeEmail}
                    />
                  </ListItem>
                )}
                {verificationResult.organizationName && (
                  <ListItem>
                    <ListItemText 
                      primary="Organizație"
                      secondary={verificationResult.organizationName}
                    />
                  </ListItem>
                )}
                {verificationResult.signedAt && (
                  <ListItem>
                    <ListItemText 
                      primary="Data Semnării"
                      secondary={new Date(verificationResult.signedAt).toLocaleString('ro-RO')}
                    />
                  </ListItem>
                )}
                {verificationResult.signatureTimestamp && verificationResult.signatureTimestamp !== verificationResult.signedAt && (
                  <ListItem>
                    <ListItemText 
                      primary="Timestamp Semnătură"
                      secondary={new Date(verificationResult.signatureTimestamp).toLocaleString('ro-RO')}
                    />
                  </ListItem>
                )}
                {verificationResult.documentHash && (
                  <ListItem>
                    <ListItemText 
                      primary="Hash Document"
                      secondary={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            wordBreak: 'break-all'
                          }}
                        >
                          {verificationResult.documentHash}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>

              {!verificationResult.isValid && verificationResult.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {verificationResult.error}
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setVerifyDialog({ open: false, document: null, employeeCopy: null });
              setVerificationResult(null);
            }}
          >
            Închide
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewDialog.open}
        onClose={handleViewDialogClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {viewDialog.document?.title}
        </DialogTitle>
        <DialogContent>
          {viewDialog.document ? (
            viewDialog.document.employeeCopies?.filter(copy => copy.status === 'signed').length > 0 ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Semnături disponibile:
                </Typography>
                <List>
                  {viewDialog.document.employeeCopies
                    .filter(copy => copy.status === 'signed')
                    .map((copy, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <Button
                            variant="outlined"
                            onClick={() => {
                              console.log('Selected employee copy:', copy);
                              setViewDialog(prev => ({
                                ...prev,
                                employeeCopy: {
                                  employee: copy.employee,
                                  employeeName: copy.employeeName,
                                  signature: {
                                    _id: copy._id,
                                    digitalSignature: copy.digitalSignature,
                                    documentHash: copy.documentHash,
                                    publicKey: copy.publicKey,
                                    signedAt: copy.signedAt,
                                    signatureTimestamp: copy.signatureTimestamp
                                  }
                                }
                              }));
                            }}
                          >
                            Vezi document
                          </Button>
                        }
                      >
                        <ListItemText
                          primary={copy.employeeName}
                          secondary={`Semnat la: ${new Date(copy.signedAt).toLocaleString('ro-RO')}`}
                        />
                      </ListItem>
                    ))}
                </List>
                {viewDialog.employeeCopy && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Document semnat de {viewDialog.employeeCopy.employeeName}:
                    </Typography>
                    <DocumentViewer 
                      document={viewDialog.document}
                      employeeCopy={viewDialog.employeeCopy}
                    />
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info">
                Acest document nu are încă semnături.
              </Alert>
            )
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          {viewDialog.employeeCopy && (
            <Button 
              onClick={() => setViewDialog(prev => ({ ...prev, employeeCopy: null }))}
              sx={{ mr: 'auto' }}
            >
              Înapoi la lista de semnături
            </Button>
          )}
          <Button onClick={handleViewDialogClose}>Închide</Button>
        </DialogActions>
      </Dialog>

      <DocumentViewer
        document={selectedDocument}
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedDocument(null);
        }}
      />

      <Dialog
        open={infoDialog}
        onClose={() => setInfoDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle>Cum funcționează semnăturile</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Acest sistem permite configurarea ordinii în care documentul trebuie semnat:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CircleIcon sx={{ fontSize: 8 }} />
              </ListItemIcon>
              <ListItemText 
                primary="Selectare roluri" 
                secondary="Bifați rolurile care trebuie să semneze documentul" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CircleIcon sx={{ fontSize: 8 }} />
              </ListItemIcon>
              <ListItemText 
                primary="Ordine automată" 
                secondary="Ordinea este stabilită automat în funcție de selecție (1, 2, 3...)" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CircleIcon sx={{ fontSize: 8 }} />
              </ListItemIcon>
              <ListItemText 
                primary="Semnare secvențială" 
                secondary="Documentul va trebui semnat în ordinea stabilită, de la 1 la ultimul număr" 
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialog(false)}>Am înțeles</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentManagement; 