import React from 'react';
import { Container, Grid, Box } from '@mui/material';
import SignatureSettings from '../components/settings/SignatureSettings';
import OrgAdminPageHeader from '../components/common/OrgAdminPageHeader';
import { useAuth } from '../context/AuthContext';

const OrganizationSettings = () => {
  const { organizationName } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <OrgAdminPageHeader organizationName={organizationName} pageName="Setări Organizație" />
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SignatureSettings />
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrganizationSettings; 