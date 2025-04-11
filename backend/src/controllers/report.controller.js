const PDFDocument = require('pdfkit');
const moment = require('moment');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const Task = require('../models/task.model');

/**
 * Genera un reporte PDF con todas las actividades de todos los usuarios
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.generateActivityReport = async (req, res) => {
  try {
    // Verificar autenticación - primero intentar desde token en parámetro de consulta
    if (req.query.token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          // Buscar usuario para verificar si es admin
          const user = await User.findById(decoded.id);
          
          if (user && user.role === 'admin') {
            req.user = {
              id: user._id,
              role: user.role
            };
          }
        }
      } catch (tokenError) {
        console.error('Error al verificar token de consulta:', tokenError);
        // Continuar con la verificación normal si el token de consulta falla
      }
    }

    // Verificar que el usuario sea administrador
    if (!req.user || req.user.role !== 'admin') {
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
