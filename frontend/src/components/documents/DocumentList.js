import React, { useEffect, useState } from 'react';
import { TableCell } from '@mui/material';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.log('Documents received in frontend:', data);
        console.log('Sample document:', data[0]);
        console.log('Sample document date:', data[0]?.uploadedAt);
        setDocuments(data);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  return (
    <TableCell>
      {console.log('Rendering date for doc:', doc)}
      {doc.uploadedAt ? 
        new Date(doc.uploadedAt).toLocaleDateString('ro-RO') : 
        doc.createdAt ? 
          new Date(doc.createdAt).toLocaleDateString('ro-RO') : 
          'N/A'
      }
    </TableCell>
  );
};

export default DocumentList; 