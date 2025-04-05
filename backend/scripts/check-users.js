require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manageTime')
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    try {
      // Buscar todos los usuarios
      const users = await User.find({}).select('-password');
      
      console.log('=== USUARIOS REGISTRADOS ===');
      if (users.length === 0) {
        console.log('No hay usuarios registrados en la base de datos');
      } else {
        users.forEach((user, index) => {
          console.log(`\nUsuario #${index + 1}:`);
          console.log(`ID: ${user._id}`);
          console.log(`Username: ${user.username}`);
          console.log(`Email: ${user.email}`);
          console.log(`Admin: ${user.isAdmin ? 'Sí' : 'No'}`);
          console.log(`Activo: ${user.isActive ? 'Sí' : 'No'}`);
          console.log(`Creado: ${user.createdAt}`);
        });
      }
      
      // Verificar específicamente el usuario admin
      const adminUser = await User.findOne({ 
        $or: [
          { username: 'admin' },
          { email: 'admin@manageTime.com' }
        ]
      });
      
      console.log('\n=== VERIFICACIÓN DE USUARIO ADMIN ===');
      if (adminUser) {
        console.log('Usuario admin encontrado:');
        console.log(`ID: ${adminUser._id}`);
        console.log(`Username: ${adminUser.username}`);
        console.log(`Email: ${adminUser.email}`);
        console.log(`Admin: ${adminUser.isAdmin ? 'Sí' : 'No'}`);
        console.log(`Activo: ${adminUser.isActive ? 'Sí' : 'No'}`);
        
        // Verificar si la contraseña es correcta
        const testPassword = 'Admin123!';
        const isPasswordValid = await adminUser.comparePassword(testPassword);
        console.log(`Contraseña '${testPassword}' válida: ${isPasswordValid ? 'Sí' : 'No'}`);
      } else {
        console.log('No se encontró el usuario admin');
      }
    } catch (error) {
      console.error('Error al verificar usuarios:', error);
    } finally {
      // Cerrar la conexión
      mongoose.connection.close();
      console.log('\nConexión a MongoDB cerrada');
    }
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });
