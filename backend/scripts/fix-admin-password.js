require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Nueva contraseña para el administrador
const newPassword = 'Admin123!';

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manageTime')
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    try {
      // Acceder directamente a la colección de usuarios para evitar el middleware
      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');
      
      // Buscar el usuario administrador
      const adminUser = await usersCollection.findOne({ 
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
      const result = await usersCollection.updateOne(
        { _id: adminUser._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log(`Contraseña actualizada a: ${newPassword}`);
      console.log(`Documentos modificados: ${result.modifiedCount}`);
      
      // Verificar que la contraseña se actualizó correctamente
      const updatedUser = await usersCollection.findOne({ _id: adminUser._id });
      console.log(`Hash de contraseña actualizado: ${updatedUser.password}`);
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
