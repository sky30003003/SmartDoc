const Collaborator = require('../models/Collaborator');
const Organization = require('../models/Organization');

exports.getAllCollaborators = async (req, res) => {
  try {
    console.log('Getting collaborators for organization:', req.user.organization);
    const collaborators = await Collaborator.find({ organization: req.user.organization })
      .sort({ createdAt: -1 });
    console.log('Found collaborators:', collaborators);
    if (!collaborators || collaborators.length === 0) {
      console.log('No collaborators found');
      return res.json([]);
    }
    res.json(collaborators);
  } catch (error) {
    console.error('Error getting collaborators:', error);
    res.status(500).json({ message: 'Eroare la obținerea colaboratorilor' });
  }
};

exports.createCollaborator = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, cnp } = req.body;

    const existingCollaborator = await Collaborator.findOne({
      organization: req.user.organization,
      cnp: cnp
    });

    if (existingCollaborator) {
      return res.status(400).json({ message: 'Există deja un colaborator cu acest CNP' });
    }

    const collaborator = new Collaborator({
      firstName,
      lastName,
      email,
      phone,
      cnp,
      organization: req.user.organization
    });

    await collaborator.save();
    res.status(201).json(collaborator);
  } catch (error) {
    console.error('Error creating collaborator:', error);
    res.status(500).json({ message: 'Eroare la crearea colaboratorului' });
  }
};

exports.deleteCollaborator = async (req, res) => {
  try {
    const collaborator = await Collaborator.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaboratorul nu a fost găsit' });
    }

    res.json({ message: 'Colaborator șters cu succes' });
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    res.status(500).json({ message: 'Eroare la ștergerea colaboratorului' });
  }
}; 