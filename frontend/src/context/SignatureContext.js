import React, { createContext, useContext, useState } from 'react';

const SignatureContext = createContext();

export const SignatureProvider = ({ children }) => {
  const [signatureStatuses, setSignatureStatuses] = useState({});
  const [verificationResults, setVerificationResults] = useState({});
  const token = localStorage.getItem('token');

  const verifySignature = async (documentId, signatureId) => {
    try {
      console.log('Verifying signature:', { documentId, signatureId });
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/verify/${signatureId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = await response.json();
      console.log('Verification result:', result);
      
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
        [`${documentId}_${signatureId}`]: result.isValid
      }));

      setVerificationResults(prev => ({
        ...prev,
        [`${documentId}_${signatureId}`]: verificationData
      }));

      return {
        ...result,
        ...verificationData
      };
    } catch (error) {
      console.error('Verification error:', error);
      const errorData = {
        isValid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      setSignatureStatuses(prev => ({
        ...prev,
        [`${documentId}_${signatureId}`]: false
      }));

      setVerificationResults(prev => ({
        ...prev,
        [`${documentId}_${signatureId}`]: errorData
      }));

      throw error;
    }
  };

  const getSignatureStatus = (documentId, signatureId) => {
    return signatureStatuses[`${documentId}_${signatureId}`];
  };

  const getVerificationResult = (documentId, signatureId) => {
    return verificationResults[`${documentId}_${signatureId}`];
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