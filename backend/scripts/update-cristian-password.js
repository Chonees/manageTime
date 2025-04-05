require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');

// Nueva contraseña para el usuario cristian
const newPassword = 'Password123';

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manageTime', {
  family: 4 // Forzar IPv4
})
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    try {
      // Buscar el usuario cristian
      const user = await User.findOne({ 
        username: 'cristian'
      });
      
      if (!user) {
        console.log('No se encontró el usuario cristian');
        return;
      }
      
      console.log('Usuario encontrado:');
      console.log(`ID: ${user._id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      
      // Generar hash de la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Actualizar la contraseña
      user.password = hashedPassword;
      await user.save();
      
      console.log(`Contraseña actualizada a: ${newPassword}`);
      
      // Verificar que la nueva contraseña funciona
      const isPasswordValid = await user.comparePassword(newPassword);
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
