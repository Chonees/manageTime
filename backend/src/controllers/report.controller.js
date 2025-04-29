const moment = require('moment');
require('moment-timezone'); // Agregar soporte para zonas horarias
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
    // Intentar desde encabezado de autorización
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET || 'tokenSecretJWT';
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded && decoded.id) {
          // Buscar usuario para verificar si es admin
          const user = await User.findById(decoded.id);
          if (user && (user.isAdmin === true || decoded.isAdmin === true)) {
            req.user = {
              id: user._id,
              role: 'admin',
              isAdmin: true
            };
            return true;
          } else {
            return res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
          }
        } else {
          return res.status(401).json({ message: 'Token inválido: falta información del usuario' });
        }
      } catch (tokenError) {
        return res.status(401).json({ message: `Error de autenticación: ${tokenError.message}` });
      }
    } else {
      return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
    }
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

    console.log('Filtro aplicado:', JSON.stringify(filter));

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
    console.log(`Encontrados ${users.length} usuarios`);
    
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
    
    // Variables para estadísticas globales
    let totalActivities = 0;
    let availabilityActivities = 0;
    let locationActivities = 0;
    let taskActivities = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    
    // Para cada usuario, obtener información resumida y crear una hoja de detalle
    for (const user of users) {
      try {
        console.log(`Procesando usuario: ${user.username}`);
        
        // Obtener actividades del usuario
        const activities = await Activity.find({ userId: user._id, ...filter })
          .populate('taskId')
          .populate('userId')
          .sort({ createdAt: -1 });
        
        console.log(`Encontradas ${activities.length} actividades para ${user.username}`);
        
        // Calcular estadísticas para el resumen
        const lastLogin = activities.find(a => a.type === 'login');
        const availableCount = activities.filter(a => 
          a.type === 'clock_in' || a.type === 'started_working'
        ).length;
        const unavailableCount = activities.filter(a => 
          a.type === 'clock_out' || a.type === 'stopped_working'
        ).length;
        const userCompletedTasks = activities.filter(a => 
          a.type === 'task_complete'
        ).length;
        const createdTasksCount = activities.filter(a => 
          a.type === 'task_create'
        ).length;
        
        // Actualizar estadísticas globales
        totalActivities += activities.length;
        availabilityActivities += availableCount + unavailableCount;
        taskActivities += userCompletedTasks + createdTasksCount;
        completedTasks += userCompletedTasks;
        
        // Añadir fila al resumen
        summarySheet.addRow({
          username: user.username,
          email: user.email,
          role: user.isAdmin ? 'Administrador' : 'Usuario',
          totalActivities: activities.length,
          availableCount,
          unavailableCount,
          completedTasks: userCompletedTasks,
          createdTasks: createdTasksCount,
          lastAccess: lastLogin ? moment(lastLogin.createdAt).tz('America/Chicago').format('DD/MM/YYYY HH:mm') : 'Nunca'
        });
        
        // Si hay actividades, crear una hoja detallada para el usuario
        if (activities.length > 0) {
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
          
          // Agrupar actividades por tarea si se ha solicitado
          if (req.query.groupByTask === 'true') {
            // Primero obtener todas las tareas asociadas a las actividades
            const taskIds = [...new Set(activities
              .filter(a => a.taskId)
              .map(a => a.taskId._id.toString()))];
            
            console.log(`Encontradas ${taskIds.length} tareas distintas para agrupar`);
            
            // Actividades sin tarea asociada
            const activitiesWithoutTask = activities.filter(a => !a.taskId);
            
            // Para cada tarea, obtener sus actividades y crear una sección
            for (const taskId of taskIds) {
              const taskActivities = activities.filter(a => 
                a.taskId && a.taskId._id.toString() === taskId
              );
              
              if (taskActivities.length > 0) {
                const taskName = taskActivities[0].taskId.title || 'Tarea sin título';
                await addTaskSection(userSheet, `TAREA: ${taskName}`, taskActivities);
              }
            }
            
            // Añadir actividades sin tarea asociada al final
            if (activitiesWithoutTask.length > 0) {
              await createActivitySections(userSheet, activitiesWithoutTask);
            }
          } else {
            // Si no se agrupan por tarea, usar el método original
            await createActivitySections(userSheet, activities);
          }
          
          // Añadir todas las actividades del usuario a la hoja general
          for (const activity of activities) {
            const activityInfo = await getActivityInfo(activity);
            
            // Añadir a la hoja de todas las actividades
            allActivitiesSheet.addRow({
              date: activityInfo.date,
              time: activityInfo.time,
              username: user.username,
              activityType: activityInfo.activityType,
              description: activityInfo.description,
              coordinates: activityInfo.coordinates,
              task: activityInfo.task,
              duration: activityInfo.duration
            });
          }
        }
      } catch (userError) {
        console.error(`Error procesando usuario ${user.username}:`, userError);
        // Continuar con el siguiente usuario
      }
    }
    
    // Obtener tareas pendientes para estadísticas
    const tasks = await Task.find({ completed: false });
    pendingTasks = tasks.length;
    totalTasks = completedTasks + pendingTasks;
    
    // Añadir estadísticas globales
    locationActivities = totalActivities - (availabilityActivities + taskActivities);
    
    // Crear hoja de estadísticas
    const statsSheet = workbook.addWorksheet('Estadísticas');
    
    // Configurar columnas para estadísticas
    statsSheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 }
    ];
    
    // Aplicar estilo a la fila de encabezados
    statsSheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Añadir estadísticas
    statsSheet.addRow({ metric: 'Total de Actividades', value: totalActivities });
    statsSheet.addRow({ metric: 'Actividades de Disponibilidad', value: availabilityActivities });
    statsSheet.addRow({ metric: 'Actividades de Ubicación', value: locationActivities });
    statsSheet.addRow({ metric: 'Actividades de Tareas', value: taskActivities });
    statsSheet.addRow({ metric: 'Total de Tareas', value: totalTasks });
    statsSheet.addRow({ metric: 'Tareas Completadas', value: completedTasks });
    statsSheet.addRow({ metric: 'Tareas Pendientes', value: pendingTasks });
    statsSheet.addRow({ metric: 'Fecha de Generación', value: moment().tz('America/Chicago').format('DD/MM/YYYY HH:mm:ss') });
    
    // Añadir información sobre los filtros aplicados
    if (startDate || endDate || activityType || userId) {
      statsSheet.addRow({ metric: '--- Filtros Aplicados ---', value: '' });
      if (startDate) statsSheet.addRow({ metric: 'Fecha Inicio', value: moment(startDate).tz('America/Chicago').format('DD/MM/YYYY') });
      if (endDate) statsSheet.addRow({ metric: 'Fecha Fin', value: moment(endDate).tz('America/Chicago').format('DD/MM/YYYY') });
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
        try {
          const userInfo = await User.findById(userId);
          statsSheet.addRow({ metric: 'Usuario', value: userInfo ? userInfo.username : userId });
        } catch (error) {
          console.error('Error al buscar información del usuario:', error);
          statsSheet.addRow({ metric: 'Usuario', value: userId });
        }
      }
    }
    
    // Crear un gráfico básico para la relación de tareas si hay tareas
    if (totalTasks > 0) {
      try {
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
      } catch (chartError) {
        console.error('Error al crear gráficos:', chartError);
        // Continuar sin gráficos
      }
    }
    
    console.log('Generando archivo Excel...');
    
    // Configurar cabeceras para descargar el archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=actividades_${moment().tz('America/Chicago').format('YYYY-MM-DD')}.xlsx`);
    
    try {
      // Enviar el Excel como respuesta
      await workbook.xlsx.write(res);
      console.log('Archivo Excel enviado correctamente');
      res.end();
    } catch (writeError) {
      console.error('Error al escribir el archivo Excel:', writeError);
      // Si ya se enviaron cabeceras pero falló la escritura, no podemos enviar un JSON de error
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error al generar el reporte Excel: ' + writeError.message });
      } else {
        res.end();
      }
    }
    
  } catch (error) {
    console.error('Error al generar reporte Excel:', error);
    // Verificar si ya se enviaron cabeceras para evitar errores
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error al generar el reporte Excel: ' + error.message });
    } else {
      res.end();
    }
  }
};

/**
 * Función auxiliar para obtener información detallada de una actividad
 * @param {Object} activity - Objeto de actividad
 * @returns {Object} - Información formateada de la actividad
 */
const getActivityInfo = async (activity) => {
  try {
    // Usar la zona horaria de Brownsville, TX (America/Chicago)
    const TIMEZONE = 'America/Chicago';
    
    // Formatear fecha y hora con la zona horaria correcta
    const date = moment(activity.createdAt).tz(TIMEZONE).format('DD/MM/YYYY');
    const time = moment(activity.createdAt).tz(TIMEZONE).format('HH:mm:ss');
    
    // Determinar el tipo de actividad y descripción
    let activityType = '';
    let description = activity.description || 'Sin descripción';
    
    switch (activity.type) {
      case 'clock_in':
      case 'started_working':
        activityType = 'Disponible';
        description = 'Usuario marcó como disponible';
        break;
      case 'clock_out':
      case 'stopped_working':
        activityType = 'No disponible';
        description = 'Usuario marcó como no disponible';
        break;
      case 'location_enter':
        activityType = 'Entrada a ubicación';
        description = `Entró a: ${activity.locationName || 'Ubicación sin nombre'}`;
        break;
      case 'location_exit':
        activityType = 'Salida de ubicación';
        description = `Salió de: ${activity.locationName || 'Ubicación sin nombre'}`;
        break;
      case 'task_complete':
        activityType = 'Tarea completada';
        description = `Completó tarea: ${activity.taskId?.title || 'Tarea sin título'}`;
        break;
      case 'task_create':
        activityType = 'Tarea creada';
        description = `Creó tarea: ${activity.taskId?.title || 'Tarea sin título'}`;
        break;
      case 'task_update':
        activityType = 'Tarea actualizada';
        description = `Actualizó tarea: ${activity.taskId?.title || 'Tarea sin título'}`;
        break;
      case 'task_delete':
        activityType = 'Tarea eliminada';
        description = `Eliminó tarea: ${activity.taskId?.title || activity.description || 'Tarea sin título'}`;
        break;
      case 'login':
        activityType = 'Inicio de sesión';
        description = 'Usuario inició sesión';
        break;
      case 'logout':
        activityType = 'Cierre de sesión';
        description = 'Usuario cerró sesión';
        break;
      case 'voice_note':
        activityType = 'Bitácora';
        
        // Priorizar la palabra clave guardada en los metadatos (nuevo flujo)
        if (activity.metadata && activity.metadata.keyword) {
          description = activity.metadata.keyword;
        } 
        // Usar el mensaje directamente si contiene la palabra clave (nuevo flujo)
        else if (activity.message && activity.message !== 'Sin descripción') {
          description = activity.message;
        }
        // Mantener compatibilidad con registros antiguos
        else if (activity.taskId && activity.taskId.keywords) {
          // Las palabras clave pueden estar como string o array
          const keywords = typeof activity.taskId.keywords === 'string'
            ? activity.taskId.keywords.split(',').map(k => k.trim())
            : activity.taskId.keywords;
            
          // Comprobar si alguna de las palabras clave está en el mensaje
          const messageText = activity.metadata?.fullText || activity.message || '';
          const foundKeyword = keywords.find(keyword => 
            messageText.toLowerCase().includes(keyword.toLowerCase())
          );
          
          // Si encontramos una coincidencia exacta, mostrar solo la palabra clave
          if (foundKeyword) {
            description = foundKeyword;
          }
        }
        break;
      default:
        activityType = activity.type || 'Desconocido';
        break;
    }
    
    // Formatear coordenadas si existen
    let coordinates = '';
    if (activity.metadata && activity.metadata.coordinates) {
      const { latitude, longitude } = activity.metadata.coordinates;
      coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    
    // Obtener información de tarea asociada
    let task = '';
    if (activity.taskId) {
      task = activity.taskId.title || 'Tarea sin título';
    }
    
    // Calcular duración si existe
    let duration = '';
    if (activity.metadata && activity.metadata.duration) {
      duration = (activity.metadata.duration / 60).toFixed(2); // Convertir segundos a minutos
    }
    
    return {
      date,
      time,
      activityType,
      description,
      coordinates,
      task,
      duration
    };
  } catch (error) {
    console.error('Error al procesar información de actividad:', error);
    return {
      date: moment(activity.createdAt).tz('America/Chicago').format('DD/MM/YYYY'),
      time: moment(activity.createdAt).tz('America/Chicago').format('HH:mm:ss'),
      activityType: activity.type || 'Desconocido',
      description: 'Error al procesar descripción',
      coordinates: '',
      task: '',
      duration: ''
    };
  }
};

/**
 * Función auxiliar para crear secciones por tipo de actividad en una hoja
 * @param {Object} sheet - Hoja de Excel
 * @param {Array} activities - Lista de actividades
 */
const createActivitySections = async (sheet, activities) => {
  try {
    // Zona horaria de Brownsville, TX
    const TIMEZONE = 'America/Chicago';
    
    // Agrupar actividades por tipo
    const availabilityActivities = activities.filter(a => 
      a.type === 'clock_in' || a.type === 'clock_out' || 
      a.type === 'started_working' || a.type === 'stopped_working'
    );
    
    const locationActivities = activities.filter(a => 
      a.type === 'location_enter' || a.type === 'location_exit'
    );
    
    const taskActivities = activities.filter(a => 
      a.type === 'task_create' || a.type === 'task_update' || 
      a.type === 'task_complete' || a.type === 'task_delete' ||
      a.type === 'voice_note' // Incluir voice_note en actividades de tareas
    );
    
    const otherActivities = activities.filter(a => 
      !['clock_in', 'clock_out', 'started_working', 'stopped_working',
        'location_enter', 'location_exit',
        'task_create', 'task_update', 'task_complete', 'task_delete', 'voice_note'
      ].includes(a.type)
    );
    
    let currentRow = 2; // Empezar después del encabezado
    
    // Función para añadir un grupo de actividades con encabezado
    const addActivityGroup = async (title, activityList) => {
      if (activityList.length === 0) return;
      
      // Añadir encabezado de sección
      const headerRow = sheet.addRow({
        date: title
      });
      
      // Estilo para el encabezado de sección
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3E5FF' }
        };
      });
      
      currentRow++;
      
      // Añadir actividades de esta sección
      for (const activity of activityList) {
        const activityInfo = await getActivityInfo(activity);
        
        sheet.addRow({
          date: activityInfo.date,
          time: activityInfo.time,
          activityType: activityInfo.activityType,
          description: activityInfo.description,
          coordinates: activityInfo.coordinates,
          task: activityInfo.task,
          duration: activityInfo.duration
        });
        
        currentRow++;
      }
      
      // Añadir una fila en blanco después de cada sección
      sheet.addRow({});
      currentRow++;
    };
    
    // Añadir cada grupo de actividades
    await addActivityGroup('ACTIVIDADES DE DISPONIBILIDAD', availabilityActivities);
    await addActivityGroup('ACTIVIDADES DE UBICACIÓN', locationActivities);
    await addActivityGroup('ACTIVIDADES DE TAREAS', taskActivities);
    await addActivityGroup('OTRAS ACTIVIDADES', otherActivities);
    
  } catch (error) {
    console.error('Error al crear secciones de actividad:', error);
    // Continuar sin secciones
  }
};

/**
 * Función auxiliar para crear una sección de actividades por tarea
 * @param {Object} sheet - Hoja de Excel
 * @param {String} title - Título de la sección
 * @param {Array} activities - Lista de actividades
 */
const addTaskSection = async (sheet, title, activities) => {
  try {
    // Usar la zona horaria de Brownsville, TX
    const TIMEZONE = 'America/Chicago';
    
    // Añadir encabezado de sección
    const headerRow = sheet.addRow({
      date: title
    });
    
    // Estilo para el encabezado de sección
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3E5FF' }
      };
    });
    
    // Añadir actividades de esta sección
    for (const activity of activities) {
      const activityInfo = await getActivityInfo(activity);
      
      sheet.addRow({
        date: activityInfo.date,
        time: activityInfo.time,
        activityType: activityInfo.activityType,
        description: activityInfo.description,
        coordinates: activityInfo.coordinates,
        task: activityInfo.task,
        duration: activityInfo.duration
      });
    }
    
    // Añadir una fila en blanco después de cada sección
    sheet.addRow({});
  } catch (error) {
    console.error('Error al crear sección de tarea:', error);
    // Continuar sin secciones
  }
};
