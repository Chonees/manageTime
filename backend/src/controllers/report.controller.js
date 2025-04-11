const PDFDocument = require('pdfkit');
const moment = require('moment');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const Task = require('../models/task.model');
const jwt = require('jsonwebtoken');
const Excel = require('exceljs');

/**
 * Función auxiliar para verificar el token y autenticar al administrador
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 * @returns {Boolean} - True si está autenticado, false si no
 */
const verifyAdminToken = async (req, res) => {
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
          return true;
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
  
  return false;
};

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
    
    // Usar la función auxiliar para verificar el token
    if (!(await verifyAdminToken(req, res))) {
      return; // La respuesta ya fue enviada por verifyAdminToken
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
        doc.fontSize(12).fillColor('#777777').text('Este usuario no tiene actividades registradas.');
        doc.moveDown();
        continue;
      }
      
      // Tabla de actividades
      doc.fontSize(12).fillColor('#2e2e2e');
      
      // Encabezados de la tabla
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [150, 120, 200, 100];
      
      // Dibujar encabezados
      doc.font('Helvetica-Bold')
         .text('Tipo', tableLeft, tableTop)
         .text('Fecha', tableLeft + colWidths[0], tableTop)
         .text('Descripción', tableLeft + colWidths[0] + colWidths[1], tableTop)
         .text('Ubicación', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
      
      doc.moveDown();
      let rowTop = doc.y;
      
      // Dibujar filas de datos
      doc.font('Helvetica');
      for (const activity of activities) {
        // Si queda poco espacio en la página, crear una nueva
        if (rowTop > doc.page.height - 150) {
          doc.addPage();
          rowTop = 50;
        }
        
        // Determinar descripción según el tipo
        let description = '';
        if (activity.type === 'login') {
          description = 'Inicio de sesión';
        } else if (activity.type === 'logout') {
          description = 'Cierre de sesión';
        } else if (activity.type === 'location_check' && activity.location) {
          description = `Check en ubicación: ${activity.location.name || 'Desconocida'}`;
        } else if (activity.type === 'task_activity' && activity.taskId) {
          description = `Actividad en tarea`;
        } else {
          description = 'Actividad sin descripción';
        }
        
        // Dibujar fila
        doc.text(activity.type, tableLeft, rowTop)
           .text(moment(activity.createdAt).format('DD/MM/YYYY HH:mm'), tableLeft + colWidths[0], rowTop)
           .text(description, tableLeft + colWidths[0] + colWidths[1], rowTop)
           .text(activity.location ? activity.location.name : 'N/A', 
                 tableLeft + colWidths[0] + colWidths[1] + colWidths[2], rowTop);
        
        rowTop = doc.y + 10;
        doc.moveDown();
      }
      
      doc.moveDown(2);
    }
    
    // Finalizar el PDF
    doc.end();
    
  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    res.status(500).json({ message: 'Error al generar el reporte PDF' });
  }
};

/**
 * Genera un reporte Excel con todas las actividades organizadas
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.generateActivityExcelReport = async (req, res) => {
  try {
    console.log('Iniciando generación de reporte Excel');
    console.log('Query params:', req.query);
    
    // Usar la función auxiliar para verificar el token
    if (!(await verifyAdminToken(req, res))) {
      return; // La respuesta ya fue enviada por verifyAdminToken
    }

    // Verificar que el usuario sea administrador
    if (!req.user || !req.user.isAdmin) {
      console.log('Acceso denegado: No es admin o no hay usuario autenticado');
      return res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
    }

    // Crear un nuevo libro de Excel
    const workbook = new Excel.Workbook();
    
    // Metadatos del libro
    workbook.creator = 'ManageTime Admin';
    workbook.lastModifiedBy = 'Generador de Reportes';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Crear una hoja de resumen
    const summarySheet = workbook.addWorksheet('Resumen');
    
    // Estilo para los encabezados
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E2E2EFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    
    // Configurar columnas del resumen
    summarySheet.columns = [
      { header: 'Usuario', key: 'username', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Rol', key: 'role', width: 15 },
      { header: 'Total Actividades', key: 'totalActivities', width: 20 },
      { header: 'Último Acceso', key: 'lastAccess', width: 20 },
      { header: 'Tareas Completadas', key: 'completedTasks', width: 20 }
    ];
    
    // Aplicar estilo a la fila de encabezados
    summarySheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Obtener todos los usuarios
    const users = await User.find({}).select('username email isAdmin');
    
    // Para cada usuario, obtener información resumida y crear una hoja de detalle
    for (const user of users) {
      // Obtener actividades del usuario
      const activities = await Activity.find({ userId: user._id })
        .populate('taskId')
        .sort({ createdAt: -1 });
      
      // Calcular estadísticas para el resumen
      const lastLogin = activities.find(a => a.type === 'login');
      const completedTasks = activities.filter(a => 
        a.type === 'task_activity' && 
        a.taskId && 
        a.taskId.status === 'completed'
      ).length;
      
      // Añadir fila al resumen
      summarySheet.addRow({
        username: user.username,
        email: user.email,
        role: user.isAdmin ? 'Administrador' : 'Usuario',
        totalActivities: activities.length,
        lastAccess: lastLogin ? moment(lastLogin.createdAt).format('DD/MM/YYYY HH:mm') : 'Nunca',
        completedTasks
      });
      
      // Crear una hoja detallada para cada usuario
      const userSheet = workbook.addWorksheet(`Usuario - ${user.username}`);
      
      // Configurar columnas para la hoja del usuario
      userSheet.columns = [
        { header: 'ID', key: 'id', width: 24 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Fecha', key: 'date', width: 20 },
        { header: 'Descripción', key: 'description', width: 40 },
        { header: 'Ubicación', key: 'location', width: 20 },
        { header: 'Coordenadas', key: 'coordinates', width: 25 },
        { header: 'Tarea Asociada', key: 'task', width: 30 },
        { header: 'Estado de Tarea', key: 'taskStatus', width: 15 }
      ];
      
      // Aplicar estilo a la fila de encabezados
      userSheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle;
      });
      
      // Añadir datos a la hoja del usuario
      for (const activity of activities) {
        // Determinar descripción según el tipo
        let description = '';
        if (activity.type === 'login') {
          description = 'Inicio de sesión';
        } else if (activity.type === 'logout') {
          description = 'Cierre de sesión';
        } else if (activity.type === 'location_check' && activity.location) {
          description = `Check en ubicación: ${activity.location.name || 'Desconocida'}`;
        } else if (activity.type === 'task_activity' && activity.taskId) {
          description = `Actividad en tarea`;
        } else {
          description = 'Actividad sin descripción';
        }
        
        userSheet.addRow({
          id: activity._id.toString(),
          type: activity.type,
          date: moment(activity.createdAt).format('DD/MM/YYYY HH:mm:ss'),
          description,
          location: activity.location ? activity.location.name : 'N/A',
          coordinates: activity.location && activity.location.coordinates ? 
            `${activity.location.coordinates[1]}, ${activity.location.coordinates[0]}` : 'N/A',
          task: activity.taskId ? activity.taskId.title : 'N/A',
          taskStatus: activity.taskId ? activity.taskId.status : 'N/A'
        });
      }
      
      // Añadir filtros a la hoja
      userSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: activities.length + 1, column: 8 }
      };
      
      // Añadir formato condicional para actividades de login
      userSheet.addConditionalFormatting({
        ref: `B2:B${activities.length + 1}`,
        rules: [
          {
            type: 'expression',
            formulae: ['$B2="login"'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'E5FFEE' } } }
          },
          {
            type: 'expression',
            formulae: ['$B2="task_activity"'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF3E5' } } }
          }
        ]
      });
    }
    
    // Crear una hoja adicional para estadísticas globales
    const statsSheet = workbook.addWorksheet('Estadísticas Globales');
    
    // Configurar columnas para estadísticas
    statsSheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 }
    ];
    
    // Aplicar estilo a la fila de encabezados
    statsSheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Obtener estadísticas globales
    const totalUsers = await User.countDocuments();
    const totalActivities = await Activity.countDocuments();
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    
    // Añadir estadísticas globales
    statsSheet.addRow({ metric: 'Total de Usuarios', value: totalUsers });
    statsSheet.addRow({ metric: 'Total de Actividades', value: totalActivities });
    statsSheet.addRow({ metric: 'Total de Tareas', value: totalTasks });
    statsSheet.addRow({ metric: 'Tareas Completadas', value: completedTasks });
    statsSheet.addRow({ metric: 'Tareas Pendientes', value: pendingTasks });
    statsSheet.addRow({ metric: 'Fecha de Generación', value: moment().format('DD/MM/YYYY HH:mm:ss') });
    
    // Crear un gráfico básico para la relación de tareas
    if (totalTasks > 0) {
      const chartSheet = workbook.addWorksheet('Gráficos');
      
      // Añadir datos para el gráfico
      chartSheet.columns = [
        { header: 'Estado', key: 'status', width: 20 },
        { header: 'Cantidad', key: 'count', width: 20 }
      ];
      
      // Aplicar estilo a la fila de encabezados
      chartSheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle;
      });
      
      // Añadir datos para el gráfico
      chartSheet.addRow({ status: 'Completadas', count: completedTasks });
      chartSheet.addRow({ status: 'Pendientes', count: pendingTasks });
    }
    
    // Configurar cabeceras para descargar el archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=actividades_${moment().format('YYYY-MM-DD')}.xlsx`);
    
    // Enviar el Excel como respuesta
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Error al generar reporte Excel:', error);
    res.status(500).json({ message: 'Error al generar el reporte Excel' });
  }
};
