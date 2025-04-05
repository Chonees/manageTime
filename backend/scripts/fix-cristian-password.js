require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manageTime', {
  family: 4 // Forzar IPv4
})
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    try {
      // Buscar el usuario cristian
      const user = await User.findOne({ username: 'cristian' });
      
      if (!user) {
        console.log('Usuario cristian no encontrado');
        return;
      }
      
      // Actualizar la contraseña
      user.password = 'Password123';
      await user.save(); // Esto activará el middleware pre-save que hasheará la contraseña
      
      console.log('Contraseña actualizada correctamente');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('Error de conexión:', err);
  });
