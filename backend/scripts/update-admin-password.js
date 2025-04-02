require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');

// Nueva contraseña para el administrador
const newPassword = 'Admin123!';

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manageTime')
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    try {
      // Buscar el usuario administrador
      const adminUser = await User.findOne({ 
        $or: [
          { username: 'admin' },
          { email: 'admin@managetime.com' }
        ]
      });
      
      if (!adminUser) {
        console.log('No se encontró el usuario administrador');
        return;
      }
      
      console.log('Usuario administrador encontrado:');
      console.log(`ID: ${adminUser._id}`);
      console.log(`Username: ${adminUser.username}`);
      console.log(`Email: ${adminUser.email}`);
      
      // Generar hash de la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Actualizar la contraseña
      adminUser.password = hashedPassword;
      await adminUser.save();
      
      console.log(`Contraseña actualizada a: ${newPassword}`);
      
      // Verificar que la nueva contraseña funciona
      const isPasswordValid = await adminUser.comparePassword(newPassword);
      console.log(`Verificación de nueva contraseña: ${isPasswordValid ? 'Exitosa' : 'Fallida'}`);
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
    } finally {
      // Cerrar la conexión
      mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada');
    }
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });
