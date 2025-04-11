import React, { createContext, useState, useContext } from 'react';

// Translations
export const translations = {
  en: {
    login: 'Login',
    username: 'Username',
    password: 'Password',
    loginButton: 'Login',
    noAccount: "Don't have an account?",
    registerHere: 'Register here',
    diagnostic: 'Diagnose connection issues',
    error: 'Error',
    pleaseEnter: 'Please enter username and password',
    loginError: 'Login error',
    tryAgain: 'Try again',
    unexpectedError: 'An unexpected error occurred during login. Please try again.',
    
    // Admin panel translations
    adminDashboard: 'Admin Dashboard',
    welcomeAdmin: 'Welcome, Admin',
    totalUsers: 'Total Users',
    activeUsers: 'Active Users',
    totalTasks: 'Total Tasks',
    completedTasks: 'Completed Tasks',
    pendingTasks: 'Pending Tasks',
    completionRate: 'Completion Rate',
    userManagement: 'User Management',
    taskManagement: 'Task Management',
    locationHistory: 'Location History',
    viewAllActivities: 'View All Activities',
    statistics: 'Statistics',
    quickActions: 'Quick Actions',
    recentActivity: 'Recent Activity',
    noRecentActivity: 'No recent activity to show',
    loading: 'Loading...',
    logOut: 'Log Out',
    unknownDate: 'Unknown date',
    unknownActivity: 'Unknown activity',
    daysAgo: 'days ago',
    hoursAgo: 'hours ago',
    minutesAgo: 'minutes ago',
    secondsAgo: 'seconds ago',
    someTimeAgo: 'some time ago',
    
    // Activity translations
    userActivities: 'User Activities',
    showingActivities: 'Showing {{count}} of {{total}} activities',
    retry: 'Retry',
    noActivities: 'No activities to show',
    loadMore: 'Load More',
    loadingMore: 'Loading more...',
    activityTypes: 'Activity Types',
    locationEnter: 'entered location',
    locationExit: 'exited location',
    taskComplete: 'completed task',
    taskCreate: 'created task',
    taskUpdate: 'Updated task',
    taskDelete: 'Deleted task',
    activity: 'Activity',
    unknownUser: 'Unknown user',
    unknownTask: 'Unknown task',
    taskCreated: 'created task "{{task}}"',
    taskCompleted: 'completed task "{{task}}"',
    taskDeleted: 'deleted task "{{task}}"',
    taskUpdated: 'updated task "{{task}}"',
    startedWorkingAt: 'started working at "{{location}}"',
    stoppedWorkingAt: 'stopped working at "{{location}}"',
    enteredLocation: 'entered location "{{location}}"',
    exitedLocation: 'exited location "{{location}}"',
    
    // Activity screen translations
    yourActivity: 'Your Activity',
    activityHistoryFor: 'Activity history for',
    myActivity: 'My Activity',
    
    // User Management translations
    searchUsers: 'Search users...',
    loadingUsers: 'Loading users...',
    noUsers: 'No registered users',
    userDetails: 'User Details',
    userId: 'ID',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    registrationDate: 'Registration Date',
    close: 'Close',
    activate: 'Activate',
    deactivate: 'Deactivate',
    normalUser: 'Normal User',
    adminUser: 'Administrator',
    active: 'Active',
    inactive: 'Inactive',
    confirmDelete: 'Confirm Deletion',
    deleteConfirmation: 'Are you sure you want to delete this user? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    userDeleted: 'User deleted successfully',
    userUpdated: 'User updated successfully',
    errorUpdatingUser: 'Error updating user',
    errorDeletingUser: 'Error deleting user',
    noEmail: 'No email',
    manageTasks: 'Manage Tasks',
    createTask: 'Create Task',
    editTask: 'Edit Task',
    deleteTask: 'Delete Task',
    taskTitle: 'Task Title',
    taskDescription: 'Description',
    taskDueDate: 'Due Date',
    taskPriority: 'Priority',
    taskStatus: 'Status',
    taskAssignee: 'Assignee',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
    saveTask: 'Save Task',
    noTasks: 'No tasks found',
    searchTasks: 'Search tasks...',
    filterTasks: 'Filter Tasks',
    allTasks: 'All Tasks',
    myTasks: 'My Tasks',
    taskDetails: 'Task Details',
    createdBy: 'Created by',
    lastUpdated: 'Last updated',
    comments: 'Comments',
    addComment: 'Add a comment...',
    postComment: 'Post',
    taskHistory: 'Task History',
    taskAttachments: 'Attachments',
    uploadFile: 'Upload File',
    errorCreatingTask: 'Error creating task',
    errorUpdatingTask: 'Error updating task',
    errorDeletingTask: 'Error deleting task',
    
    // Location service errors and recovery
    locationServicesHelp: 'Location services are unavailable. Please enable location services or try using the last known location.',
    useLastKnownLocation: 'Use Last Known Location',
    lastLocationTooOld: 'Your last known location is too old (more than 1 hour). Please enable location services.',
    noLastLocation: 'No previous location data available. Please enable location services.',
    locationTrackingError: 'Error tracking location: {{error}}',
    locationErrorGeneric: 'There was a problem getting your location. Please check your device settings.',
    openSettings: 'Open Settings',
    
    addLocation: 'Add Location',
    apply: 'Apply',
    search: 'Search',
    loadingMap: 'Loading map...',
    customRadius: 'Custom Radius',
    radiusDescription: 'Show me only posts within a specific distance.',
    placeHere: 'Place Here',
    myLocation: 'My Location',
    locationPermissionDenied: 'Location permission denied',
    errorGettingLocation: 'Error getting location',
    errorGettingLocationName: 'Error getting location name',
    currentLocation: 'Current Location',
    meters: 'm',
    kilometers: 'km',
    selectUser: 'Select User',
    loadingLocations: 'Loading locations...',
    noLocations: 'No locations found',
    noRecordsForDate: 'No records found for the selected date',
    viewMap: 'View Map',
    viewList: 'View List',
    locationMap: 'Location map of',
    locations: 'locations',
    refresh: 'Refresh',
    autoRefresh: 'Auto Refresh',
    locationType: 'Location Type',
    locationDate: 'Date',
    locationCoords: 'Coordinates',
    locationTime: 'Time',
    enterLocation: 'Enter Location',
    exitLocation: 'Exit Location',
    locationDetails: 'Location Details',
    latitude: 'Latitude',
    longitude: 'Longitude',
    accuracy: 'Accuracy',
    timestamp: 'Timestamp',
    filterByDate: 'Filter by Date',
    clearFilter: 'Clear Filter',
    today: 'Today',
    yesterday: 'Yesterday',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
    customDate: 'Custom Date',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    applyFilter: 'Apply Filter',
    addNewTask: 'Add New Task',
    addTask: 'Add Task',
    tasksWillAppearHere: 'Tasks will appear here',
    noTitle: 'No Title',
    assignedTo: 'Assigned to',
    noUserAssigned: 'No user assigned',
    selectedLocation: 'Selected Location',
    selectedUser: 'Selected User',
    assignUser: 'Assign User',
    taskTitleRequired: 'Task title is required',
    success: 'Success',
    total: 'Total',
    loadingTasks: 'Loading tasks...',
    tasksLoaded: 'Tasks loaded: {{count}}',
    errorLoadingTasks: 'Error loading tasks',
    errorLoadingUsers: 'Error loading users',
    locationSelected: 'Location selected: {{coordinates}} with radius {{radius}}m at {{place}}',
    addLocationAndRadius: 'Add Location and Radius',
    assignToUser: 'Assign To User',
    mapView: 'Map View',
    listView: 'List View',
    selectDate: 'Select Date',
    autoRefreshOn: 'Auto Refresh: On',
    autoRefreshOff: 'Auto Refresh: Off',
    location: 'Location',
    loadingLocation: 'Getting your location...',
    mapError: 'Error loading map',
    yourLocation: 'Your Location',
    working: 'Working',
    notWorking: 'Not Working',
    workTime: 'Work Time',
    startWork: 'Start Work',
    endWork: 'End Work',
    updating: 'Updating...',
    updateLocation: 'Update Location',
    noLocationError: 'Could not get location',
    adminAccessRequired: 'You need administrator privileges to access this screen',
    locationPermissionRequired: 'This app requires access to your location to function. Please enable location services in your device settings.',
    locationServicesDisabled: 'Location services are disabled. Please enable them in your device settings.',
    invalidCoordinates: 'Invalid or incomplete coordinates',
    locationError: 'Could not get location',
    unknownError: 'Unknown error',
    retry: 'Retry',
    workingSince: 'Working since',
    workStarted: 'You have started your work shift',
    workEnded: 'You have ended your work shift',
    errorStartingWork: 'Could not start work',
    errorEndingWork: 'Could not end work',
    viewAllTasks: 'View all tasks',
    verificationRequired: 'Verification Required',
    enterVerificationCode: 'Enter the verification code',
    timeRemaining: 'Time remaining: {{time}} seconds',
    verify: 'Verify',
    verificationFailed: 'Verification failed',
    verificationSuccess: 'Verification successful',
    listening: 'Listening...',
    speakCode: 'Speak the code',
    codeMismatch: 'The code does not match',
    verificationTimeout: 'Verification timeout',
    audioPermissionRequired: 'Audio permission is required for voice verification',
    errorProcessingAudio: 'Error processing audio',
    errorRecognizingSpeech: 'Error recognizing speech',
    enterCode: 'Enter code',
    errorProcessingVerification: 'Error processing verification',
    noPendingTasks: 'No pending tasks',
    locationPermissionDenied: 'Location permission was denied. You need to enable location permissions to track proximity to tasks.',
    locationTrackingError: 'Error tracking location: {{error}}',
    withinTaskRadius: 'You are within {{distance}}m of task: {{taskTitle}}',
    outsideTaskRadius: 'You are {{distance}}m away from task: {{taskTitle}} (radius: {{radius}}m)',
    locationUpdateReceived: 'Location update received',
    usingCachedUsername: 'Using cached username for task {{taskId}}: {{username}}',
    startingLocationTracking: 'Starting location tracking for task',
    initialLocationReading: 'Initial location reading received',
    
    // TaskDetails screen
    taskNotFound: 'Task not found',
    errorLoadingTaskDetails: 'Error loading task details',
    errorUpdatingTask: 'Error updating task',
    taskMarkedComplete: 'Task marked as complete',
    taskMarkedIncomplete: 'Task marked as incomplete',
    confirmDelete: 'Confirm Deletion',
    confirmDeleteTaskMessage: 'Are you sure you want to delete this task?',
    taskDeleted: 'Task deleted successfully',
    errorDeletingTask: 'Error deleting task',
    description: 'Description',
    noDescription: 'No description',
    createdAt: 'Created',
    updatedAt: 'Updated',
    taskLocation: 'Task Location',
    radius: 'Radius',
    backToTasks: 'Back to Tasks',
    goBack: 'Go Back',
    retry: 'Retry',
    pending: 'Pending',
    completed: 'Completed',
    noTasksYet: 'No tasks yet. They will appear here when you create them.',
    enterActivity: 'Enter your activity (e.g. "Emptied tank", "Fixed valve")',
    submitActivity: 'Submit Activity',
    activityRecorded: 'Activity recorded successfully',
    pleaseEnterActivity: 'Please enter an activity',
    startTaskFirst: 'You need to start the task first',
    errorSubmittingActivity: 'Error submitting activity',
    taskActivities: 'Task Activities',
    noActivitiesYet: 'No activities recorded yet',
    unauthorizedAction: 'You are not authorized to perform this action',
    
    // Task start/end feature
    startTask: 'Start Task',
    endTask: 'End Task',
    mustBeWithinRadius: 'You must be within the task radius to start it',
    taskStarted: 'Task started successfully',
    taskCompleted: 'Task completed successfully',
    taskStartedAt: 'Task {{title}} started',
    taskCompletedAt: 'Task {{title}} completed',
    errorStartingTask: 'Error starting task',
    errorCompletingTask: 'Error completing task',
    yourLocation: 'Your Location',
    
    // Location tracking messages
    startingLocationTracking: "Starting location tracking...",
    locationPermissionDenied: "Location permission was denied",
    gettingInitialLocation: "Getting initial location reading with highest accuracy...",
    initialLocationReading: "Initial location reading obtained",
    settingUpLocationTracking: "Setting up continuous location tracking...",
    locationUpdateReceived: "Location update received",
    locationCoordinates: "Location: ${lat}, ${lng} (±${accuracy}m)",
    locationTrackingStarted: "Location tracking successfully started",
    locationTrackingError: "Error starting location tracking: ${error}",
    
    // Radius check messages
    radiusCheckDivider: "---------- RADIUS CHECK ----------",
    checkingTaskRadius: "Checking if within task radius - Task ID: ${taskId}",
    taskMissingCoordinates: "Task missing valid coordinates: ${location}",
    taskPosition: "Task position: ${position}",
    taskRadius: "Task radius: ${radius} meters",
    userPosition: "User position: ${position}",
    distanceToTask: "Distance to task: ${km} km / ${meters} meters",
    withinTaskRadius: "WITHIN RADIUS",
    outsideTaskRadius: "OUTSIDE RADIUS",
    updatingRadiusState: "Updating within radius state from ${from} to ${to}",
    
    // Dashboard screen
    noPendingTasks: "No pending tasks",
    
    // Map diagnostics
    runDiagnostics: 'Run Map Diagnostics',
    dashboard: {
      welcome: 'Welcome',
      user: 'User',
      admin: 'Administrator',
      employee: 'Employee',
      tasks: 'My Tasks',
      trackingHistory: 'Tracking History',
    },
    trackingHistory: 'Tracking History',
    
    // Login screen
    hello: 'Hello.',
    welcomeBack: 'Welcome back',
    email: 'Email',
    password: 'Password',
    enterEmail: 'Enter email',
    enterPassword: 'Enter password',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign In',
    signUp: 'Sign up',
    or: 'OR CONTINUE WITH',
    dontHaveAccount: "Don't have an account?",
    pleaseEnterEmailAndPassword: 'Please enter email and password',
    loginError: 'Login Error',
    anUnexpectedErrorOccurred: 'An unexpected error occurred',
    pleaseTryAgain: 'Please try again',
    
    // Voice assistant
    voiceAssistant: "Voice Assistant",
    typeSomething: "Type something...",
    voiceAssistantHelp: "This simulator lets you test the voice assistant. Type 'bitacora' to start a voice note.",
    voiceCommandsHelp: "Voice commands available: 'bitacora' (starts recording), 'yes/no' (confirmation)",
    voiceAssistantActive: "Voice assistant active and listening for 'bitacora'",
    voiceAssistantError: "Could not activate voice assistant. Check microphone permissions.",
  },
  es: {
    login: 'Iniciar Sesión',
    username: 'Usuario',
    password: 'Contraseña',
    loginButton: 'Iniciar Sesión',
    noAccount: '¿No tienes una cuenta?',
    registerHere: 'Regístrate aquí',
    diagnostic: 'Diagnosticar problemas de conexión',
    error: 'Error',
    pleaseEnter: 'Por favor ingresa usuario y contraseña',
    loginError: 'Error de inicio de sesión',
    tryAgain: 'Intenta nuevamente',
    unexpectedError: 'Ocurrió un error durante el inicio de sesión. Intenta nuevamente.',
    
    // Admin panel translations
    adminDashboard: 'Panel de Administración',
    welcomeAdmin: 'Bienvenido, Administrador',
    totalUsers: 'Usuarios Totales',
    activeUsers: 'Usuarios Activos',
    totalTasks: 'Tareas Totales',
    completedTasks: 'Tareas Completadas',
    pendingTasks: 'Tareas Pendientes',
    completionRate: 'Tasa de Completado',
    userManagement: 'Gestión de Usuarios',
    taskManagement: 'Gestión de Tareas',
    locationHistory: 'Historial de Ubicaciones',
    viewAllActivities: 'Ver Todas las Actividades',
    statistics: 'Estadísticas',
    quickActions: 'Acciones Rápidas',
    recentActivity: 'Actividad Reciente',
    noRecentActivity: 'No hay actividad reciente para mostrar',
    loading: 'Cargando...',
    logOut: 'Cerrar Sesión',
    unknownDate: 'Fecha desconocida',
    unknownActivity: 'Actividad desconocida',
    daysAgo: 'días atrás',
    hoursAgo: 'horas atrás',
    minutesAgo: 'minutos atrás',
    secondsAgo: 'segundos atrás',
    someTimeAgo: 'hace un tiempo',
    
    // Activity translations
    userActivities: 'Actividades de Usuarios',
    showingActivities: 'Mostrando {{count}} de {{total}} actividades',
    retry: 'Reintentar',
    noActivities: 'No hay actividades para mostrar',
    loadMore: 'Cargar más',
    loadingMore: 'Cargando más...',
    activityTypes: 'Tipos de Actividades',
    locationEnter: 'entró a ubicación',
    locationExit: 'salió de ubicación',
    taskComplete: 'completó tarea',
    taskCreate: 'creó tarea',
    taskUpdate: 'Actualizó tarea',
    taskDelete: 'Eliminó tarea',
    activity: 'Actividad',
    unknownUser: 'Usuario desconocido',
    unknownTask: 'Tarea desconocida',
    taskCreated: 'creó la tarea "{{task}}"',
    taskCompleted: 'completó la tarea "{{task}}"',
    taskDeleted: 'eliminó la tarea "{{task}}"',
    taskUpdated: 'actualizó la tarea "{{task}}"',
    startedWorkingAt: 'comenzó a trabajar en "{{location}}"',
    stoppedWorkingAt: 'dejó de trabajar en "{{location}}"',
    enteredLocation: 'entró a la ubicación "{{location}}"',
    exitedLocation: 'salió de la ubicación "{{location}}"',
    
    // Activity screen translations
    yourActivity: 'Tu Actividad',
    activityHistoryFor: 'Historial de actividad para',
    myActivity: 'Mi Actividad',
    
    // User Management translations
    searchUsers: 'Buscar usuarios...',
    loadingUsers: 'Cargando usuarios...',
    noUsers: 'No hay usuarios registrados',
    userDetails: 'Detalles del Usuario',
    userId: 'ID',
    email: 'Correo electrónico',
    role: 'Rol',
    status: 'Estado',
    registrationDate: 'Fecha de registro',
    close: 'Cerrar',
    activate: 'Activar',
    deactivate: 'Desactivar',
    normalUser: 'Usuario normal',
    adminUser: 'Administrador',
    active: 'Activo',
    inactive: 'Inactivo',
    confirmDelete: 'Confirmar Eliminación',
    deleteConfirmation: '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    userDeleted: 'Usuario eliminado correctamente',
    userUpdated: 'Usuario actualizado correctamente',
    errorUpdatingUser: 'Error al actualizar usuario',
    errorDeletingUser: 'Error al eliminar usuario',
    noEmail: 'Sin email',
    manageTasks: 'Gestionar Tareas',
    createTask: 'Crear Tarea',
    editTask: 'Editar Tarea',
    deleteTask: 'Eliminar Tarea',
    taskTitle: 'Título de la Tarea',
    taskDescription: 'Descripción',
    taskDueDate: 'Fecha de Vencimiento',
    taskPriority: 'Prioridad',
    taskStatus: 'Estado',
    taskAssignee: 'Asignado a',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    pending: 'Pendiente',
    inProgress: 'En Progreso',
    completed: 'Completada',
    saveTask: 'Guardar Tarea',
    noTasks: 'No se encontraron tareas',
    searchTasks: 'Buscar tareas...',
    filterTasks: 'Filtrar Tareas',
    allTasks: 'Todas las Tareas',
    myTasks: 'Mis Tareas',
    taskDetails: 'Detalles de la Tarea',
    createdBy: 'Creado por',
    lastUpdated: 'Última actualización',
    comments: 'Comentarios',
    addComment: 'Agregar un comentario...',
    postComment: 'Publicar',
    taskHistory: 'Historial de la Tarea',
    taskAttachments: 'Archivos Adjuntos',
    uploadFile: 'Subir Archivo',
    errorCreatingTask: 'Error al crear la tarea',
    errorUpdatingTask: 'Error al actualizar la tarea',
    errorDeletingTask: 'Error al eliminar la tarea',
    
    // Location service errors and recovery
    locationServicesHelp: 'Location services are unavailable. Please enable location services or try using the last known location.',
    useLastKnownLocation: 'Use Last Known Location',
    lastLocationTooOld: 'Your last known location is too old (more than 1 hour). Please enable location services.',
    noLastLocation: 'No previous location data available. Please enable location services.',
    locationTrackingError: 'Error tracking location: {{error}}',
    locationErrorGeneric: 'There was a problem getting your location. Please check your device settings.',
    openSettings: 'Open Settings',
    
    addLocation: 'Añadir ubicación',
    apply: 'Aplicar',
    search: 'Buscar',
    loadingMap: 'Cargando mapa...',
    customRadius: 'Radio personalizado',
    radiusDescription: 'Mostrarme únicamente publicaciones dentro de una distancia específica.',
    placeHere: 'Colocar aquí',
    myLocation: 'Mi ubicación',
    locationPermissionDenied: 'Permiso de ubicación denegado',
    errorGettingLocation: 'Error al obtener ubicación',
    errorGettingLocationName: 'Error al obtener nombre de ubicación',
    currentLocation: 'Ubicación actual',
    meters: 'm',
    kilometers: 'km',
    selectUser: 'Seleccionar Usuario',
    loadingLocations: 'Cargando ubicaciones...',
    noLocations: 'No se encontraron ubicaciones',
    noRecordsForDate: 'No se encontraron registros para la fecha seleccionada',
    viewMap: 'Ver Mapa',
    viewList: 'Ver Lista',
    locationMap: 'Mapa de ubicaciones de',
    locations: 'ubicaciones',
    refresh: 'Actualizar',
    autoRefresh: 'Actualización Automática',
    locationType: 'Tipo de Ubicación',
    locationDate: 'Fecha',
    locationCoords: 'Coordenadas',
    locationTime: 'Hora',
    enterLocation: 'Entrada a Ubicación',
    exitLocation: 'Salida de Ubicación',
    locationDetails: 'Detalles de Ubicación',
    latitude: 'Latitud',
    longitude: 'Longitud',
    accuracy: 'Precisión',
    timestamp: 'Fecha y Hora',
    filterByDate: 'Filtrar por Fecha',
    clearFilter: 'Limpiar Filtro',
    today: 'Hoy',
    yesterday: 'Ayer',
    lastWeek: 'Última Semana',
    lastMonth: 'Último Mes',
    customDate: 'Fecha Personalizada',
    day: 'Día',
    month: 'Mes',
    year: 'Año',
    applyFilter: 'Aplicar Filtro',
    addNewTask: 'Agregar Nueva Tarea',
    addTask: 'Agregar Tarea',
    tasksWillAppearHere: 'Las tareas aparecerán aquí',
    noTitle: 'Sin Título',
    assignedTo: 'Asignado a',
    noUserAssigned: 'Sin usuario asignado',
    selectedLocation: 'Ubicación Seleccionada',
    selectedUser: 'Usuario Seleccionado',
    assignUser: 'Asignar Usuario',
    taskTitleRequired: 'El título de la tarea es requerido',
    success: 'Éxito',
    total: 'Total',
    loadingTasks: 'Cargando tareas...',
    tasksLoaded: 'Tareas cargadas: {{count}}',
    errorLoadingTasks: 'Error al cargar las tareas',
    errorLoadingUsers: 'Error al cargar los usuarios',
    locationSelected: 'Ubicación seleccionada: {{coordinates}} con radio {{radius}}m en {{place}}',
    addLocationAndRadius: 'Agregar Ubicación y Radio',
    assignToUser: 'Asignar a Usuario',
    mapView: 'Vista de Mapa',
    listView: 'Vista de Lista',
    selectDate: 'Seleccionar Fecha',
    autoRefreshOn: 'Actualización Automática: Activada',
    autoRefreshOff: 'Actualización Automática: Desactivada',
    location: 'Ubicación',
    loadingLocation: 'Obteniendo tu ubicación...',
    mapError: 'Error al cargar el mapa',
    yourLocation: 'Tu Ubicación',
    working: 'Trabajando',
    notWorking: 'No Trabajando',
    workTime: 'Tiempo de Trabajo',
    startWork: 'Iniciar Trabajo',
    endWork: 'Finalizar Trabajo',
    updating: 'Actualizando...',
    updateLocation: 'Actualizar Ubicación',
    noLocationError: 'No se pudo obtener la ubicación',
    adminAccessRequired: 'Necesitas privilegios de administrador para acceder a esta pantalla',
    locationPermissionRequired: 'Esta aplicación requiere acceso a tu ubicación para funcionar. Por favor, habilita los servicios de ubicación en la configuración de tu dispositivo.',
    locationServicesDisabled: 'Los servicios de ubicación están desactivados. Por favor, actívalos en la configuración de tu dispositivo.',
    invalidCoordinates: 'Coordenadas inválidas o incompletas',
    locationError: 'No se pudo obtener la ubicación',
    unknownError: 'Error desconocido',
    retry: 'Reintentar',
    workingSince: 'Trabajando desde',
    workStarted: 'Has iniciado tu jornada de trabajo',
    workEnded: 'Has finalizado tu jornada de trabajo',
    errorStartingWork: 'No se pudo iniciar el trabajo',
    errorEndingWork: 'No se pudo finalizar el trabajo',
    viewAllTasks: 'Ver todas las tareas',
    verificationRequired: 'Verificación Requerida',
    enterVerificationCode: 'Ingrese el código de verificación',
    timeRemaining: 'Tiempo restante: {{time}} segundos',
    verify: 'Verificar',
    verificationFailed: 'Verificación fallida',
    verificationSuccess: 'Verificación exitosa',
    listening: 'Escuchando...',
    speakCode: 'Diga el código',
    codeMismatch: 'El código no coincide',
    verificationTimeout: 'Tiempo de verificación agotado',
    audioPermissionRequired: 'Se requieren permisos de audio para la verificación por voz',
    errorProcessingAudio: 'Error al procesar el audio',
    errorRecognizingSpeech: 'Error al reconocer el habla',
    enterCode: 'Ingrese código',
    errorProcessingVerification: 'Error al procesar la verificación',
    noPendingTasks: 'No hay tareas pendientes',
    locationPermissionDenied: 'Permiso de ubicación denegado. Necesitas habilitar los permisos de ubicación para rastrear la proximidad a las tareas.',
    locationTrackingError: 'Error al rastrear la ubicación: {{error}}',
    withinTaskRadius: 'Estás a menos de {{distance}}m de la tarea: {{taskTitle}}',
    outsideTaskRadius: 'Estás a {{distance}}m de la tarea: {{taskTitle}} (radio: {{radius}}m)',
    locationUpdateReceived: 'Actualización de ubicación recibida',
    usingCachedUsername: 'Usando nombre de usuario en caché para la tarea {{taskId}}: {{username}}',
    startingLocationTracking: 'Iniciando seguimiento de ubicación para la tarea',
    initialLocationReading: 'Lectura de ubicación inicial recibida',
    
    // TaskDetails screen
    taskNotFound: 'Tarea no encontrada',
    errorLoadingTaskDetails: 'Error al cargar los detalles de la tarea',
    errorUpdatingTask: 'Error al actualizar la tarea',
    taskMarkedComplete: 'Tarea marcada como completada',
    taskMarkedIncomplete: 'Tarea marcada como incompleta',
    confirmDelete: 'Confirmar Eliminación',
    confirmDeleteTaskMessage: '¿Estás seguro que deseas eliminar esta tarea?',
    taskDeleted: 'Tarea eliminada exitosamente',
    errorDeletingTask: 'Error al eliminar la tarea',
    description: 'Descripción',
    noDescription: 'Sin descripción',
    createdAt: 'Creada',
    updatedAt: 'Actualizada',
    taskLocation: 'Ubicación de la Tarea',
    radius: 'Radio',
    backToTasks: 'Volver a Tareas',
    goBack: 'Volver',
    retry: 'Reintentar',
    pending: 'Pendiente',
    completed: 'Completada',
    noTasksYet: 'No hay tareas todavía. Aparecerán aquí cuando las crees.',
    enterActivity: 'Ingrese su actividad (por ejemplo, "Vacié el tanque", "Arreglé la válvula")',
    submitActivity: 'Enviar Actividad',
    activityRecorded: 'Actividad registrada con éxito',
    pleaseEnterActivity: 'Por favor, ingrese una actividad',
    startTaskFirst: 'Debes iniciar la tarea primero',
    errorSubmittingActivity: 'Error al enviar la actividad',
    taskActivities: 'Actividades de la Tarea',
    noActivitiesYet: 'No se han registrado actividades todavía',
    unauthorizedAction: 'No estás autorizado para realizar esta acción',
    
    // Task start/end feature
    startTask: 'Iniciar Tarea',
    endTask: 'Finalizar Tarea',
    mustBeWithinRadius: 'Debes estar dentro del radio de la tarea para iniciarla',
    taskStarted: 'Tarea iniciada correctamente',
    taskCompleted: 'Tarea completada correctamente',
    taskStartedAt: 'Tarea {{title}} iniciada',
    taskCompletedAt: 'Tarea {{title}} completada',
    errorStartingTask: 'Error al iniciar la tarea',
    errorCompletingTask: 'Error al completar la tarea',
    yourLocation: 'Tu Ubicación',
    
    // Location tracking messages
    startingLocationTracking: "Iniciando seguimiento de ubicación...",
    locationPermissionDenied: "El permiso de ubicación fue denegado",
    gettingInitialLocation: "Obteniendo lectura inicial de ubicación con la mayor precisión...",
    initialLocationReading: "Lectura de ubicación inicial obtenida",
    settingUpLocationTracking: "Configurando seguimiento continuo de ubicación...",
    locationUpdateReceived: "Actualización de ubicación recibida",
    locationCoordinates: "Ubicación: ${lat}, ${lng} (±${accuracy}m)",
    locationTrackingStarted: "Seguimiento de ubicación iniciado con éxito",
    locationTrackingError: "Error al iniciar el seguimiento de ubicación: ${error}",
    
    // Radius check messages
    radiusCheckDivider: "---------- VERIFICACIÓN DE RADIO ----------",
    checkingTaskRadius: "Verificando si está dentro del radio de la tarea - ID de tarea: ${taskId}",
    taskMissingCoordinates: "Tarea sin coordenadas válidas: ${location}",
    taskPosition: "Posición de la tarea: ${position}",
    taskRadius: "Radio de la tarea: ${radius} metros",
    userPosition: "Posición del usuario: ${position}",
    distanceToTask: "Distancia a la tarea: ${km} km / ${meters} metros",
    withinTaskRadius: "✅ DENTRO DEL RADIO: ${distance}m a la tarea '${taskTitle}'",
    outsideTaskRadius: "❌ FUERA DEL RADIO: ${distance}m a la tarea '${taskTitle}' (radio: ${radius}m)",
    updatingRadiusState: "Actualizando estado dentro del radio de ${from} a ${to}",
    
    // Dashboard screen
    noPendingTasks: "No hay tareas pendientes",
    
    // Map diagnostics
    runDiagnostics: 'Ejecutar Diagnóstico de Mapa',
    dashboard: {
      welcome: 'Bienvenido',
      user: 'Usuario',
      admin: 'Administrador',
      employee: 'Empleado',
      tasks: 'Mis Tareas',
      trackingHistory: 'Historial de Ubicación',
    },
    trackingHistory: 'Historial de Seguimiento',
    
    // Login screen
    hello: 'Hola.',
    welcomeBack: 'Bienvenido de nuevo',
    email: 'Correo',
    password: 'Contraseña',
    enterEmail: 'Ingrese correo',
    enterPassword: 'Ingrese contraseña',
    forgotPassword: '¿Olvidó su contraseña?',
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    or: 'O CONTINUAR CON',
    dontHaveAccount: "¿No tiene una cuenta?",
    pleaseEnterEmailAndPassword: 'Por favor ingrese correo y contraseña',
    loginError: 'Error de inicio de sesión',
    anUnexpectedErrorOccurred: 'Ocurrió un error inesperado',
    pleaseTryAgain: 'Por favor intente de nuevo',
    
    // Voice assistant
    voiceAssistant: "Asistente de Voz",
    typeSomething: "Escribe algo...",
    voiceAssistantHelp: "Este simulador te permite probar el asistente de voz. Escribe 'bitácora' para iniciar una nota de voz.",
    voiceCommandsHelp: "Comandos de voz disponibles: 'bitácora' (inicia grabación), 'sí/no' (confirmación)",
    voiceAssistantActive: "Asistente de voz activo y escuchando por 'bitácora'",
    voiceAssistantError: "No se pudo activar el asistente de voz. Verifica los permisos del micrófono.",
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('es');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  const t = (key, params = {}) => {
    let translation = translations[language][key] || key;
    
    // Replace parameters in the translation string
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(`{{${param}}}`, value);
    });
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 