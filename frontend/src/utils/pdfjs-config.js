import { pdfjs } from 'react-pdf';

// Setăm sursa worker-ului PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default pdfjs; 