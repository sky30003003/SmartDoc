const { body, validationResult } = require('express-validator');

const validateEmployee = [
  body('firstName').trim().escape(),
  body('lastName').trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateDocument = [
  body('title').trim().escape(),
  body('description').trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateCollaborator = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Prenumele este obligatoriu')
    .escape(),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Numele este obligatoriu')
    .escape(),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Adresa de email nu este validă')
    .normalizeEmail(),
  body('phone')
    .trim()
    .optional({ nullable: true })
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Numărul de telefon nu este valid')
    .escape(),
  body('company')
    .trim()
    .optional({ nullable: true })
    .escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({ 
        errors: errors.array(),
        message: firstError.msg
      });
    }
    next();
  }
];

module.exports = { validateEmployee, validateDocument, validateCollaborator }; 