const Organization = require('../models/Organization');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const Document = require('../models/Document');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Collaborator = require('../models/Collaborator');
const bcrypt = require('bcrypt');

exports.createOrganization = async (req, res) => {
  try {
    const { name, cuiCnp, email, phone } = req.body;

    // Verificăm dacă există deja o organizație cu acest CUI/CNP
    const existingOrgByCuiCnp = await Organization.findOne({ cuiCnp });
    if (existingOrgByCuiCnp) {
      return res.status(400).json({ message: 'Există deja o organizație cu acest CUI/CNP' });
    }

    // Verificăm dacă există deja o organizație cu acest nume
    const existingOrgByName = await Organization.findOne({ name });
    if (existingOrgByName) {
      return res.status(400).json({ message: 'Există deja o organizație cu acest nume' });
    }

    // Verificăm dacă există deja o organizație sau un user cu acest email
    const [existingOrgByEmail, existingUser] = await Promise.all([
      Organization.findOne({ email }),
      User.findOne({ email })
    ]);

    if (existingOrgByEmail) {
      return res.status(400).json({ message: 'Există deja o organizație cu acest email' });
    }

    if (existingUser) {
      return res.status(400).json({ message: 'Există deja un utilizator cu acest email' });
    }

    // Creăm organizația
    const organization = new Organization({
      name,
      cuiCnp,
      email,
      phone
    });
    await organization.save();

    // Generăm o parolă simplă (de exemplu: primele 6 caractere din email + "123!")
    const defaultPassword = `${email.substring(0, 6)}123!`;

    // Creăm userul admin pentru organizație
    const user = new User({
      email,
      password: defaultPassword,
      firstName: 'Admin',
      lastName: organization.name,
      role: 'org_admin',
      organization: organization._id,
      status: 'active'  // Userul este activ direct
    });
    await user.save();

    // Trimitem email-ul cu credențialele
    await emailService.sendWelcomeEmail({
      to: email,
      organizationName: name,
      password: defaultPassword
    });

    res.status(201).json({
      message: 'Organizația și administratorul au fost create cu succes',
      organization: {
        ...organization.toObject()
      }
    });

  } catch (error) {
    console.error('Eroare la crearea organizației:', error);
    res.status(500).json({ message: 'Eroare la crearea organizației' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    console.log('Getting dashboard stats for organization:', req.user.organization);
    console.log('User object:', req.user);
    
    if (!req.user.organization) {
      console.log('No organization found in user object');
      return res.status(400).json({ message: 'No organization found for user' });
    }

    console.log('Counting documents for organization:', req.user.organization);
    const documentsCount = await Document.countDocuments({ organization: req.user.organization });
    console.log('Documents count:', documentsCount);

    console.log('Counting employees for organization:', req.user.organization);
    const employeesCount = await Employee.countDocuments({ organization: req.user.organization });
    console.log('Employees count:', employeesCount);

    console.log('Counting collaborators for organization:', req.user.organization);
    const collaboratorsCount = await Collaborator.countDocuments({ organization: req.user.organization });
    console.log('Collaborators count:', collaboratorsCount);

    const stats = {
      documents: documentsCount,
      employeeCount: employeesCount,
      collaborators: collaboratorsCount
    };

    console.log('Final stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    console.error('Full error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Eroare la obținerea statisticilor' });
  }
};

exports.getAllOrganizations = async (req, res) => {
  try {
    console.log('Getting all organizations...');
    console.log('User from token:', req.user);
    
    const organizations = await Organization.find().lean();
    
    // Obținem statisticile pentru fiecare organizație
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const [documentsCount, employeesCount, collaboratorsCount] = await Promise.all([
          Document.countDocuments({ organization: org._id }),
          User.countDocuments({ organization: org._id, role: 'employee' }),
          User.countDocuments({ organization: org._id, role: 'collaborator' })
        ]);

        return {
          ...org,
          documentsCount,
          employeesCount,
          collaboratorsCount
        };
      })
    );
    
    // Verificăm dacă avem acces la baza de date
    const collections = await mongoose.connection.db.collections();
    console.log('Available collections:', collections.map(c => c.collectionName));
    
    res.json(organizationsWithStats);
  } catch (error) {
    console.error('Error getting organizations:', error);
    console.error('Full error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Eroare la obținerea organizațiilor' });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Attempting to delete organization:', id);

    // Găsim organizația
    const organization = await Organization.findById(id);
    console.log('Found organization:', organization);
    
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Ștergem toate documentele organizației
    await Document.deleteMany({ organization: id });
    console.log('Deleted all documents for organization');

    // Ștergem toți angajații organizației
    await Employee.deleteMany({ organization: id });
    console.log('Deleted all employees for organization');

    // Ștergem toți colaboratorii organizației
    await Collaborator.deleteMany({ organization: id });
    console.log('Deleted all collaborators for organization');

    // Ștergem folderul organizației din storage
    const fs = require('fs');
    const path = require('path');
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    const storageDir = path.join(process.cwd(), 'src', 'storage');
    console.log('Checking storage directory:', storageDir);
    
    const folders = fs.readdirSync(storageDir);
    console.log('Found folders:', folders);
    
    const folderName = organization.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')  // înlocuim toate caracterele non-alfanumerice
      .trim()
      .replace(/^_+|_+$/g, '');  // eliminăm _ de la început și sfârșit
    
    console.log('Looking for folder name:', folderName);
    const orgFolder = folders.find(folder => folder === folderName);
    console.log('Found organization folder:', orgFolder);
    
    let storageDeleted = false;
    
    if (orgFolder) {
      const organizationPath = path.join(storageDir, orgFolder);
      console.log('Attempting to delete folder at path:', organizationPath);
    
      try {
        fs.rmSync(organizationPath, { recursive: true, force: true });
        console.log('Deleted organization storage folder:', organizationPath);
        storageDeleted = true;
      } catch (error) {
        console.error('Error deleting organization folder:', organizationPath, error);
        console.error('Error details:', error.code, error.message);
      }
    } else {
      console.log('Storage folder not found for organization:', organization.name);
    }

    // Găsim și ștergem admin-ul organizației
    const deletedUser = await User.findOneAndDelete({ 
      organization: id,
      role: 'org_admin'
    });
    console.log('Deleted user:', deletedUser);

    // Ștergem organizația
    const deletedOrg = await Organization.findByIdAndDelete(id);
    console.log('Deleted organization:', deletedOrg);

    res.json({ 
      message: 'Organizația și toate datele asociate au fost șterse cu succes',
      details: {
        organization: deletedOrg,
        admin: deletedUser,
        storageDeleted: storageDeleted ? 'success' : 'failed'
      }
    });
  } catch (error) {
    console.error('Eroare la ștergerea organizației:', error);
    console.error('Full error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Eroare la ștergerea organizației',
      details: error.message
    });
  }
};

exports.getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Obținem statisticile pentru organizație
    const [employeesCount, collaboratorsCount, documentsCount] = await Promise.all([
      User.countDocuments({ organization: req.params.id, role: 'employee' }),
      User.countDocuments({ organization: req.params.id, role: 'collaborator' }),
      Document.countDocuments({ organization: req.params.id })
    ]);

    // Adăugăm statisticile la răspuns
    const orgData = organization.toObject();
    orgData.stats = {
      employees: employeesCount,
      collaborators: collaboratorsCount,
      documents: documentsCount
    };

    res.json(orgData);
  } catch (error) {
    console.error('Error getting organization:', error);
    res.status(500).json({ message: 'Eroare la obținerea organizației' });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const { name, cuiCnp, email, phone } = req.body;
    const { id } = req.params;

    // Verificăm dacă există alte organizații cu același nume/CUI/email
    const [existingOrgByName, existingOrgByCuiCnp, existingOrgByEmail] = await Promise.all([
      Organization.findOne({ name, _id: { $ne: id } }),
      Organization.findOne({ cuiCnp, _id: { $ne: id } }),
      Organization.findOne({ email, _id: { $ne: id } })
    ]);

    if (existingOrgByName) {
      return res.status(400).json({ message: 'Există deja o organizație cu acest nume' });
    }

    if (existingOrgByCuiCnp) {
      return res.status(400).json({ message: 'Există deja o organizație cu acest CUI/CNP' });
    }

    if (existingOrgByEmail) {
      return res.status(400).json({ message: 'Există deja o organizație cu acest email' });
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      { name, cuiCnp, email, phone },
      { new: true }
    );

    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Actualizăm și numele administratorului organizației
    await User.findOneAndUpdate(
      { organization: id, role: 'org_admin' },
      { lastName: name }
    );

    res.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ message: 'Eroare la actualizarea organizației' });
  }
};

exports.getOrganizationStats = async (req, res) => {
  try {
    const { id } = req.params;

    const [documentsCount, employeesCount, collaboratorsCount] = await Promise.all([
      Document.countDocuments({ organization: id }),
      User.countDocuments({ organization: id, role: 'employee' }),
      User.countDocuments({ organization: id, role: 'collaborator' })
    ]);

    res.json({
      documents: documentsCount,
      employees: employeesCount,
      collaborators: collaboratorsCount
    });
  } catch (error) {
    console.error('Error getting organization stats:', error);
    res.status(500).json({ message: 'Eroare la obținerea statisticilor' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const organizationsCount = await Organization.countDocuments();
    const documentsCount = await Document.countDocuments();
    const employeesCount = await Employee.countDocuments();
    const collaboratorCount = await Collaborator.countDocuments();

    console.log('Admin Stats:', {
      organizations: organizationsCount,
      documents: documentsCount,
      employeeCount: employeesCount,
      collaboratorCount: collaboratorCount
    });

    res.json({
      organizations: organizationsCount,
      documents: documentsCount,
      employeeCount: employeesCount,
      collaboratorCount: collaboratorCount
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ message: 'Eroare la obținerea statisticilor' });
  }
};

exports.resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Găsim organizația
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Găsim admin-ul organizației
    const admin = await User.findOne({ 
      organization: id, 
      role: 'org_admin' 
    });
    if (!admin) {
      return res.status(404).json({ message: 'Administratorul organizației nu a fost găsit' });
    }

    // Generăm noua parolă
    const newPassword = `${admin.email.substring(0, 6)}123!`;

    // Actualizăm parola admin-ului
    admin.password = newPassword;
    await admin.save();

    // Trimitem email-ul
    await emailService.sendPasswordResetEmail({
      to: admin.email,
      organizationName: organization.name,
      password: newPassword
    });

    res.json({ 
      message: 'Parola a fost resetată cu succes',
      password: newPassword 
    });
  } catch (error) {
    console.error('Error resetting admin password:', error);
    res.status(500).json({ message: 'Eroare la resetarea parolei' });
  }
}; 