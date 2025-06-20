require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');

// Nueva contraseña para el administrador
const newPassword = 'Password123';

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manageTime', {
  family: 4 // Forzar IPv4
})
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
      
      // Actualizar la contraseña directamente en la base de datos
      await User.updateOne(
        { _id: adminUser._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log(`Contraseña actualizada a: ${newPassword}`);
      
      // Obtener el usuario actualizado
      const updatedUser = await User.findById(adminUser._id);
      
      // Verificar que la nueva contraseña funciona
      const isPasswordValid = await bcrypt.compare(newPassword, updatedUser.password);
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
