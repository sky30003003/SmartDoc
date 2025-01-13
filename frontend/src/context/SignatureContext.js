import React, { createContext, useContext, useState } from 'react';

const SignatureContext = createContext();

export const SignatureProvider = ({ children }) => {
  const [signatureStatuses, setSignatureStatuses] = useState({});
  const [verificationResults, setVerificationResults] = useState({});
  const token = localStorage.getItem('token');

  const verifySignature = async (documentId, employeeId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/verify/${employeeId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Eroare la verificarea semnăturii');
      }

      // Actualizăm statusul și rezultatul verificării
      const verificationData = {
        isValid: result.isValid,
        details: result.details,
        error: result.error || result.message,
        timestamp: new Date().toISOString()
      };

      setSignatureStatuses(prev => ({
        ...prev,
        [`${documentId}_${employeeId}`]: result.isValid
      }));

      setVerificationResults(prev => ({
        ...prev,
        [`${documentId}_${employeeId}`]: verificationData
      }));

      return {
        ...result,
        ...verificationData
      };
    } catch (error) {
      const errorData = {
        isValid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      setSignatureStatuses(prev => ({
        ...prev,
        [`${documentId}_${employeeId}`]: false
      }));

      setVerificationResults(prev => ({
        ...prev,
        [`${documentId}_${employeeId}`]: errorData
      }));

      throw error;
    }
  };

  const getSignatureStatus = (documentId, employeeId) => {
    return signatureStatuses[`${documentId}_${employeeId}`];
  };

  const getVerificationResult = (documentId, employeeId) => {
    return verificationResults[`${documentId}_${employeeId}`];
  };

  const clearVerificationData = () => {
    setSignatureStatuses({});
    setVerificationResults({});
  };

  return (
    <SignatureContext.Provider value={{
      verifySignature,
      getSignatureStatus,
      getVerificationResult,
      clearVerificationData
    }}>
      {children}
    </SignatureContext.Provider>
  );
};

export const useSignature = () => useContext(SignatureContext); 