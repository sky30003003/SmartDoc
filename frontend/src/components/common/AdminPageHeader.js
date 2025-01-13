import React from 'react';
import { Typography, Box, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const AdminPageHeader = ({ pageName, action }) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
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
          {pageName && (
            <>
              <Typography 
                component="span" 
                sx={{ 
                  color: 'text.secondary',
                  mx: 1
                }}
              >
                ::
              </Typography>
              {pageName}
            </>
          )}
        </Typography>
      </Box>
      {action}
    </Box>
  );
};

export default AdminPageHeader; 