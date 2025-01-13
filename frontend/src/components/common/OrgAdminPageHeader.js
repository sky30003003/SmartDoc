import React from 'react';
import { Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const OrgAdminPageHeader = ({ organizationName, pageName }) => {
  return (
    <Box>
      <Breadcrumbs 
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 1,
            color: 'text.secondary'
          }
        }}
      >
        <Link
          component={RouterLink}
          to="/org-admin"
          color="inherit"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'primary.main',
            '&:hover': {
              color: 'primary.dark'
            }
          }}
        >
          {organizationName}
        </Link>
        <Typography 
          color="text.primary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'text.primary'
          }}
        >
          {pageName}
        </Typography>
      </Breadcrumbs>
    </Box>
  );
};

export default OrgAdminPageHeader; 