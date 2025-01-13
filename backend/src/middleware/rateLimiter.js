const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 5, // Limită de 5 încercări
  handler: (req, res) => {
    res.status(429).json({
      message: "Prea multe încercări de autentificare. Vă rugăm să încercați din nou după 15 minute."
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = loginLimiter; 