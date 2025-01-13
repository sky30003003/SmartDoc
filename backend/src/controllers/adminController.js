const Document = require('../models/Document');
const Employee = require('../models/Employee');
const Collaborator = require('../models/Collaborator');

exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find()
      .populate('organization', 'name')
      .select('title description originalName fileUrl fileType fileSize uploadedAt organization')
      .sort({ uploadedAt: -1 });

    console.log('Documents fetched:', JSON.stringify(documents, null, 2));

    res.json(documents);
  } catch (error) {
    console.error('Error getting all documents:', error);
    res.status(500).json({ message: 'Eroare la obținerea documentelor' });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('organization', 'name')
      .sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    console.error('Error getting all employees:', error);
    res.status(500).json({ message: 'Eroare la obținerea angajaților' });
  }
};

exports.getAllCollaborators = async (req, res) => {
  try {
    const collaborators = await Collaborator.find()
      .populate('organization', 'name')
      .sort({ createdAt: -1 });
    res.json(collaborators);
  } catch (error) {
    console.error('Error getting all collaborators:', error);
    res.status(500).json({ message: 'Eroare la obținerea colaboratorilor' });
  }
}; 