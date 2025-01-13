import React from 'react';
import { Box, Container } from '@mui/material';
import NavBar from './NavBar';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <NavBar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '75px',
          minHeight: '100vh',
          px: 0,
          backgroundColor: '#f8f9fa'
        }}
      >
        <Container 
          maxWidth="lg" 
          sx={{ 
            py: 3,
            px: 0
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 