const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageTime';

// Conectar a la base de datos
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));

// Obtener la colección de usuarios directamente
const db = mongoose.connection;
db.once('open', async () => {
  try {
    // Actualizar todos los usuarios para añadir el campo isSuperAdmin con valor false
    const result = await db.collection('users').updateMany(
      { isSuperAdmin: { $exists: false } }, // Busca documentos que no tengan el campo isSuperAdmin
      { $set: { isSuperAdmin: false } }     // Añade el campo con valor false
    );

    console.log(`${result.matchedCount} usuarios encontrados`);
    console.log(`${result.modifiedCount} usuarios actualizados correctamente`);
    
    // Mostrar algunos usuarios actualizados para verificar
    const updatedUsers = await db.collection('users').find({}).limit(3).toArray();
    console.log('Ejemplos de usuarios actualizados:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.username}: isSuperAdmin = ${user.isSuperAdmin}`);
    });
    
    mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  } catch (error) {
    console.error('Error al actualizar usuarios:', error);
    mongoose.disconnect();
  }
});
