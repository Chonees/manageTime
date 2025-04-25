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

    // Obtener parámetros de filtrado (opcionales)
    const { startDate, endDate, activityType, userId } = req.query;
    
    // Construir filtro base
    let filter = {};
    
    // Filtrar por rango de fechas si se proporcionan
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }
    
    // Filtrar por tipo de actividad
    if (activityType) {
      if (activityType === 'availability') {
        filter.type = { $in: ['clock_in', 'clock_out', 'started_working', 'stopped_working'] };
      } else if (activityType === 'tasks') {
        filter.type = { $in: ['task_create', 'task_update', 'task_complete', 'task_delete'] };
      } else if (activityType === 'locations') {
        filter.type = { $in: ['location_enter', 'location_exit'] };
      } else if (activityType !== 'all') {
        filter.type = activityType;
      }
    }
    
    // Filtrar por usuario específico
    if (userId) {
      filter.userId = userId;
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
    
    // Estilo para los subencabezados
    const subHeaderStyle = {
      font: { bold: true, color: { argb: 'FF000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5FF' } },
      alignment: { horizontal: 'left', vertical: 'middle' }
    };
    
    // Configurar columnas del resumen
    summarySheet.columns = [
      { header: 'Usuario', key: 'username', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Rol', key: 'role', width: 15 },
      { header: 'Total Actividades', key: 'totalActivities', width: 20 },
      { header: 'Disponible (veces)', key: 'availableCount', width: 20 },
      { header: 'No disponible (veces)', key: 'unavailableCount', width: 20 },
      { header: 'Tareas Completadas', key: 'completedTasks', width: 20 },
      { header: 'Tareas Creadas', key: 'createdTasks', width: 20 },
      { header: 'Último Acceso', key: 'lastAccess', width: 20 }
    ];
    
    // Aplicar estilo a la fila de encabezados
    summarySheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Obtener todos los usuarios
    const users = await User.find({}).select('username email isAdmin');
    
    // Crear una hoja para todas las actividades
    const allActivitiesSheet = workbook.addWorksheet('Todas las Actividades');
    
    // Configurar columnas para todas las actividades
    allActivitiesSheet.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Hora', key: 'time', width: 10 },
      { header: 'Usuario', key: 'username', width: 20 },
      { header: 'Tipo de Actividad', key: 'activityType', width: 20 },
      { header: 'Descripción', key: 'description', width: 50 },
      { header: 'Coordenadas', key: 'coordinates', width: 25 },
      { header: 'Tarea Asociada', key: 'task', width: 30 },
      { header: 'Duración (min)', key: 'duration', width: 15 }
    ];
    
    // Aplicar estilo a la fila de encabezados
    allActivitiesSheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Para cada usuario, obtener información resumida y crear una hoja de detalle
    for (const user of users) {
      // Obtener actividades del usuario
      const activities = await Activity.find({ userId: user._id, ...filter })
        .populate('taskId')
        .populate('userId')
        .sort({ createdAt: -1 });
      
      // Calcular estadísticas para el resumen
      const lastLogin = activities.find(a => a.type === 'login');
      const availableCount = activities.filter(a => 
        a.type === 'clock_in' || a.type === 'started_working'
      ).length;
      const unavailableCount = activities.filter(a => 
        a.type === 'clock_out' || a.type === 'stopped_working'
      ).length;
      const completedTasks = activities.filter(a => 
        a.type === 'task_complete'
      ).length;
      const createdTasks = activities.filter(a => 
        a.type === 'task_create'
      ).length;
      
      // Añadir fila al resumen
      summarySheet.addRow({
        username: user.username,
        email: user.email,
        role: user.isAdmin ? 'Administrador' : 'Usuario',
        totalActivities: activities.length,
        availableCount,
        unavailableCount,
        completedTasks,
        createdTasks,
        lastAccess: lastLogin ? moment(lastLogin.createdAt).format('DD/MM/YYYY HH:mm') : 'Nunca'
      });
      
      // Crear una hoja detallada para cada usuario
      const userSheet = workbook.addWorksheet(`Usuario - ${user.username}`);
      
      // Configurar columnas para la hoja del usuario
      userSheet.columns = [
        { header: 'Fecha', key: 'date', width: 12 },
        { header: 'Hora', key: 'time', width: 10 },
        { header: 'Tipo de Actividad', key: 'activityType', width: 20 },
        { header: 'Descripción', key: 'description', width: 50 },
        { header: 'Coordenadas', key: 'coordinates', width: 25 },
        { header: 'Tarea Asociada', key: 'task', width: 30 },
        { header: 'Duración (min)', key: 'duration', width: 15 }
      ];
      
      // Aplicar estilo a la fila de encabezados
      userSheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle;
      });
      
      // Añadir datos a la hoja del usuario
      for (const activity of activities) {
        // Obtener información detallada de la actividad
        const activityInfo = getActivityInfo(activity);
        
        // Añadir a la hoja del usuario
        userSheet.addRow({
          date: moment(activity.createdAt).format('DD/MM/YYYY'),
          time: moment(activity.createdAt).format('HH:mm:ss'),
          activityType: activityInfo.typeText,
          description: activityInfo.description,
          coordinates: activityInfo.coordinates,
          task: activityInfo.task,
          duration: activityInfo.duration
        });
        
        // Añadir a la hoja de todas las actividades
        allActivitiesSheet.addRow({
          date: moment(activity.createdAt).format('DD/MM/YYYY'),
          time: moment(activity.createdAt).format('HH:mm:ss'),
          username: user.username,
          activityType: activityInfo.typeText,
          description: activityInfo.description,
          coordinates: activityInfo.coordinates,
          task: activityInfo.task,
          duration: activityInfo.duration
        });
      }
      
      // Añadir filtros a la hoja
      userSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: activities.length + 1, column: 7 }
      };
      
      // Añadir formato condicional para tipos de actividad
      userSheet.addConditionalFormatting({
        ref: `C2:C${activities.length + 1}`,
        rules: [
          {
            type: 'expression',
            formulae: ['SEARCH("Disponible",$C2)>0'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'E5FFEE' } } }
          },
          {
            type: 'expression',
            formulae: ['SEARCH("No disponible",$C2)>0'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFEBE5' } } }
          },
          {
            type: 'expression',
            formulae: ['SEARCH("Tarea",$C2)>0'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'E5F6FF' } } }
          },
          {
            type: 'expression',
            formulae: ['SEARCH("ubicación",$C2)>0'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF3E5' } } }
          }
        ]
      });
      
      // Crear secciones por tipo de actividad
      createActivitySections(userSheet, activities);
    }
    
    // Añadir filtros a la hoja de todas las actividades
    allActivitiesSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: allActivitiesSheet.rowCount, column: 8 }
    };
    
    // Añadir formato condicional para tipos de actividad en la hoja general
    allActivitiesSheet.addConditionalFormatting({
      ref: `D2:D${allActivitiesSheet.rowCount}`,
      rules: [
        {
          type: 'expression',
          formulae: ['SEARCH("Disponible",$D2)>0'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'E5FFEE' } } }
        },
        {
          type: 'expression',
          formulae: ['SEARCH("No disponible",$D2)>0'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFEBE5' } } }
        },
        {
          type: 'expression',
          formulae: ['SEARCH("Tarea",$D2)>0'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'E5F6FF' } } }
        },
        {
          type: 'expression',
          formulae: ['SEARCH("ubicación",$D2)>0'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF3E5' } } }
        }
      ]
    });
    
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
    const totalActivities = await Activity.countDocuments(filter);
    
    // Contar actividades por tipo
    const availabilityActivities = await Activity.countDocuments({
      ...filter,
      type: { $in: ['clock_in', 'clock_out', 'started_working', 'stopped_working'] }
    });
    
    const locationActivities = await Activity.countDocuments({
      ...filter,
      type: { $in: ['location_enter', 'location_exit'] }
    });
    
    const taskActivities = await Activity.countDocuments({
      ...filter,
      type: { $in: ['task_create', 'task_update', 'task_complete', 'task_delete'] }
    });
    
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    
    // Añadir estadísticas globales
    statsSheet.addRow({ metric: 'Total de Usuarios', value: totalUsers });
    statsSheet.addRow({ metric: 'Total de Actividades', value: totalActivities });
    statsSheet.addRow({ metric: 'Actividades de Disponibilidad', value: availabilityActivities });
    statsSheet.addRow({ metric: 'Actividades de Ubicación', value: locationActivities });
    statsSheet.addRow({ metric: 'Actividades de Tareas', value: taskActivities });
    statsSheet.addRow({ metric: 'Total de Tareas', value: totalTasks });
    statsSheet.addRow({ metric: 'Tareas Completadas', value: completedTasks });
    statsSheet.addRow({ metric: 'Tareas Pendientes', value: pendingTasks });
    statsSheet.addRow({ metric: 'Fecha de Generación', value: moment().format('DD/MM/YYYY HH:mm:ss') });
    
    // Añadir información sobre los filtros aplicados
    if (startDate || endDate || activityType || userId) {
      statsSheet.addRow({ metric: '--- Filtros Aplicados ---', value: '' });
      if (startDate) statsSheet.addRow({ metric: 'Fecha Inicio', value: moment(startDate).format('DD/MM/YYYY') });
      if (endDate) statsSheet.addRow({ metric: 'Fecha Fin', value: moment(endDate).format('DD/MM/YYYY') });
      if (activityType) {
        let activityTypeText = '';
        switch (activityType) {
          case 'availability': activityTypeText = 'Disponibilidad'; break;
          case 'tasks': activityTypeText = 'Tareas'; break;
          case 'locations': activityTypeText = 'Ubicaciones'; break;
          default: activityTypeText = activityType;
        }
        statsSheet.addRow({ metric: 'Tipo de Actividad', value: activityTypeText });
      }
      if (userId) {
        const userInfo = await User.findById(userId);
        statsSheet.addRow({ metric: 'Usuario', value: userInfo ? userInfo.username : userId });
      }
    }
    
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
      
      // Añadir datos para gráfico de tipos de actividad
      chartSheet.addRow({ status: '', count: '' });
      chartSheet.addRow({ status: 'Tipo de Actividad', count: 'Cantidad' });
      chartSheet.getRow(4).eachCell((cell) => {
        cell.style = headerStyle;
      });
      
      chartSheet.addRow({ status: 'Disponibilidad', count: availabilityActivities });
      chartSheet.addRow({ status: 'Ubicaciones', count: locationActivities });
      chartSheet.addRow({ status: 'Tareas', count: taskActivities });
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

/**
 * Función auxiliar para obtener información detallada de una actividad
 * @param {Object} activity - Objeto de actividad
 * @returns {Object} - Información formateada de la actividad
 */
function getActivityInfo(activity) {
  const { type, message, metadata, taskId } = activity;
  
  // Valores predeterminados
  let typeText = 'Actividad';
  let description = message && message !== 'Actividad sin descripción' ? message : '';
  let coordinates = 'N/A';
  let task = 'N/A';
  let duration = '';
  
  // Determinar tipo de texto y descripción según el tipo
  switch (type) {
    case 'location_enter':
      typeText = 'Entrada a ubicación';
      if (!description) {
        if (metadata && metadata.latitude && metadata.longitude) {
          description = `Entrada registrada en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
          coordinates = `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
        } else {
          description = 'Entrada a ubicación registrada';
        }
      }
      break;
      
    case 'location_exit':
      typeText = 'Salida de ubicación';
      if (!description) {
        if (metadata && metadata.latitude && metadata.longitude) {
          description = `Salida registrada en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
          coordinates = `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
        } else {
          description = 'Salida de ubicación registrada';
        }
      }
      break;
      
    case 'task_complete':
      typeText = 'Tarea completada';
      if (!description) {
        description = taskId ? `Completó la tarea: "${taskId.title || 'Sin título'}"` : 'Completó una tarea';
        task = taskId ? taskId.title : 'N/A';
      }
      break;
      
    case 'task_create':
      typeText = 'Tarea creada';
      if (!description) {
        description = taskId ? `Creó la tarea: "${taskId.title || 'Sin título'}"` : 'Creó una nueva tarea';
        task = taskId ? taskId.title : 'N/A';
      }
      break;
      
    case 'task_update':
      typeText = 'Tarea actualizada';
      if (!description) {
        description = taskId ? `Actualizó la tarea: "${taskId.title || 'Sin título'}"` : 'Actualizó una tarea';
        task = taskId ? taskId.title : 'N/A';
      }
      break;
      
    case 'task_delete':
      typeText = 'Tarea eliminada';
      if (!description) {
        description = 'Eliminó una tarea';
      }
      break;
      
    case 'started_working':
    case 'clock_in':
      typeText = 'Disponible';
      if (!description) {
        if (metadata && metadata.duration) {
          description = `Marcó como disponible (duración: ${Math.floor(metadata.duration / 60)} min)`;
          duration = Math.floor(metadata.duration / 60).toString();
        } else if (metadata && metadata.latitude && metadata.longitude) {
          description = `Marcó como disponible en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
          coordinates = `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
        } else {
          description = 'Marcó como disponible';
        }
      }
      break;
      
    case 'stopped_working':
    case 'clock_out':
      typeText = 'No disponible';
      if (!description) {
        if (metadata && metadata.duration) {
          description = `Marcó como no disponible (duración: ${Math.floor(metadata.duration / 60)} min)`;
          duration = Math.floor(metadata.duration / 60).toString();
        } else if (metadata && metadata.latitude && metadata.longitude) {
          description = `Marcó como no disponible en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
          coordinates = `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
        } else {
          description = 'Marcó como no disponible';
        }
      }
      break;
      
    case 'login':
      typeText = 'Inicio de sesión';
      description = 'Inició sesión en la aplicación';
      break;
      
    case 'logout':
      typeText = 'Cierre de sesión';
      description = 'Cerró sesión en la aplicación';
      break;
      
    default:
      typeText = 'Actividad';
      description = description || 'Actividad registrada';
  }
  
  // Si hay coordenadas en los metadatos y no se han establecido aún
  if (coordinates === 'N/A' && metadata && metadata.latitude && metadata.longitude) {
    coordinates = `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
  }
  
  // Si hay una tarea asociada y no se ha establecido aún
  if (task === 'N/A' && taskId) {
    task = taskId.title || 'Sin título';
  }
  
  return { typeText, description, coordinates, task, duration };
}

/**
 * Función auxiliar para crear secciones por tipo de actividad en una hoja
 * @param {Object} sheet - Hoja de Excel
 * @param {Array} activities - Lista de actividades
 */
function createActivitySections(sheet, activities) {
  // Añadir espacio después de las actividades
  const startRow = activities.length + 3;
  
  // Agrupar actividades por tipo
  const availabilityActivities = activities.filter(a => 
    a.type === 'clock_in' || a.type === 'clock_out' || 
    a.type === 'started_working' || a.type === 'stopped_working'
  );
  
  const taskActivities = activities.filter(a => 
    a.type === 'task_create' || a.type === 'task_update' || 
    a.type === 'task_complete' || a.type === 'task_delete'
  );
  
  const locationActivities = activities.filter(a => 
    a.type === 'location_enter' || a.type === 'location_exit'
  );
  
  // Añadir sección de disponibilidad
  if (availabilityActivities.length > 0) {
    // Añadir título de sección
    sheet.getCell(`A${startRow}`).value = 'ACTIVIDADES DE DISPONIBILIDAD';
    sheet.mergeCells(`A${startRow}:G${startRow}`);
    sheet.getCell(`A${startRow}`).style = {
      font: { bold: true, size: 14, color: { argb: 'FF000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5FFEE' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    
    // Añadir encabezados
    const headerRow = startRow + 1;
    sheet.getCell(`A${headerRow}`).value = 'Fecha';
    sheet.getCell(`B${headerRow}`).value = 'Hora';
    sheet.getCell(`C${headerRow}`).value = 'Estado';
    sheet.getCell(`D${headerRow}`).value = 'Descripción';
    sheet.getCell(`E${headerRow}`).value = 'Coordenadas';
    sheet.getCell(`F${headerRow}`).value = 'Duración (min)';
    
    // Aplicar estilo a encabezados
    for (let col = 1; col <= 6; col++) {
      sheet.getCell(headerRow, col).style = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } }
      };
    }
    
    // Añadir datos
    let currentRow = headerRow + 1;
    for (const activity of availabilityActivities) {
      const info = getActivityInfo(activity);
      
      sheet.getCell(`A${currentRow}`).value = moment(activity.createdAt).format('DD/MM/YYYY');
      sheet.getCell(`B${currentRow}`).value = moment(activity.createdAt).format('HH:mm:ss');
      sheet.getCell(`C${currentRow}`).value = info.typeText;
      sheet.getCell(`D${currentRow}`).value = info.description;
      sheet.getCell(`E${currentRow}`).value = info.coordinates;
      sheet.getCell(`F${currentRow}`).value = info.duration;
      
      currentRow++;
    }
  }
}
