const nodemailer = require('nodemailer');

let transporter;

const initializeTransporter = async () => {
  if (process.env.NODE_ENV === 'production') {
    // Configurare Gmail SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true pentru 465, false pentru alte porturi
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // necesar pentru unele configurații
      }
    });

    // Verifică conexiunea
    try {
      await transporter.verify();
      console.log('Server SMTP conectat cu succes');
    } catch (error) {
      console.error('Eroare la conectarea la SMTP:', error);
      throw error;
    }
  } else {
    // Păstrăm Ethereal pentru development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 secundă

const sendEmailWithRetry = async (mailOptions, retryCount = 0) => {
  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Eroare la trimiterea email-ului (încercarea ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Reîncerc trimiterea email-ului în ${RETRY_DELAY/1000} secunde...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return sendEmailWithRetry(mailOptions, retryCount + 1);
    }
    throw error;
  }
};

exports.sendWelcomeEmail = async ({ to, organizationName, password }) => {
  if (!transporter) {
    await initializeTransporter();
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"SmartDoc" <noreply@smartdoc.com>',
    to,
    subject: 'Cont creat în aplicația SmartDoc',
    html: `
      <h2>Bun venit în aplicația SmartDoc!</h2>
      <p>A fost creat un cont pentru organizația "${organizationName}".</p>
      <p>Puteți accesa aplicația folosind următoarele credențiale:</p>
      <p><strong>Email:</strong> ${to}</p>
      <p><strong>Parolă:</strong> ${password}</p>
      <p>Accesați aplicația la: ${process.env.FRONTEND_URL}</p>
    `
  };

  return await transporter.sendMail(mailOptions);
};

exports.sendPasswordResetEmail = async ({ to, organizationName, password }) => {
  if (!transporter) {
    await initializeTransporter();
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"SmartDoc" <noreply@smartdoc.com>',
    to,
    subject: `Resetare parolă - ${organizationName}`,
    html: `
      <h2>Resetare parolă SmartDoc</h2>
      <p>Parola dumneavoastră pentru organizația <strong>${organizationName}</strong> a fost resetată.</p>
      <p>Noua parolă este: <strong>${password}</strong></p>
      <p>Vă recomandăm să schimbați această parolă după autentificare.</p>
      <p>Accesați aplicația la: ${process.env.FRONTEND_URL}</p>
    `
  };

  return await sendEmailWithRetry(mailOptions);
}; 