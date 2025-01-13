import React from 'react';
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const CustomSnackbar = ({ open, onClose, message, severity, details }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success': return <SuccessIcon color="success" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      default: return <InfoIcon color="info" />;
    }
  };

  return (
    <Snackbar
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ maxWidth: '500px' }}
    >
      <Alert 
        severity={severity}
        onClose={onClose}
        sx={{ width: '100%' }}
      >
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {message}
          </Typography>
          {details && (
            <List dense sx={{ mt: 1, bgcolor: 'background.paper' }}>
              {details.map((detail, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getIcon(detail.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={detail.message}
                    primaryTypographyProps={{
                      variant: 'body2',
                      style: { whiteSpace: 'normal' }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default CustomSnackbar; 