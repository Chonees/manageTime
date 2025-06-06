/**
 * Task Report Controller - Specialized report generator for task-based activities
 * 
 * This controller generates detailed Excel reports focused on task activities,
 * organized by user and task, with clear sections showing task lifecycle.
 */

const Excel = require('exceljs');
const moment = require('moment-timezone');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const jwt = require('jsonwebtoken');

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
            _id: user._id,
            username: user.username,
            role: 'admin', // Establecer role para compatibilidad
            isAdmin: true
          };
          console.log('Usuario autenticado como admin');
          return true;
        } else {
          console.log('Usuario no es admin:', user ? (user.isAdmin ? 'Es admin' : 'No es admin') : 'rol desconocido');
          return res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
        }
      }
    } catch (error) {
      console.error('Error al verificar token:', error);
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
  }
  
  // Si hay un usuario autenticado por middleware estándar, verificar si es admin
  if (req.user && req.user.isAdmin) {
    console.log('Usuario ya autenticado como admin por middleware');
    return true;
  }
  
  console.log('No se proporcionó token de autenticación');
  return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
};

/**
 * Generates an Excel report of task-based activities
 * @param {Object} req - Request object with filter params
 * @param {Object} res - Response object for sending the Excel file
 */
exports.generateTaskReport = async (req, res) => {
  try {
    // Verificar autenticación usando el token de la consulta primero
    const isAuthenticated = await verifyAdminToken(req, res);
    if (!isAuthenticated) {
      // Si verifyAdminToken no devuelve true, ya ha enviado una respuesta de error
      return;
    }
    console.log('Generating task-based Excel report with params:', req.query);
    
    // Initialize tracking variables
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    
    // Parse filter parameters
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const userId = req.query.userId;
    
    // Leer opciones de formato
    const formatVoiceNotes = req.query.formatVoiceNotes === 'true';
    const groupByTask = req.query.groupByTask === 'true'; // Esto ya lo hacemos por defecto
    
    // Configure date filters if provided
    if (endDate) {
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Create activity filter
    let filter = {};
    
    // Add date filters if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }
    
    // Only include task-related activities
    filter.type = { 
      $in: [
        'task_create', 
        
        'task_complete', 
        'task_delete', 
        'task_assign',
        'task_accept', 
        'task_reject',
        'task_on_site',
        'voice_note',
        'NOTES' // Añadido nuevo tipo para notas de voz/keywords
      ]
    };
    
    // Add user filter if provided
    if (userId) {
      filter.userId = userId;
    }
    
    console.log('Using filter:', JSON.stringify(filter));
    
    // Create a new Excel workbook
    const workbook = new Excel.Workbook();
    
    // Set workbook properties
    workbook.creator = 'ManageTime App';
    workbook.lastModifiedBy = 'ManageTime App';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Define styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4A86E8' }
      },
      alignment: { horizontal: 'center' }
    };
    
    const sectionHeaderStyle = {
      font: { bold: true, color: { argb: '000000' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E6E6E6' }
      }
    };
    
    const taskHeaderStyle = {
      font: { bold: true, color: { argb: '000000' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD966' }
      }
    };
    
    const stateStyles = {
      'waiting_for_acceptance': {
        font: { color: { argb: 'FF9900' } }
      },
      'on_the_way': {
        font: { color: { argb: '3D85C6' } }
      },
      'on_site': {
        font: { color: { argb: '6AA84F' } }
      },
      'completed': {
        font: { color: { argb: '38761D' }, bold: true }
      }
    };
    
    // Create summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Configure summary sheet columns
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];
    
    // Apply style to summary header
    summarySheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Create activities sheet
    const activitiesSheet = workbook.addWorksheet('All Activities');
    
    // Configure activities sheet columns
    activitiesSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'User', key: 'username', width: 20 },
      { header: 'Task', key: 'task', width: 25 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Details', key: 'details', width: 40 }
    ];
    
    // Apply style to activities header
    activitiesSheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Find all users with task activities
    const userIds = await Activity.distinct('userId', filter);
    console.log(`Found ${userIds.length} users with task activities`);
    
    // Process each user
    for (const uid of userIds) {
      try {
        // Get user information
        const user = await User.findById(uid);
        
        if (!user) {
          console.warn(`User with ID ${uid} not found, skipping`);
          continue;
        }
        
        console.log(`Processing activities for user: ${user.username}`);
        
        // Create a sheet for this user
        const userSheet = workbook.addWorksheet(`User - ${user.username}`);
        
        // Configure user sheet columns
        userSheet.columns = [
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Time', key: 'time', width: 10 },
          { header: 'Task', key: 'task', width: 25 },
          { header: 'Action', key: 'action', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Details', key: 'details', width: 40 }
        ];
        
        // Apply style to user sheet header
        userSheet.getRow(1).eachCell((cell) => {
          cell.style = headerStyle;
        });
        
        // Get all activities for this user
        const userFilter = { ...filter, userId: uid };
        const activities = await Activity.find(userFilter)
          .sort({ createdAt: 1 })
          .populate('taskId', 'title status')
          .populate('userId', 'username');
        
        console.log(`Found ${activities.length} activities for user ${user.username}`);
        
        // Get all tasks associated with this user's activities
        const taskIds = [...new Set(activities
          .filter(a => a.taskId)
          .map(a => a.taskId._id.toString()))];
        
        console.log(`Found ${taskIds.length} tasks for user ${user.username}`);
        
        // Group activities by task
        for (const taskId of taskIds) {
          // Get all activities for this task
          const taskActivities = activities.filter(a => 
            a.taskId && a.taskId._id.toString() === taskId
          );
          
          if (taskActivities.length === 0) continue;
          
          // Get the task name
          const taskName = taskActivities[0].taskId?.title || 'Unnamed Task';
          
          // Add task header to user sheet
          const taskHeaderRow = userSheet.addRow({
            date: `TAREA: ${taskName}`
          });
          
          // Apply task header style
          taskHeaderRow.eachCell((cell) => {
            cell.style = taskHeaderStyle;
          });
          
          // Track task status
          let lastStatus = '';
          
          // Add all activities for this task
          for (const activity of taskActivities) {
            // Format date and time
            const activityDate = moment(activity.createdAt).format('YYYY-MM-DD');
            const activityTime = moment(activity.createdAt).format('HH:mm:ss');
            
            // Determine activity details
            let actionType = '';
            let statusText = '';
            let details = activity.message || '';
            
            // Update status if it's in the metadata
            if (activity.metadata && activity.metadata.status) {
              lastStatus = activity.metadata.status;
            }
            
            // Determine action type and status based on activity type
            switch (activity.type) {
              case 'task_create':
                actionType = 'Created';
                statusText = 'waiting_for_acceptance';
                break;

                actionType = 'Updated';
                if (activity.metadata && activity.metadata.changes) {
                  details = `Changes: ${JSON.stringify(activity.metadata.changes)}`;
                }
                break;
              case 'task_complete':
                actionType = 'Completed';
                statusText = 'completed';
                break;
              case 'task_delete':
                actionType = 'Deleted';
                break;
              case 'task_assign':
                actionType = 'Assigned';
                details = `Assigned to: ${activity.metadata?.assignee || 'Unknown'}`;
                break;
              case 'task_accept':
                actionType = 'Accepted';
                statusText = 'on_the_way';
                break;
              case 'task_reject':
                actionType = 'Rejected';
                break;
              case 'task_on_site':
                actionType = 'Arrived at site';
                statusText = 'on_site';
                break;
              case 'voice_note':
              case 'NOTES':
                // Si se solicita formatear notas de voz, mostrarlas como NOTA
                actionType = formatVoiceNotes ? 'NOTE' : 'Note';
                // Usar el mensaje de la actividad o texto en metadata como keyword
                details = activity.message || 
                  (activity.metadata && activity.metadata.keyword ? activity.metadata.keyword : '') || 
                  (activity.metadata && activity.metadata.fullText ? activity.metadata.fullText : '');
                break;
              default:
                actionType = activity.type;
            }
            
            // Add activity row
            const activityRow = userSheet.addRow({
              date: activityDate,
              time: activityTime,
              task: taskName,
              action: actionType,
              status: statusText || lastStatus,
              details: details
            });
            
            // Apply status-specific styling if applicable
            if (statusText && stateStyles[statusText]) {
              activityRow.getCell('status').style = stateStyles[statusText];
            }
            
            // Add to activities sheet (combined sheet)
            activitiesSheet.addRow({
              date: activityDate,
              time: activityTime,
              username: user.username,
              task: taskName,
              action: actionType,
              status: statusText || lastStatus,
              details: details
            });
          }
          
          // Add empty row after task section
          userSheet.addRow({});
          
          // Add a divider line
          const dividerRow = userSheet.addRow({
            date: '----------------------------'
          });
          dividerRow.font = { italic: true, color: { argb: '888888' } };
          userSheet.addRow({});
        }
        
        // Activities without a task
        const untaskedActivities = activities.filter(a => !a.taskId);
        
        if (untaskedActivities.length > 0) {
          // Add section header
          const otherHeaderRow = userSheet.addRow({
            date: 'OTHER ACTIVITIES'
          });
          
          // Apply section header style
          otherHeaderRow.eachCell((cell) => {
            cell.style = sectionHeaderStyle;
          });
          
          // Add activities without tasks
          for (const activity of untaskedActivities) {
            // Format date and time
            const activityDate = moment(activity.createdAt).format('YYYY-MM-DD');
            const activityTime = moment(activity.createdAt).format('HH:mm:ss');
            
            // Add to user sheet
            userSheet.addRow({
              date: activityDate,
              time: activityTime,
              task: 'N/A',
              action: activity.type,
              status: 'N/A',
              details: activity.message
            });
            
            // Add to activities sheet
            activitiesSheet.addRow({
              date: activityDate,
              time: activityTime,
              username: user.username,
              task: 'N/A',
              action: activity.type,
              status: 'N/A',
              details: activity.message
            });
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${uid}:`, userError);
        // Continue with other users
      }
    }
    
    // Get task stats for summary
    const tasks = await Task.find({});
    totalTasks = tasks.length;
    completedTasks = tasks.filter(t => t.completed).length;
    pendingTasks = totalTasks - completedTasks;
    
    // Add task stats to summary
    summarySheet.addRow({ metric: 'Total Tasks', value: totalTasks });
    summarySheet.addRow({ metric: 'Completed Tasks', value: completedTasks });
    summarySheet.addRow({ metric: 'Pending Tasks', value: pendingTasks });
    
    // Add status counts
    const statusCounts = {};
    for (const task of tasks) {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    }
    
    summarySheet.addRow({ metric: '', value: '' });
    summarySheet.addRow({ metric: 'TASK STATUS COUNTS', value: '' });
    for (const status in statusCounts) {
      summarySheet.addRow({ metric: `Status: ${status}`, value: statusCounts[status] });
    }
    
    // Add filter details to summary
    summarySheet.addRow({ metric: '', value: '' });
    summarySheet.addRow({ metric: 'REPORT FILTERS', value: '' });
    if (startDate) summarySheet.addRow({ metric: 'Start Date', value: moment(startDate).format('YYYY-MM-DD') });
    if (endDate) summarySheet.addRow({ metric: 'End Date', value: moment(endDate).format('YYYY-MM-DD') });
    if (userId) {
      const userInfo = await User.findById(userId);
      summarySheet.addRow({ metric: 'User', value: userInfo ? userInfo.username : userId });
    }
    
    // Add report generation details
    summarySheet.addRow({ metric: '', value: '' });
    summarySheet.addRow({ metric: 'Report Generated', value: moment().format('YYYY-MM-DD HH:mm:ss') });
    summarySheet.addRow({ metric: 'Generated By', value: req.user ? req.user.username : 'System' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=task_report_${moment().format('YYYY-MM-DD')}.xlsx`);
    
    // Send Excel file
    await workbook.xlsx.write(res);
    res.end();
    
    console.log('Task report generated and sent successfully');
    
  } catch (error) {
    console.error('Error generating task report:', error);
    
    // Avoid sending headers if they're already sent
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error generating task report', 
        error: error.message 
      });
    } else {
      res.end();
    }
  }
};
