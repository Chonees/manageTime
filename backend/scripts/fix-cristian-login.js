require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
      
      console.log('Usuario encontrado:', user.username);
      
      // Generar hash de la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123', salt);
      
      // Actualizar la contraseña directamente en la base de datos
      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log('Contraseña actualizada a: Password123');
      
      // Verificar manualmente la contraseña
      const updatedUser = await User.findById(user._id);
      const isValid = await bcrypt.compare('Password123', updatedUser.password);
      console.log('Verificación de contraseña:', isValid ? 'Exitosa' : 'Fallida');
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      mongoose.connection.close();
      console.log('Conexión cerrada');
    }
  })
  .catch(err => {
    console.error('Error de conexión:', err);
  });
