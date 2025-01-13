const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllEmployees, createEmployee, deleteEmployee, getEmployeeCount, getEmployee, updateEmployee, deleteEmployeeDocument } = require('../controllers/employeeController');

router.get('/', authenticateToken, getAllEmployees);
router.get('/count', authenticateToken, getEmployeeCount);
router.get('/:id', authenticateToken, getEmployee);
router.post('/', authenticateToken, createEmployee);
router.put('/:id', authenticateToken, updateEmployee);
router.delete('/:id', authenticateToken, deleteEmployee);
router.delete('/:employeeId/documents/:documentId', authenticateToken, deleteEmployeeDocument);

module.exports = router; 