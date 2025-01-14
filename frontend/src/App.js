import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import Login from './components/auth/Login';
import NavBar from './components/layout/NavBar';
import Layout from './components/layout/Layout';
import EmployeeManagement from './components/employees/EmployeeManagement';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import OrgAdminRoute from './components/auth/OrgAdminRoute';
import DocumentManagement from './components/documents/DocumentManagement';
import CollaboratorManagement from './components/collaborators/CollaboratorManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import CreateOrganization from './components/organizations/CreateOrganization';
import OrganizationList from './components/organizations/OrganizationList';
import EditOrganization from './components/organizations/EditOrganization';
import ViewOrganization from './components/organizations/ViewOrganization';
import OrgAdminDashboard from './components/dashboard/OrgAdminDashboard';
import AdminDocumentList from './components/admin/AdminDocumentList';
import AdminEmployeeList from './components/admin/AdminEmployeeList';
import AdminCollaboratorList from './components/admin/AdminCollaboratorList';
import ViewEmployee from './components/employees/ViewEmployee';
import EditEmployee from './components/employees/EditEmployee';
import SignDocument from './components/documents/SignDocument';
import { SignatureProvider } from './context/SignatureContext';
import DigitalSignatureInfo from './components/info/DigitalSignatureInfo';
import PublicVerification from './components/verification/PublicVerification';
import OrganizationSettings from './pages/OrganizationSettings';
import { SnackbarProvider } from 'notistack';

const DefaultRoute = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  console.log('Current user role:', currentUser.role);

  // Verificăm rolul și redirecționăm corespunzător
  if (currentUser.role === 'org_admin') {
    return <Navigate to="/org-admin" />;
  }

  if (currentUser.role === 'admin') {
    return <Navigate to="/dashboard" />;
  }

  // Dacă nu are un rol valid
  return <Navigate to="/unauthorized" />;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <div className="App">
          <AuthProvider>
            <SignatureProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/sign-document/:documentId/:employeeId" element={<SignDocument />} />
                  <Route path="/verify/:documentId/:signatureId" element={<PublicVerification />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<DefaultRoute />} />
                            <Route 
                              path="/dashboard" 
                              element={
                                <AdminRoute>
                                  <AdminDashboard />
                                </AdminRoute>
                              } 
                            />
                            <Route 
                              path="/employees" 
                              element={
                                <OrgAdminRoute>
                                  <EmployeeManagement />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/collaborators" 
                              element={
                                <OrgAdminRoute>
                                  <CollaboratorManagement />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/documents" 
                              element={
                                <OrgAdminRoute>
                                  <DocumentManagement />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/organizations/new" 
                              element={
                                <AdminRoute>
                                  <CreateOrganization />
                                </AdminRoute>
                              } 
                            />
                            <Route 
                              path="/organizations/:id/edit" 
                              element={
                                <AdminRoute>
                                  <EditOrganization />
                                </AdminRoute>
                              } 
                            />
                            <Route 
                              path="/organizations" 
                              element={
                                <AdminRoute>
                                  <OrganizationList />
                                </AdminRoute>
                              } 
                            />
                            <Route 
                              path="/organizations/:id" 
                              element={
                                <AdminRoute>
                                  <ViewOrganization />
                                </AdminRoute>
                              } 
                            />
                            <Route 
                              path="/org-admin" 
                              element={
                                <OrgAdminRoute>
                                  <OrgAdminDashboard />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/org-admin/documents" 
                              element={
                                <OrgAdminRoute>
                                  <DocumentManagement />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/org-admin/employees" 
                              element={
                                <OrgAdminRoute>
                                  <EmployeeManagement />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/org-admin/employees/:id" 
                              element={
                                <OrgAdminRoute>
                                  <ViewEmployee />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/org-admin/employees/:id/edit" 
                              element={
                                <OrgAdminRoute>
                                  <EditEmployee />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/org-admin/collaborators" 
                              element={
                                <OrgAdminRoute>
                                  <CollaboratorManagement />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/org-admin/settings" 
                              element={
                                <OrgAdminRoute>
                                  <OrganizationSettings />
                                </OrgAdminRoute>
                              } 
                            />
                            <Route 
                              path="/admin/documents" 
                              element={
                                <AdminRoute>
                                  <AdminDocumentList />
                                </AdminRoute>
                              } 
                            />
                            <Route 
                              path="/admin/employees" 
                              element={
                                <AdminRoute>
                                  <AdminEmployeeList />
                                </AdminRoute>
                              } 
                            />
                            <Route 
                              path="/admin/collaborators" 
                              element={
                                <AdminRoute>
                                  <AdminCollaboratorList />
                                </AdminRoute>
                              } 
                            />
                            <Route path="/admin/digital-signature-info" element={<DigitalSignatureInfo />} />
                          </Routes>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </SignatureProvider>
          </AuthProvider>
        </div>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App; 