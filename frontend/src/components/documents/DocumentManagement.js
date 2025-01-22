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
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon,
  LinearProgress,
  FormControlLabel
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Info as InfoIcon,
  Circle as CircleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  RotateRight as RotateRightIcon,
  DoneAll as DoneAllIcon,
  VerifiedUser as VerifiedUserIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import OrgAdminPageHeader from '../common/OrgAdminPageHeader';
import { useAuth } from '../../context/AuthContext';
import { useSignature } from '../../context/SignatureContext';
import SignatureStatusDialog from './SignatureStatusDialog';
import DocumentViewer from './DocumentViewer';

const DocumentManagement = () => {
  const { currentUser, organizationName, token } = useAuth();
  const { verifySignature } = useSignature();
  const { enqueueSnackbar } = useSnackbar();
  const [documents, setDocuments] = useState([]);
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
      { role: 'org_admin', order: 1, required: false },
      { role: 'collaborator', order: 2, required: false },
      { role: 'employee', order: 3, required: false }
    ]
  });
  const [sendToSignDialog, setSendToSignDialog] = useState({
    open: false,
    document: null
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [statusDialog, setStatusDialog] = useState({ open: false, document: null });
  const [verifyDialog, setVerifyDialog] = useState({ open: false, document: null });
  const [verificationResult, setVerificationResult] = useState(null);
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
  const [adminSignDialog, setAdminSignDialog] = useState({
    open: false,
    document: null
  });

  // Helper function to get role name
  const getRoleName = (role) => {
    switch (role) {
      case 'org_admin':
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
    if (!token) {
      console.error('No authentication token available');
      setError('Nu sunteți autentificat');
      return;
    }
    fetchDocuments();
  }, [token]);

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
      if (!token) {
        throw new Error('Nu sunteți autentificat');
      }

      console.log('Fetching documents with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        throw new Error('Sesiunea a expirat. Vă rugăm să vă autentificați din nou.');
      }

      if (response.status === 403) {
        throw new Error('Nu aveți permisiunea de a accesa documentele');
      }

      if (!response.ok) {
        throw new Error('Eroare la obținerea documentelor');
      }

      const data = await response.json();
      console.log('Documents fetched successfully:', data);
      setError(null);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error.message);
      setDocuments([]);
      enqueueSnackbar(error.message, { variant: 'error' });
      
      if (error.message.includes('Sesiunea a expirat')) {
        // Redirecționăm către pagina de login
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    setUploadError(null);
    setUploadData({ title: '', file: null, requiredSignatures: [
      { role: 'org_admin', order: 1, required: false },
      { role: 'collaborator', order: 2, required: false },
      { role: 'employee', order: 3, required: false }
    ] });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      setUploadError('Vă rugăm să selectați un fișier');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('title', uploadData.title);
    
    // Adăugăm doar semnăturile care sunt marcate ca necesare și le sortăm după ordine
    const requiredSignatures = uploadData.requiredSignatures
      .filter(sig => sig.required)
      .sort((a, b) => a.order - b.order)
      .map(sig => ({
        role: sig.role,
        order: sig.order
      }));
    
    // Verificăm dacă avem cel puțin o semnătură configurată
    if (requiredSignatures.length === 0) {
      setUploadError('Vă rugăm să selectați cel puțin o semnătură necesară');
      return;
    }
    
    console.log('Sending signature config:', JSON.stringify(requiredSignatures));
    formData.append('signatureConfig', JSON.stringify(requiredSignatures));

    try {
      console.log('Uploading document with token:', token ? 'Token exists' : 'No token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Nu setăm Content-Type pentru că FormData setează automat cu boundary corect
        },
        body: formData
      });

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Server response:', text);
        throw new Error('Răspuns neașteptat de la server');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la încărcarea documentului');
      }

      enqueueSnackbar('Document încărcat cu succes', { variant: 'success' });
      handleCloseUploadDialog();
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message);
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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${doc._id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Eroare la descărcarea documentului');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      enqueueSnackbar('Document descărcat cu succes', { variant: 'success' });
    } catch (error) {
      console.error('Error downloading document:', error);
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  const handleSendToSign = async (documentId) => {
    // Verificăm dacă documentul există în state
    const document = documents.find(doc => doc._id === documentId);
    if (!document) {
      enqueueSnackbar('Document negăsit', { variant: 'error' });
      return;
    }

    // Verificăm dacă este cazul special pentru admin
    const isFirstSignerAdmin = document.signatureConfig?.[0]?.role === 'org_admin';
    const isFirstStep = !document.signatureProgress?.currentStep || document.signatureProgress.currentStep === 0;

    if (isFirstSignerAdmin && isFirstStep && currentUser.role === 'org_admin') {
      // Dacă admin e primul, deschidem dialogul de semnare
      setAdminSignDialog({
        open: true,
        document
      });
      setSendToSignDialog({ open: false, document: null });
      return;
    }

    // Verificăm dacă documentul are semnături configurate
    if (!document.signatureConfig || document.signatureConfig.length === 0) {
      enqueueSnackbar('Documentul nu are configurate semnături', { variant: 'error' });
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/${documentId}/send-to-sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la trimiterea documentului spre semnare');
      }

      const result = await response.json();
      
      if (result.sentCount === 0) {
        enqueueSnackbar('Nu există semnatari disponibili pentru acest document', { variant: 'warning' });
      } else {
        setSuccessMessage(`Documentul a fost trimis spre semnare la ${result.sentCount} angajați`);
      }
      
      setSendToSignDialog({ open: false, document: null });
      await fetchDocuments();

    } catch (error) {
      console.error('Error sending document to sign:', error);
      enqueueSnackbar(
        error.message || 'Eroare la trimiterea documentului spre semnare. Verificați dacă aveți drepturile necesare.', 
        { variant: 'error' }
      );
    }
  };

  const handleSignDialogClose = () => {
    setSignDialog({
      open: false,
      document: null
    });
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

  const handleBulkDelete = async () => {
    try {
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
      await fetchDocuments();
      setSelectedDocuments([]);
      handleDeleteCancel();
      enqueueSnackbar(`${result.deletedCount} documente au fost șterse cu succes`, { 
        variant: 'success'
      });
    } catch (error) {
      console.error('Error during bulk delete:', error);
      enqueueSnackbar(error.message || 'Eroare la ștergerea documentelor', { 
        variant: 'error'
      });
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
        const signatureSequence = doc.signatureConfig
          .sort((a, b) => a.order - b.order)
          .map(sig => getRoleName(sig.role))
          .join(' → ');
        key = `Secvența semnăturilor: ${signatureSequence}`;
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

  const SignatureProgressIndicator = ({ document }) => {
    const totalSteps = document.signatureProgress?.totalSteps || 0;
    const currentStep = document.signatureProgress?.currentStep || 0;
    const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    return (
      <Box sx={{ width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Progres semnături: {currentStep} din {totalSteps}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress)}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress}
          sx={{ 
            height: 8,
            borderRadius: 4,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              bgcolor: progress === 100 ? 'success.main' : 'primary.main'
            }
          }}
        />
      </Box>
    );
  };

  const SignatureStatus = ({ config, completedSignatures }) => {
    const isCompleted = completedSignatures?.some(sig => sig.role === config.role);
    const signature = completedSignatures?.find(sig => sig.role === config.role);

    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderRadius: 1,
        bgcolor: isCompleted ? 'success.light' : 'grey.100'
      }}>
        {config.role === 'org_admin' && <AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
        {config.role === 'collaborator' && <PersonIcon sx={{ fontSize: 20 }} />}
        {config.role === 'employee' && <GroupIcon sx={{ fontSize: 20 }} />}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2">
            {getRoleName(config.role)}
            {isCompleted && (
              <Typography 
                component="span" 
                variant="caption" 
                sx={{ ml: 1, color: 'text.secondary' }}
              >
                (Semnat la {new Date(signature.signedAt).toLocaleString('ro-RO')})
              </Typography>
            )}
          </Typography>
        </Box>
        {isCompleted ? (
          <CheckCircleIcon sx={{ color: 'success.main' }} />
        ) : (
          <CircleIcon sx={{ color: 'grey.400' }} />
        )}
      </Box>
    );
  };

  // Adăugăm componenta pentru iconița de semnare
  const SignatureActionIcon = ({ document }) => {
    const hasSignatures = document.signatureProgress?.hasSignatures || false;
    const isFullySigned = document.signatureProgress?.isFullySigned || false;
    const canBeSentForSignature = document.signatureProgress?.canBeSentForSignature || false;
    const status = document.signatureProgress?.status || 'pending';
    
    console.log('SignatureActionIcon state:', {
      documentId: document._id,
      hasSignatures,
      isFullySigned,
      canBeSentForSignature,
      status
    });
    
    const getTooltipText = () => {
      if (isFullySigned) {
        return 'Toate semnăturile au fost colectate';
      }
      if (hasSignatures) {
        return 'Proces de semnare în curs';
      }
      return 'Trimite la semnat';
    };

    // Nu afișăm iconița dacă documentul nu are configurație de semnături
    if (!document.signatureConfig || document.signatureConfig.length === 0) {
      return null;
    }

    const IconComponent = isFullySigned ? DoneAllIcon : hasSignatures ? RotateRightIcon : SendIcon;

    return (
      <Tooltip title={getTooltipText()}>
        <span>
          <IconButton 
            onClick={canBeSentForSignature ? () => handleSignClick(document) : undefined}
            color={isFullySigned ? "success" : "primary"}
            size="small"
            disabled={!canBeSentForSignature || hasSignatures || isFullySigned}
            sx={{
              animation: hasSignatures && !isFullySigned ? 'pulse 1.5s ease-in-out infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                },
                '50%': {
                  transform: 'scale(0.9)',
                },
                '100%': {
                  transform: 'scale(1)',
                },
              }
            }}
          >
            <IconComponent 
              fontSize="small"
              sx={{
                color: isFullySigned ? 'success.main' : hasSignatures ? 'primary.main' : 'inherit',
                animation: hasSignatures && !isFullySigned ? 'spin 1.5s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': {
                    transform: 'rotate(0deg)',
                  },
                  '100%': {
                    transform: 'rotate(360deg)',
                  },
                }
              }}
            />
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  const AdminSignatureDialog = ({ open, document, onClose, onSign }) => {
    const handleSign = () => {
      // Use organization settings instead of dialog options
      onSign({
        printDigitalSignature: true,  // These will be overridden by org settings
        includeQRCode: true
      });
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Confirmare Trimitere la Semnat</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Sunteți sigur că doriți să trimiteți acest document la semnat? Această acțiune va iniția procesul de semnare electronică conform configurației organizației.
          </Typography>
          <DocumentViewer document={document} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Anulează</Button>
          <Button 
            onClick={handleSign}
            variant="contained"
            color="primary"
          >
            Confirmă și Trimite
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const handleSignClick = async (document) => {
    // Verificăm dacă primul semnatar este admin și dacă suntem la primul pas
    const isFirstSignerAdmin = document.signatureConfig?.[0]?.role === 'org_admin';
    const isFirstStep = !document.signatureProgress?.currentStep || document.signatureProgress.currentStep === 0;

    if (isFirstSignerAdmin && isFirstStep && currentUser.role === 'org_admin') {
      // Deschidem direct dialogul de semnare pentru admin
      setAdminSignDialog({
        open: true,
        document
      });
    } else {
      // Pentru celelalte cazuri, deschidem dialogul de confirmare
      setSendToSignDialog({
        open: true,
        document
      });
    }
  };

  const handleCloseAdminSignDialog = () => {
    setAdminSignDialog({
      open: false,
      document: null
    });
  };

  const handleAdminSign = async (printOptions) => {
    try {
      console.log('Sending admin signature request with options:', printOptions);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${adminSignDialog.document._id}/sign-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ printOptions })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Eroare la semnarea documentului');
      }

      const result = await response.json();
      console.log('Admin signature response:', result);
      enqueueSnackbar('Document semnat cu succes', { variant: 'success' });
      
      // Actualizăm lista de documente și închidem dialogul
      await fetchDocuments();
      handleCloseAdminSignDialog();
    } catch (error) {
      console.error('Error signing document as admin:', error);
      enqueueSnackbar(error.message || 'Eroare la semnarea documentului', { 
        variant: 'error' 
      });
    }
  };

  const SignatureVerificationDialog = ({ open, onClose, result }) => {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>
          Rezultatul Verificării
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {result?.isValid ? (
              <CheckCircleIcon color="success" />
            ) : (
              <ErrorIcon color="error" />
            )}
            <Typography>
              {result?.isValid ? 'Semnătură validă' : 'Semnătură invalidă'}
            </Typography>
          </Box>
          {result?.details && (
            <Typography variant="body2" color="text.secondary">
              {result.details}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Închide</Button>
        </DialogActions>
      </Dialog>
    );
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

      {documents.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nu există documente. Folosiți butonul "Încarcă Document" pentru a adăuga documente noi.
          </Typography>
        </Paper>
      ) : (
        groupAndSortDocumentsBySignatureConfig(documents).map(([category, docs]) => (
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
                          <TableCell>
                            {doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                          </TableCell>
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
                            {doc.signatureConfig && doc.signatureConfig.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}>
                                <SignatureProgressIndicator document={doc} />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {doc.signatureConfig
                                    .sort((a, b) => a.order - b.order)
                                    .map((config, index) => (
                                      <SignatureStatus 
                                        key={`${config.role}-${index}`}
                                        config={config}
                                        completedSignatures={doc.signatureProgress?.completedSignatures}
                                      />
                                    ))
                                  }
                                </Box>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Nu necesită semnături
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <SignatureActionIcon document={doc} />
                              {doc.signatureConfig && doc.signatureConfig.length > 0 && (
                                <Tooltip title="Vezi status semnături">
                                  <IconButton 
                                    onClick={() => handleViewStatus(doc)}
                                    color="info"
                                    size="small"
                                  >
                                    <InfoIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
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
        ))
      )}

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
                      {sig.role === 'org_admin' && 'Admin (utilizator curent)'}
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
            onClick={handleSendToSign}
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
        <DialogTitle>Inițiere proces de semnare</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să inițiați procesul de semnare pentru documentul "{sendToSignDialog.document?.title}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ordinea semnăturilor:
            {sendToSignDialog.document?.signatureConfig
              .sort((a, b) => a.order - b.order)
              .map(sig => getRoleName(sig.role))
              .join(' → ')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Procesul de semnare va urma strict această ordine, iar fiecare semnatar va fi notificat când îi vine rândul.
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
            Inițiază semnarea
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
        onClose={() => setVerifyDialog({ open: false, document: null })}
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
              setVerifyDialog({ open: false, document: null });
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

      <AdminSignatureDialog
        open={adminSignDialog.open}
        document={adminSignDialog.document}
        onClose={handleCloseAdminSignDialog}
        onSign={handleAdminSign}
      />
    </Container>
  );
};

export default DocumentManagement; 