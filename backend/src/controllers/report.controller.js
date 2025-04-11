const PDFDocument = require('pdfkit');
const moment = require('moment');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const Task = require('../models/task.model');
const jwt = require('jsonwebtoken');

/**
 * Genera un reporte PDF con todas las actividades de todos los usuarios
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.generateActivityReport = async (req, res) => {
  try {
    console.log('Iniciando generación de reporte PDF');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    // Verificar autenticación - primero intentar desde token en parámetro de consulta
    if (req.query.token) {
      try {
        console.log('Token recibido en query:', req.query.token);
        
        // Verificar el token con el secreto adecuado
        const JWT_SECRET = process.env.JWT_SECRET || 'tokenSecretJWT';
        const decoded = jwt.verify(req.query.token, JWT_SECRET);
        console.log('Token decodificado:', decoded);
        
        if (decoded && decoded.id) {
          // Buscar usuario para verificar si es admin
          const user = await User.findById(decoded.id);
          console.log('Usuario encontrado:', user ? user.username : 'ninguno');
          
          if (user && (user.isAdmin === true || decoded.isAdmin === true)) {
            req.user = {
              id: user._id,
              role: 'admin', // Establecer role para compatibilidad
              isAdmin: true
            };
            console.log('Usuario autenticado como admin');
          } else {
            console.log('Usuario no es admin:', user ? (user.isAdmin ? 'Es admin' : 'No es admin') : 'rol desconocido');
            return res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
          }
        } else {
          console.log('Token no contiene ID de usuario');
          return res.status(401).json({ message: 'Token inválido: falta información del usuario' });
        }
      } catch (tokenError) {
        console.error('Error al verificar token de consulta:', tokenError);
        return res.status(401).json({ message: `Error de autenticación: ${tokenError.message}` });
      }
    } else {
      console.log('No se proporcionó token en los parámetros de consulta');
      return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
    }

    // Verificar que el usuario sea administrador
    if (!req.user || !req.user.isAdmin) {
      console.log('Acceso denegado: No es admin o no hay usuario autenticado');
      return res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
    }

    // Crear un nuevo documento PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar cabeceras para descargar el archivo
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=actividades_${moment().format('YYYY-MM-DD')}.pdf`);
    
    // Pipe el PDF directo a la respuesta HTTP
    doc.pipe(res);

    // Título del reporte
    doc.fontSize(25).text('Reporte de Actividades', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generado el: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, { align: 'center' });
    doc.moveDown(2);

    // Obtener todos los usuarios
    const users = await User.find({}).select('username email role');
    
    // Para cada usuario, obtener sus actividades
    for (const user of users) {
      // Agregar información del usuario
      doc.fontSize(16).fillColor('#2e2e2e').text(`Usuario: ${user.username} (${user.email})`);
      doc.fontSize(12).fillColor('#555555').text(`Rol: ${user.role === 'admin' ? 'Administrador' : 'Usuario regular'}`);
      doc.moveDown();
      
      // Obtener actividades del usuario
      const activities = await Activity.find({ userId: user._id })
        .populate('taskId')
        .sort({ createdAt: -1 });
      
      if (activities.length === 0) {
        doc.text('No hay actividades registradas para este usuario.');
        doc.moveDown(2);
        continue;
      }
      
      // Mostrar las actividades
      doc.fontSize(14).fillColor('#2e2e2e').text('Actividades:', { underline: true });
      doc.moveDown(0.5);
      
      for (const activity of activities) {
        const date = moment(activity.createdAt).format('DD/MM/YYYY HH:mm:ss');
        const taskName = activity.taskId ? activity.taskId.title : 'Sin tarea';
        
        let actionText = '';
        switch (activity.type) {
          case 'task_activity':
            actionText = `Actividad en tarea "${taskName}": ${activity.message}`;
            break;
          case 'location_enter':
            actionText = `Entró a la ubicación de la tarea "${taskName}"`;
            break;
          case 'location_exit':
            actionText = `Salió de la ubicación de la tarea "${taskName}"`;
            break;
          case 'task_complete':
            actionText = `Completó la tarea "${taskName}"`;
            break;
          case 'task_create':
            actionText = `Creó la tarea "${taskName}"`;
            break;
          case 'task_update':
            actionText = `Actualizó la tarea "${taskName}"`;
            break;
          case 'task_delete':
            actionText = `Eliminó una tarea`;
            break;
          case 'started_working':
            actionText = `Comenzó a trabajar`;
            break;
          case 'stopped_working':
            actionText = `Terminó de trabajar`;
            break;
          default:
            actionText = activity.message;
        }
        
        doc.fontSize(12).fillColor('#333333').text(`[${date}] ${actionText}`);
        doc.moveDown(0.5);
      }
      
      // Separador entre usuarios
      doc.moveDown();
      doc.lineCap('butt')
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke('#cccccc');
      doc.moveDown(2);
      
      // Verificar si necesitamos una nueva página
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }
    }
    
    // Pie de página
    doc.fontSize(10).fillColor('#888888').text('ManageTime - Reporte de Actividades', { align: 'center' });
    
    // Finalizar el PDF
    doc.end();
    
  } catch (error) {
    console.error('Error al generar reporte de actividades:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte de actividades', 
      error: error.message 
    });
  }
};
