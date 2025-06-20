require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');

// Datos del usuario administrador
const adminUser = {
  username: 'admin',
  email: 'admin@managetime.com',
  password: 'admin',
  isAdmin: true,
  isActive: true
};

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manageTime', {
  family: 4 // Forzar IPv4
})
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    try {
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ 
        $or: [
          { username: adminUser.username },
          { email: adminUser.email }
        ]
      });
      
      if (existingUser) {
        console.log('El usuario administrador ya existe:');
        console.log(`Username: ${existingUser.username}`);
        console.log(`Email: ${existingUser.email}`);
        console.log(`Admin: ${existingUser.isAdmin ? 'Sí' : 'No'}`);
        
        // Actualizar a administrador si no lo es
        if (!existingUser.isAdmin) {
          existingUser.isAdmin = true;
          await existingUser.save();
          console.log('Usuario actualizado a administrador');
        }
      } else {
        // Crear el usuario administrador
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminUser.password, salt);
        
        const newAdmin = new User({
          username: adminUser.username,
          email: adminUser.email,
          password: hashedPassword,
          isAdmin: adminUser.isAdmin,
          isActive: adminUser.isActive
        });
        
        await newAdmin.save();
        console.log('Usuario administrador creado:');
        console.log(`Username: ${newAdmin.username}`);
        console.log(`Email: ${newAdmin.email}`);
        console.log(`Admin: ${newAdmin.isAdmin ? 'Sí' : 'No'}`);
      }
    } catch (error) {
      console.error('Error al crear/verificar usuario administrador:', error);
    } finally {
      // Cerrar la conexión
      mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada');
    }
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });
