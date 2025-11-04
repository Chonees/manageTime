import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import LanguageToggle from '../components/LanguageToggle';
import * as api from '../services/api';
import LocationRadiusSelector from '../components/LocationRadiusSelector';
import SavedLocationsSelector from '../components/SavedLocationsSelector';
import TaskTemplateSelector from '../components/TaskTemplateSelector';
import TaskForm from '../components/TaskForm'; // Importar el componente de formulario de tareas

const { width, height } = Dimensions.get('window');

const TaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fileNumber, setFileNumber] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null); // Mantener para compatibilidad
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showSavedLocationsSelector, setShowSavedLocationsSelector] = useState(false);
  const [taskLocation, setTaskLocation] = useState(null);
  const [taskRadius, setTaskRadius] = useState(1.0);
  const [taskLocationName, setTaskLocationName] = useState('');
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [taskKeywords, setTaskKeywords] = useState([]);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [taskTimeLimit, setTaskTimeLimit] = useState(''); // Mantenemos este estado para compatibilidad
  const [isTimePickerVisible, setTimePickerVisible] = useState(false); // Estado para controlar la visibilidad del selector personalizado
  const [selectedHours, setSelectedHours] = useState(0); // Horas seleccionadas
  const [selectedMinutes, setSelectedMinutes] = useState(30); // Minutos seleccionados (default 30 min)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false); // Estado para mostrar el selector de plantillas
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para controlar si se está enviando el formulario

  // Function to handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTasks();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Función para manejar la ubicación seleccionada desde LocationRadiusSelector
  const handleLocationSelected = (data) => {
    console.log('Datos de ubicación recibidos:', data);
    
    // Comprobar si recibimos un objeto con la estructura esperada (como lo envía LocationRadiusSelector)
    if (data && data.location) {
      // Guardar directamente el objeto location en formato GeoJSON
      setTaskLocation(data.location);
      setTaskRadius(data.radius || 1.0);
      setTaskLocationName(data.locationName || '');
      
      console.log('Ubicación guardada:', data.location);
      console.log('Radio guardado:', data.radius);
      console.log('Nombre guardado:', data.locationName);
    } 
    // Mantener compatibilidad con el formato anterior por si acaso
    else if (data && data.latitude && data.longitude) {
      setTaskLocation({
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      });
      setTaskRadius(data.radius || 1.0);
      setTaskLocationName(data.locationName || '');
    } else {
      console.warn('Formato de ubicación no reconocido:', data);
      setTaskLocation(null);
    }
    
    // Cerramos el selector
    setShowLocationSelector(false);
  };

  // Función para manejar la selección de ubicaciones guardadas
  const handleSelectSavedLocation = (savedLocation) => {
    console.log('Ubicación guardada seleccionada:', savedLocation);
    
    if (savedLocation && savedLocation.location && savedLocation.location.coordinates) {
      // Las ubicaciones guardadas tienen formato GeoJSON, extraemos lat/lng
      const [lng, lat] = savedLocation.location.coordinates;
      
      // Actualizar estado con los datos de la ubicación guardada
      setTaskLocation(savedLocation.location);
      setTaskRadius(savedLocation.radius || 1.0);
      setTaskLocationName(savedLocation.name || '');
      
      // Cerramos el selector
      setShowLocationSelector(false);
    } else {
      console.warn('La ubicación guardada no tiene coordenadas válidas');
    }
  };
  
  // Función para manejar la selección de plantillas de tareas
  const handleSelectTemplate = (template) => {
    console.log('Plantilla de tarea seleccionada:', template);
    
    if (template) {
      // Aplicamos los datos de la plantilla a la tarea actual
      if (template.title) setNewTaskTitle(template.title);
      if (template.description) setNewTaskDescription(template.description);
      if (template.timeLimit) {
        // Convertir el timeLimit a horas y minutos para el selector personalizado
        const hours = Math.floor(template.timeLimit / 60);
        const minutes = template.timeLimit % 60;
        setSelectedHours(hours);
        setSelectedMinutes(minutes);
      }
      if (template.keywords && Array.isArray(template.keywords)) {
        setTaskKeywords(template.keywords);
      } else if (template.keywords && typeof template.keywords === 'string') {
        setTaskKeywords(template.keywords.split(',').map(k => k.trim()).filter(k => k));
      }
      
      // Si la plantilla tiene ubicación
      if (template.location) {
        setTaskLocation(template.location);
        setTaskRadius(template.radius || 1.0);
        setTaskLocationName(template.locationName || '');
      }
      
      // Cerramos el selector de plantillas
      setShowTemplateSelector(false);
    }
  };

  // Cargar tareas
  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Cargando tareas...');
      
      // Si es administrador, primero cargar usuarios para tener los datos disponibles
      if (user?.isAdmin) {
        console.log('Cargando usuarios primero...');
        await loadUsers();
      }
      
      // Usar getUserTasks para usuarios normales y getTasks para administradores
      const tasksData = user?.isAdmin 
        ? await api.getTasks() 
        : await api.getUserTasks();
      
      console.log(`Se cargaron ${tasksData.length} tareas`);
      
      // Log the tasks data to see if user information is included
      tasksData.forEach(task => {
        console.log(`Task ${task._id}: title=${task.title}, userId=${task.userId && typeof task.userId === 'object' ? task.userId._id : task.userId}, username=${task.userId && typeof task.userId === 'object' ? task.userId.username : 'no username'}`);
      });
      
      // Asegurarnos de que todas las tareas tengan la propiedad completed
      const formattedTasks = tasksData.map(task => {
        // Extract username from populated userId if it exists
        let taskUserId = null;
        let taskUsername = null;
        
        if (task.userId) {
          // If userId is an object (populated), extract _id and username
          if (typeof task.userId === 'object') {
            taskUserId = task.userId._id;
            taskUsername = task.userId.username;
            console.log(`Task ${task._id} has populated userId with username: ${taskUsername}`);
          } else {
            // If userId is just an ID, keep it as is
            taskUserId = task.userId;
            console.log(`Task ${task._id} has unpopulated userId: ${taskUserId}`);
          }
        }
        
        return {
        ...task,
          completed: task.completed !== undefined ? task.completed : false,
          // Preserve populated user information if it exists
          _username: taskUsername, // Store username directly in task for easy access
          userId: taskUserId || task.userId // Ensure userId is always the ID string
        };
      });
      
      setTasks(formattedTasks);
      setFilteredTasks(formattedTasks);
      setSearchText(''); // Limpiar búsqueda al cargar tareas
    } catch (error) {
      console.error('Error al cargar tareas:', error);
      setError(error.message || t('errorLoadingTasks'));
      Alert.alert('Error', error.message || t('errorLoadingTasks'));
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios si es administrador
  const loadUsers = async () => {
    if (!user?.isAdmin) return;
    
    try {
      console.log('Cargando usuarios...');
      const usersData = await api.getUsers();
      console.log(`Se cargaron ${usersData.length} usuarios:`, usersData.map(u => ({ id: u._id, username: u.username })));
      setUsers(usersData);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      Alert.alert('Error', t('errorLoadingUsers'));
    }
  };

  // Cargar tareas y usuarios al montar el componente
  useEffect(() => {
    loadTasks();
  }, []);

  // Filtrar tareas basado en el texto de búsqueda
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredTasks(tasks);
      return;
    }

    const filtered = tasks.filter(task => {
      const searchLower = searchText.toLowerCase();
      return (
        (task.title && task.title.toLowerCase().includes(searchLower)) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        (task.fileNumber && task.fileNumber.toLowerCase().includes(searchLower)) ||
        (task._username && task._username.toLowerCase().includes(searchLower))
      );
    });
    
    setFilteredTasks(filtered);
  }, [searchText, tasks]);

  // Función para mostrar el selector de tiempo
  const showTimePicker = () => {
    console.log('Mostrando selector de tiempo');
    // Asegurarse de que el estado se actualice correctamente
    setTimePickerVisible(true);
    console.log('Estado del selector de tiempo actualizado:', true);
  };

  // Función para ocultar el selector de tiempo
  const hideTimePicker = () => {
    setTimePickerVisible(false);
  };

  // Función para aumentar horas
  const incrementHours = () => {
    setSelectedHours(prev => (prev < 23) ? prev + 1 : 0);
  };

  // Función para disminuir horas
  const decrementHours = () => {
    setSelectedHours(prev => (prev > 0) ? prev - 1 : 23);
  };

  // Función para aumentar minutos
  const incrementMinutes = () => {
    console.log('Incrementando minutos');
    setSelectedMinutes(prev => {
      const newValue = (prev < 55) ? prev + 5 : 0;
      console.log(`Minutos actualizados: ${prev} -> ${newValue}`);
      return newValue;
    });
  };

  // Función para disminuir minutos
  const decrementMinutes = () => {
    console.log('Decrementando minutos');
    setSelectedMinutes(prev => {
      const newValue = (prev > 0) ? prev - 5 : 55;
      console.log(`Minutos actualizados: ${prev} -> ${newValue}`);
      return newValue;
    });
  };

  // Función para confirmar la selección
  const confirmTimeSelection = () => {
    // Calculamos el total de minutos para usar en la creación de la tarea
    const totalMinutes = (selectedHours * 60) + selectedMinutes;
    setTaskTimeLimit(totalMinutes.toString());
    hideTimePicker();
  };

  // Función para formatear el tiempo seleccionado para mostrarlo
  const formatSelectedTime = () => {
    if (selectedHours === 0 && selectedMinutes === 0) {
      return t('selectTimeLimit') || "Seleccionar tiempo límite";
    }
    
    let result = '';
    
    if (selectedHours > 0) {
      result += `${selectedHours} ${selectedHours === 1 ? (t('hour') || 'hora') : (t('hours') || 'horas')}`;
    }
    
    if (selectedMinutes > 0) {
      if (result.length > 0) result += ' ';
      result += `${selectedMinutes} ${selectedMinutes === 1 ? (t('minute') || 'minuto') : (t('minutes') || 'minutos')}`;
    }
    
    return result;
  };

  // Función para manejar el envío del formulario de tareas
  const handleTaskSubmit = async (taskData) => {
    // Verificar que el usuario sea administrador
    if (!user?.isAdmin) {
      Alert.alert(t('error'), t('adminPermissionRequired'));
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      console.log('Datos de tarea recibidos del formulario:', JSON.stringify(taskData, null, 2));
      
      // Verificar que los datos de ubicación sean correctos
      if (taskData.location) {
        console.log('Datos de ubicación:', JSON.stringify(taskData.location, null, 2));
        
        // Asegurar que la ubicación tiene el formato correcto para el backend
        if (taskData.location.coordinates) {
          console.log('Coordenadas detectadas en el formato correcto');
        } else if (taskData.location.latitude && taskData.location.longitude) {
          console.log('Convirtiendo formato de coordenadas planas a GeoJSON Point');
          taskData.location = {
            type: 'Point',
            coordinates: [taskData.location.longitude, taskData.location.latitude]
          };
        } else {
          console.warn('Formato de ubicación no reconocido');
        }
      } else {
        console.log('No se proporcionó ubicación para esta tarea');
      }
      
      // Si hay usuarios seleccionados, añadirlos a los datos de la tarea
      if (selectedUserIds.length > 0) {
        taskData.userId = selectedUserIds[0];
        taskData.userIds = selectedUserIds;
        console.log('Usuarios asignados a la tarea:', selectedUserIds);
      } else {
        console.log('No se asignaron usuarios a la tarea');
      }
      
      // Establecer el estado de la tarea
      taskData.status = 'waiting_for_acceptance';
      
      // Comprobar campos obligatorios
      if (!taskData.fileNumber || !taskData.title) {
        console.error('Faltan campos obligatorios:', { 
          fileNumber: !!taskData.fileNumber, 
          title: !!taskData.title 
        });
        Alert.alert(t('error'), t('requiredFieldsMissing') || 'Faltan campos obligatorios');
        setIsSubmitting(false);
        return;
      }
      
      let result;
      console.log('Payload final a enviar:', JSON.stringify(taskData, null, 2));
      
      // Llamar a la API para guardar o asignar la tarea
      if (taskData.userIds && taskData.userIds.length > 0) {
        console.log('Usando assignTask para asignar tarea a usuarios');
        result = await api.assignTask(taskData);
        console.log('Resultado de assignTask:', JSON.stringify(result, null, 2));
      } else {
        console.log('Usando saveTask para crear tarea sin asignar');
        result = await api.saveTask(taskData);
        console.log('Resultado de saveTask:', JSON.stringify(result, null, 2));
      }
      
      // Mostrar mensaje de éxito
      Alert.alert(
        t('success'),
        taskData.userIds && taskData.userIds.length > 0
          ? t('taskAssignedSuccessfully')
          : t('taskCreatedSuccessfully')
      );
      
      // Ocultar el formulario y recargar tareas
      setShowAddForm(false);
      loadTasks();
      
      // Limpiar selecciones de usuarios
      setSelectedUserIds([]);
      setSelectedUserId(null);
    } catch (error) {
      console.error('Error al añadir tarea:', error);
      
      // Extraer mensaje de error más detallado si está disponible
      let errorMessage = t('errorCreatingTask');
      if (error.message) {
        console.error('Mensaje de error detallado:', error.message);
        // Intentar extraer mensaje de error del backend si existe
        try {
          if (error.message.includes('{')) {
            const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          }
        } catch (parseError) {
          // Si no podemos extraer un error JSON, usar el mensaje completo
          errorMessage = error.message;
        }
      }
      
      Alert.alert(t('error'), errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Añadir nueva tarea (Mantener por compatibilidad)
  const addTask = async () => {
    // Verificar que el usuario sea administrador
    if (!user?.isAdmin) {
      Alert.alert(t('error'), t('adminPermissionRequired'));
      return;
    }
    
    // Validación de file number para administradores
    if (user?.isAdmin && !fileNumber.trim()) {
      Alert.alert(t('validationError'), t('fileNumberRequired') || 'Se requiere ingresar un número de archivo');
      return;
    }
    
    // Validación
    if (!newTaskTitle.trim()) {
      Alert.alert(t('validationError'), t('titleRequired'));
      return;
    }
    
    // Si no hay usuarios seleccionados, puede quedarse como null
    // pero mostramos advertencia
    if (selectedUserIds.length === 0) {
      console.log(t('noUserSelected'));
      // Dejar que avance sin usuario asignado
    }
    
    // Construir la estructura de ubicación para la tarea si hay ubicación seleccionada
    let locationData = null;
    if (taskLocation && taskLocation.coordinates) {
      // Si taskLocation ya tiene el formato correcto (type y coordinates)
      locationData = taskLocation;
    } else if (taskLocation && taskLocation.latitude && taskLocation.longitude) {
      // Si taskLocation tiene formato de coordenadas planas
      locationData = {
        type: 'Point',
        coordinates: [taskLocation.longitude, taskLocation.latitude]
      };
    }
    
    // Crear objeto de tarea con datos de usuario o no, según corresponda
    const taskData = {
      fileNumber: fileNumber.trim(), // Añadir el número de archivo
      title: newTaskTitle,
      description: newTaskDescription,
      // Para compatibilidad mantenemos userId, pero ahora usamos userIds para múltiples usuarios
      userId: selectedUserIds.length > 0 ? selectedUserIds[0] : null,
      userIds: selectedUserIds, // Array de IDs de usuarios seleccionados
      handsFreeMode: handsFreeMode,
      keywords: taskKeywords.join(','),
      status: 'waiting_for_acceptance', // Estado inicial para tareas asignadas
      radius: parseFloat(taskRadius) || 1.0,
      locationName: taskLocationName || '',
      location: locationData // Añadir el objeto de ubicación creado anteriormente
    };
    
    // Añadir tiempo límite si está seleccionado (convertir horas y minutos a minutos totales)
    if (selectedHours > 0 || selectedMinutes > 0) {
      // Convertir horas y minutos a un valor total en minutos
      const totalMinutes = (selectedHours * 60) + selectedMinutes;
      console.log(`Tiempo límite calculado: ${selectedHours}h:${selectedMinutes}m = ${totalMinutes} minutos`);
      
      // Añadir al objeto de la tarea
      taskData.timeLimit = totalMinutes;
      taskData.timeLimitSet = new Date().toISOString(); // Establecer la fecha actual como inicio del límite
    }
    
    // DEBUG: Mostrar qué datos se envían al backend
    console.log('DATOS DE TAREA A ENVIAR:', JSON.stringify(taskData, null, 2));
    console.log('timeLimit enviado:', taskData.timeLimit, typeof taskData.timeLimit);
    console.log('location enviado:', JSON.stringify(taskData.location, null, 2));
    console.log('userId enviado:', taskData.userId, typeof taskData.userId);
    
    try {
      console.log(t('creatingTask'), taskData);
      
      let result;
      
      // Si es admin y hay un usuario seleccionado, usar el endpoint específico para asignar tareas
      if (user?.isAdmin && selectedUserIds.length > 0) {
        // Make sure userId is a string
        const userIdString = String(selectedUserIds[0]);
        console.log(t('adminAssigningTask'));
        
        // Include userId as string in taskData
        taskData.userId = userIdString;
      
      // Usar la nueva función específica para asignar tareas
      result = await api.assignTask(taskData);
      console.log(t('serverResponseAssignment'), JSON.stringify(result));
    } else {
      // Caso normal: crear tarea para el usuario actual
      console.log(t('creatingTaskForCurrentUser'));
      result = await api.saveTask(taskData);
      console.log(t('serverResponseNormal'), JSON.stringify(result));
    }
      
      // Verificamos que result.task existe antes de añadirlo
      if (result && result.task) {
        // Log the task data that came back from server
        console.log(t('taskDataReceived'), JSON.stringify(result.task));
        
        // Process the returned task object to handle populated userId
        let taskUserId = null;
        let taskUsername = null;
        let assignedUsernames = [];
        
        if (result.task.userId) {
          // If userId is an object (populated), extract _id and username
          if (typeof result.task.userId === 'object' && result.task.userId._id) {
            taskUserId = result.task.userId._id;
            taskUsername = result.task.userId.username || 'Unknown';
            console.log(t('processedPopulatedUserId', { userId: taskUserId, username: taskUsername }));
          } else {
            // Otherwise it's just an ID string
            taskUserId = result.task.userId;
            console.log(t('processedStringUserId', { userId: taskUserId }));
          }
          
          // Try to find username if we don't have it yet
          if (!taskUsername && users.length > 0) {
            const foundUser = users.find(u => u._id === taskUserId);
            if (foundUser) {
              taskUsername = foundUser.username;
              console.log(t('foundUsernameInUsers', { username: taskUsername }));
            }
          }
        }
        
        // Buscar nombre de usuario para mostrarlo
        if (result.task.userIds && Array.isArray(result.task.userIds)) {
          assignedUsernames = result.task.userIds.map(userId => {
            if (typeof userId === 'object' && userId.username) {
              return userId.username;
            } else {
              const foundUser = users.find(u => u._id === userId);
              return foundUser ? foundUser.username : 'Usuario desconocido';
            }
          });
          console.log('Nombres de usuarios asignados:', assignedUsernames);
        }
        
        // Create a properly formatted task object with username info
        const newTaskObject = {
          ...result.task,
          _username: taskUsername, // Store username directly in task for easy access
          _assignedUsernames: assignedUsernames, // Store all assigned usernames
          userId: taskUserId || result.task.userId
        };
        
        // Añadimos la nueva tarea a la lista actual
        setTasks(currentTasks => [newTaskObject, ...currentTasks]);
        
        // Save activity for task creation
        try {
          await api.saveActivity({
            type: 'task_create',
            taskId: result.task._id,
            message: t('taskCreatedActivity', { title: result.task.title }),
            metadata: {
              title: result.task.title,
              description: result.task.description || '',
              location: result.task.location || null
            }
          });
        } catch (error) {
          console.error(t('errorSavingActivity'), error);
        }
        
        // Resetear formulario
        setFileNumber('');
        setNewTaskTitle('');
        setNewTaskDescription('');
        setSelectedUserIds([]); // Restablecer usuarios seleccionados
        setSelectedUserId(null); // Restablecer usuario seleccionado para compatibilidad
        setTaskLocation(null);
        setTaskRadius(1.0);
        setTaskLocationName('');
        setHandsFreeMode(false); // Restablecer el modo manos libres
        setTaskKeywords([]); // Restablecer palabras clave
        setCurrentKeyword(''); // Limpiar el campo de entrada actual
        setTaskTimeLimit(''); // Limpiar el campo de tiempo límite
        setShowAddForm(false);
        
        console.log(t('taskAddedSuccessfully'));
      } else {
        console.error(t('incompleteServerResponse'), result);
        Alert.alert(t('error'), t('errorCreatingTask'));
      }
    } catch (error) {
      console.error(t('errorCreatingTask'), error);
      
      // Traducir mensajes de error específicos
      let errorMessage = error.message;
      if (error.message === 'USER_ID_REQUIRED') {
        errorMessage = t('userIdRequired');
      } else if (error.message === 'ERROR_ACCESSING_TOKEN') {
        errorMessage = t('errorAccessingToken');
      } else if (error.message === 'NO_AUTH_TOKEN') {
        errorMessage = t('noAuthToken');
      }
      
      Alert.alert(t('error'), errorMessage || t('errorCreatingTask'));
    }
  };

  // Seleccionar usuario para asignar tarea
  const selectUser = (userId) => {
    console.log(`Usuario seleccionado: ${userId}`);
    
    // Verificar si el usuario ya está seleccionado
    const isAlreadySelected = selectedUserIds.includes(userId);
    
    if (isAlreadySelected) {
      // Si ya está seleccionado, lo quitamos
      const updatedSelection = selectedUserIds.filter(id => id !== userId);
      setSelectedUserIds(updatedSelection);
      
      // Actualizar también selectedUserId para compatibilidad
      setSelectedUserId(updatedSelection.length > 0 ? updatedSelection[0] : null);
    } else {
      // Añadimos el nuevo usuario a los seleccionados
      // Sin límite en la cantidad de usuarios que pueden ser seleccionados
      const updatedSelection = [...selectedUserIds, userId];
      setSelectedUserIds(updatedSelection);
      setSelectedUserId(updatedSelection[0]); // Para compatibilidad con el sistema anterior
    }
    
    // No cerramos el selector automáticamente para permitir seleccionar múltiples usuarios
    // El usuario debe cerrar el selector manualmente cuando haya terminado
  };



  // Renderizar el selector de tiempo personalizado
  const renderCustomTimePicker = () => {
    return (
      <Modal
        visible={isTimePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={hideTimePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerTitle}>{t('selectTimeLimit') || "Seleccionar tiempo límite"}</Text>
            
            <View style={styles.timePickerControls}>
              {/* Selector de horas */}
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>{t('hours') || "Horas"}</Text>
                <TouchableOpacity 
                style={[styles.timeButton, { padding: 15 }]} 
                onPress={incrementHours}
                activeOpacity={0.5}
              >
                <Ionicons name="chevron-up" size={30} color="#fff3e5" />
              </TouchableOpacity>
              <Text style={styles.timeValue}>{selectedHours.toString().padStart(2, '0')}</Text>
              <TouchableOpacity 
                style={[styles.timeButton, { padding: 15 }]} 
                onPress={decrementHours}
                activeOpacity={0.5}
              >
                <Ionicons name="chevron-down" size={30} color="#fff3e5" />
              </TouchableOpacity>
              </View>
              
              {/* Separador */}
              <Text style={styles.timeSeparator}>:</Text>
              
              {/* Selector de minutos */}
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>{t('minutes') || "Minutos"}</Text>
                <TouchableOpacity 
                style={[styles.timeButton, { padding: 15 }]} 
                onPress={incrementMinutes}
                activeOpacity={0.5}
              >
                <Ionicons name="chevron-up" size={30} color="#fff3e5" />
              </TouchableOpacity>
              <Text style={styles.timeValue}>{selectedMinutes.toString().padStart(2, '0')}</Text>
              <TouchableOpacity 
                style={[styles.timeButton, { padding: 15 }]} 
                onPress={decrementMinutes}
                activeOpacity={0.5}
              >
                <Ionicons name="chevron-down" size={30} color="#fff3e5" />
              </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.timePickerActions}>
              <TouchableOpacity style={styles.timePickerCancel} onPress={hideTimePicker}>
                <Text style={styles.timePickerCancelText}>{t('cancel') || "Cancelar"}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.timePickerConfirm} onPress={confirmTimeSelection}>
                <Text style={styles.timePickerConfirmText}>{t('confirm') || "Confirmar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar el formulario para añadir tareas usando el componente TaskForm
  const renderAddTaskForm = () => {
    return (
      <View style={styles.formContainer}>
        <Text style={[styles.formTitle, {fontSize: 24, textAlign: 'center', marginBottom: 10}]}>{t('addTask')}</Text>
        
        <TaskForm 
          isEditing={false}
          onSubmit={handleTaskSubmit}
          isSubmitting={isSubmitting}
          showUserSelector={() => setShowUserSelector(true)}
          isAdmin={user?.isAdmin}
          formTitle=""
        />
        
        {/* Botón de cancelar */}
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={() => setShowAddForm(false)}
        >
          <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
        </TouchableOpacity>

        {/* Modal de selector de ubicación */}
        {showLocationSelector && (
          <LocationRadiusSelector 
            visible={showLocationSelector}
            onClose={() => setShowLocationSelector(false)}
            onSave={handleLocationSelected}
            initialRegion={null}
          />
        )}
        
        {/* Modal de ubicaciones guardadas */}
        {showSavedLocationsSelector && (
          <SavedLocationsSelector
            visible={showSavedLocationsSelector}
            onClose={() => setShowSavedLocationsSelector(false)}
            onSelect={handleSelectSavedLocation}
          />
        )}
        
        {/* Modal de selector de plantillas */}
        {showTemplateSelector && (
          <TaskTemplateSelector 
            visible={showTemplateSelector}
            onClose={() => setShowTemplateSelector(false)}
            onSelectTemplate={handleSelectTemplate}
          />
        )}
      </View>
    );
  };

  // Renderizar el selector de usuarios
  const renderUserSelector = () => {
    if (!showUserSelector) return null;
    
    // Filtrar usuarios que estén activos y no sean administradores
    const eligibleUsers = users.filter(user => 
      user.isActive === true && user.isAdmin === false
    );
    
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={true}
        onRequestClose={() => setShowUserSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userSelectorContainer}>
            <Text style={styles.selectorTitle}>{t('selectUser')}</Text>
            
            {/* Mostrar mensaje si no hay usuarios disponibles */}
            {eligibleUsers.length === 0 && (
              <Text style={styles.noUsersMessage}>
                {t('noEligibleUsers') || 'No hay usuarios activos disponibles'}
              </Text>
            )}
            
            {/* Lista de usuarios filtrados */}
            <ScrollView style={styles.usersList}>
              {eligibleUsers.map(user => {
                const isSelected = selectedUserIds.includes(user._id);
                
                return (
                  <TouchableOpacity
                    key={user._id}
                    style={[styles.userItem, isSelected && styles.selectedUserItem]}
                    onPress={() => selectUser(user._id)}
                  >
                    <View style={styles.userItemContent}>
                      <Ionicons 
                        name={isSelected ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={isSelected ? "#fff3e5" : "rgba(255, 243, 229, 0.6)"} 
                      />
                      <View style={styles.userInfoContainer}>
                        <Text style={styles.username}>{user.username}</Text>
                        {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {/* Botones de acción */}
            <View style={styles.userSelectorActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]} 
                onPress={() => setShowUserSelector(false)}
              >
                <Text style={styles.buttonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.confirmButton]} 
                onPress={() => {
                  // Confirmar la selección y cerrar
                  console.log(`${selectedUserIds.length} usuarios seleccionados`);
                  setShowUserSelector(false);
                }}
              >
                <Text style={styles.confirmButtonText}>
                  {t('confirm')} ({selectedUserIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar una tarea individual
  const renderTask = ({ item }) => {
    // Extraer información de la tarea
    const taskUser = users.find(u => u._id === item.userId);
    const username = item._username || (taskUser ? taskUser.username : t('unassigned'));
    
    // Función para manejar la eliminación de una tarea
    const handleDeleteTask = async () => {
      try {
        // Mostrar confirmación antes de eliminar
        Alert.alert(
          t('deleteTask'),
          t('deleteTaskConfirmation'),
          [
            { text: t('cancel'), style: 'cancel' },
            { 
              text: t('delete'), 
              style: 'destructive',
              onPress: async () => {
                try {
                  await api.deleteTask(item._id);
                  // Recargar la lista de tareas después de eliminar
                  loadTasks();
                } catch (error) {
                  Alert.alert(t('error'), t('errorDeletingTask'));
                  console.error('Error al eliminar tarea:', error);
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error('Error en handleDeleteTask:', error);
      }
    };
    
    // Función para marcar una tarea como completada o pendiente
    const handleToggleTaskCompletion = async () => {
      try {
        await api.updateTask(item._id, { completed: !item.completed });
        // Recargar la lista de tareas después de actualizar
        loadTasks();
      } catch (error) {
        Alert.alert(t('error'), t('errorUpdatingTask'));
        console.error('Error al actualizar estado de tarea:', error);
      }
    };
    
    // Determinar el estilo de borde según el estado
    const getBorderStyle = () => {
      if (item.completed || item.status === 'completed') return styles.completedTask;
      if (item.status === 'on_site') return styles.onSiteTask;
      if (item.status === 'on_the_way') return styles.onTheWayTask;
      return styles.waitingTask;
    };

    return (
      <TouchableOpacity 
        style={[styles.taskItem, getBorderStyle()]}
        onPress={() => navigation.navigate('TaskDetails', { taskId: item._id })}
      >
        {/* Cabecera de la tarea con título y número de archivo destacado */}
        <View style={styles.taskHeader}>
          <View style={styles.titleSection}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {item.title}
              {item.fileNumber && <Text style={styles.fileNumberText}> - #{item.fileNumber}</Text>}
            </Text>
          </View>
          
          {/* Panel de controles siempre visible */}
          <View style={styles.taskControls}>
            {user && user.isAdmin && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDeleteTask}
              >
                <Ionicons name="trash-outline" size={20} color="#ff5252" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Estado de la tarea siempre visible y con mejor diseño */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('status')}:</Text>
          <Text 
            style={[
              styles.statusValue, 
              item.status === 'completed' || item.completed ? styles.completedStatusValue : 
              item.status === 'on_site' ? styles.onSiteStatusValue : 
              item.status === 'on_the_way' ? styles.onTheWayStatusValue : 
              styles.waitingStatusValue
            ]}
          >
            {item.status === 'completed' || item.completed ? t('completed') : 
             item.status === 'on_site' ? t('on_site') : 
             item.status === 'on_the_way' ? t('on_the_way') : 
             t('waiting_for_acceptance')}
          </Text>
        </View>
        
        {/* Descripción opcional */}
        {item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        {/* Pie de tarea con detalles */}
        <View style={styles.taskFooter}>
          <View style={styles.taskIconsColumn}>
            <View style={styles.taskIconRow}>
              <Ionicons name="person" size={16} color="#a8a8a8" />
              <Text style={styles.taskIconText}>{username}</Text>
            </View>
            
            {item.timeLimit > 0 && (
              <View style={styles.taskIconRow}>
                <Ionicons name="time" size={16} color="#a8a8a8" />
                <Text style={styles.taskIconText}>
                  {Math.floor(item.timeLimit / 60)}h {item.timeLimit % 60}m
                </Text>
              </View>
            )}
            
            {item.location && item.radius && (
              <View style={styles.taskIconRow}>
                <Ionicons name="location" size={16} color="#a8a8a8" />
                <Text style={styles.taskIconText}>
                  {item.locationName || t('location')} ({item.radius} km)
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  
  // Return principal del componente TaskScreen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.colors.darkGrey} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate(user?.isAdmin ? 'AdminDashboard' : 'Dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff3e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tasks')}</Text>
        <View style={styles.headerRightPlaceholder}></View>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{searchText ? filteredTasks.length : tasks.length}</Text>
          <Text style={styles.statLabel}>{t('total')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {searchText ? filteredTasks.filter(task => task.completed).length : tasks.filter(task => task.completed).length}
          </Text>
          <Text style={styles.statLabel}>{t('completed')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {searchText ? filteredTasks.filter(task => !task.completed).length : tasks.filter(task => !task.completed).length}
          </Text>
          <Text style={styles.statLabel}>{t('pending')}</Text>
        </View>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff3e5" />
          <Text style={[styles.loadingText, { color: '#fff3e5' }]}>{t('loadingTasks')}</Text>
        </View>
      ) : (
        <>
          {!showAddForm && user?.isAdmin && (
            <TouchableOpacity 
              style={styles.addTaskButton}
              onPress={() => setShowAddForm(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#000000" />
              <Text style={styles.addTaskButtonText}>{t('addTask')}</Text>
            </TouchableOpacity>
          )}
          
          {/* Campo de búsqueda de tareas */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#a8a8a8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchTasks') || "Buscar tareas..."}
              placeholderTextColor="#a8a8a8"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#a8a8a8" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          {showAddForm && user?.isAdmin ? (
            renderAddTaskForm()
          ) : (
            error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : filteredTasks.length === 0 && !searchText ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('noTasks')}</Text>
                <Text style={styles.emptySubText}>{t('tasksWillAppearHere')}</Text>
              </View>
            ) : (
              <FlatList
                style={styles.taskList}
                data={filteredTasks}
                renderItem={renderTask}
                keyExtractor={item => item._id}
                refreshing={refreshing}
                onRefresh={onRefresh}
                indicatorStyle="white"
                contentContainerStyle={styles.taskListContent}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={searchText ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('noSearchResults')}</Text>
                    <Text style={styles.emptySubText}>{t('tryDifferentSearch') || "Intenta con otra búsqueda"}</Text>
                  </View>
                ) : null}
              />
            )
          )}
        </>
      )}
      {renderUserSelector()}
      {renderCustomTimePicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444444',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#fff3e5',
    fontSize: 14,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 5,
  },
  taskListContent: {
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#1c1c1c',
  },
  headerTitle: {
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 5,
    width: 40,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    marginBottom: 15,
    marginHorizontal: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#d0d0d0',
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    margin: 2,
  },
  statValue: {
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: 'bold',
    color: '#333333',
  },
  statLabel: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#666666',
    marginTop: 5,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  addTaskButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.04, 16),
    marginLeft: 8,
  },
  userSelectorContainer: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#fff3e5',
  },
  noUsersMessage: {
    textAlign: 'center',
    padding: 20,
    color: '#fff3e5',
    opacity: 0.7,
  },
  usersList: {
    maxHeight: 350,
    marginBottom: 15,
  },
  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#2e2e2e',
  },
  selectedUserItem: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfoContainer: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff3e5',
  },
  userEmail: {
    fontSize: 14,
    color: '#fff3e5',
    opacity: 0.7,
  },
  userSelectorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    gap: 50,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  cancelButton: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#fff3e5',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  taskList: {
    flex: 1,
    marginHorizontal: 10,
  },
  taskItem: {
    backgroundColor: '#222222',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedTask: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50', // Verde para completado
    backgroundColor: '#1c1c1c',
    opacity: 0.9,
  },
  onSiteTask: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3', // Azul para en el sitio
    backgroundColor: '#1c1c1c',
  },
  onTheWayTask: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800', // Naranja para en camino
    backgroundColor: '#1c1c1c',
  },
  waitingTask: {
    borderLeftWidth: 4,
    borderLeftColor: '#8e8cd8', // Azul-lavanda para esperando aceptación
    backgroundColor: '#1c1c1c',
  },
  titleSection: {
    flex: 1,
    marginRight: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    flexWrap: 'nowrap',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  fileNumberText: {
    color: '#e8d5b7',
    fontWeight: 'bold',
  },
  taskControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statusLabel: {
    fontSize: 12,
    color: '#a8a8a8',
    marginRight: 5,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 13,
    color: '#e8d5b7',
    fontWeight: '600',
    backgroundColor: 'rgba(232, 213, 183, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  completedStatusValue: {
    color: '#4CAF50', // Verde para completado
  },
  onSiteStatusValue: {
    color: '#2196F3', // Azul para en el sitio
  },
  onTheWayStatusValue: {
    color: '#FF9800', // Naranja para en camino
  },
  waitingStatusValue: {
    color: '#8e8cd8', // Azul-lavanda más sutil para esperando aceptación
  },
  pendingStatusValue: {
    color: '#FFC107', // Amarillo para pendiente
  },
  taskIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskIconText: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#fff3e5',
    marginLeft: 8,
  },
  taskDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.2)',
  },
  taskDescription: {
    fontSize: 14,
    color: '#d0d0d0',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  taskFooter: {
    flexDirection: 'row',
    marginTop: 5,
  },
  taskIconsColumn: {
    flexDirection: 'column',
    flex: 1,
  },
  completeButton: {
    padding: 5,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    textAlign: 'center',
    marginHorizontal: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 0,
    flex: 1,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  input: {
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
    color: '#fff3e5',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    color: '#fff3e5',
  },
  userSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  userSelectButtonText: {
    color: '#fff3e5',
  },
  locationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    padding: 12,
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  savedLocationsButton: {
    flex: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e5',
    borderRadius: 5,
    padding: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  locationButtonText: {
    color: '#fff3e5',
    marginLeft: 10,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  formButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#fff3e5',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  cancelButtonText: {
    color: '#fff3e5',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  userList: {
    maxHeight: 300,
  },
  userItem: {
    padding: 15,
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  userItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  selectedUserItem: {
    backgroundColor: '#fff3e5',
  },
  closeButton: {
    backgroundColor: '#2e2e2e',
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  closeButtonText: {
    color: '#fff3e5',
  },
  handsFreeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  handsFreeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handsFreeText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 5,
  },
  handsFreeSwitch: {
    width: 50,
    height: 25,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  handsFreeActive: {
    backgroundColor: '#fff3e5',
  },
  handsFreeInactive: {
    backgroundColor: '#f0f0f0',
  },
  handsFreeHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  handsFreeHandleActive: {
    marginLeft: 25,
    backgroundColor: '#000000',
  },
  handsFreeHandleInactive: {
    marginLeft: 5,
  },
  keywordsContainer: {
    marginBottom: 10,
  },
  keywordsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  keywordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  keywordInput: {
    flex: 1,
    height: 40,
    marginRight: 10,
  },
  addKeywordButton: {
    backgroundColor: '#fff3e5',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addKeywordButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  keywordsList: {
    marginTop: 5,
  },
  keywordsListTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  keywordTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  keywordTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1f5fe',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  keywordTagText: {
    color: '#0277bd',
    marginRight: 5,
  },
  removeKeywordButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0277bd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeKeywordButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateButton: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeLimitIcon: {
    marginRight: 10,
  },
  timePicker: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff3e5',
  },
  timePickerText: {
    color: '#fff3e5',
    fontSize: 16,
  },
  // Estilos para el selector de tiempo personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    width: '80%',
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  timePickerTitle: {
    color: '#fff3e5',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  timePickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timePickerColumn: {
    alignItems: 'center',
    width: 80,
  },
  timePickerLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  timeButton: {
    padding: 10,
  },
  timeValue: {
    color: '#fff3e5',
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  timeSeparator: {
    color: '#fff3e5',
    fontSize: 30,
    marginHorizontal: 10,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  timePickerCancel: {
    padding: 10,
  },
  timePickerCancelText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  timePickerConfirm: {
    padding: 10,
  },
  timePickerConfirmText: {
    color: '#fff3e5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para botones en el formulario modular
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  cancelButton: {
    backgroundColor: '#555',
    marginVertical: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TaskScreen;
