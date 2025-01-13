const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationCode(email, code) {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Cod de verificare SmartDoc',
      html: `
        <h2>Cod de verificare SmartDoc</h2>
        <p>Codul tău de verificare este:</p>
        <h1>${code}</h1>
        <p>Acest cod expiră în 5 minute.</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService(); 