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

const { width, height } = Dimensions.get('window');

const TaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
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

  // Función para mostrar el selector de tiempo
  const showTimePicker = () => {
    setTimePickerVisible(true);
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
    setSelectedMinutes(prev => (prev < 55) ? prev + 5 : 0);
  };

  // Función para disminuir minutos
  const decrementMinutes = () => {
    setSelectedMinutes(prev => (prev > 0) ? prev - 5 : 55);
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

  // Añadir nueva tarea
  const addTask = async () => {
    // Verificar que el usuario sea administrador
    if (!user?.isAdmin) {
      Alert.alert(t('error'), t('adminPermissionRequired'));
      return;
    }
    
    // Validación
    if (!newTaskTitle.trim()) {
      Alert.alert(t('validationError'), t('titleRequired'));
      return;
    }
    
    // Si no hay usuario seleccionado, puede quedarse como null
    // pero mostramos advertencia
    if (!selectedUserId) {
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
    
    // Preparar el objeto de tarea con todos los datos necesarios
    const taskData = {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      userId: selectedUserId, // Puede ser null
      location: locationData, // Asignar la ubicación correctamente formateada
      handsFreeMode: handsFreeMode,
      keywords: taskKeywords.length > 0 ? taskKeywords.join(',') : undefined,
      radius: parseFloat(taskRadius) || 1.0,
      locationName: taskLocationName || ''
    };
    
    // Añadir tiempo límite si está establecido
    if (taskTimeLimit && Number(taskTimeLimit) > 0) {
      taskData.timeLimit = Number(taskTimeLimit);
      taskData.timeLimitSet = new Date().toISOString(); // Establecer la fecha actual como inicio del límite
    }
    
    // DEBUG: Mostrar qué datos se envían al backend
    console.log('DATOS DE TAREA A ENVIAR:', JSON.stringify(taskData, null, 2));
    console.log('timeLimit específicamente:', taskTimeLimit, typeof taskTimeLimit);
    console.log('location específicamente:', JSON.stringify(locationData, null, 2));
    
    try {
      console.log(t('creatingTask'), taskData);
      
      let result;
      
      // Si es admin y hay un usuario seleccionado, usar el endpoint específico para asignar tareas
      if (user?.isAdmin && selectedUserId) {
        // Make sure userId is a string
        const userIdString = String(selectedUserId);
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
        let taskUsername = null;
        let taskUserId = null;
        
        if (result.task.userId) {
          // If userId is an object (populated), extract _id and username
          if (typeof result.task.userId === 'object') {
            taskUserId = result.task.userId._id;
            taskUsername = result.task.userId.username;
            console.log(t('newTaskHasUsername', { username: taskUsername }));
          } else {
            // If userId is just an ID, keep it as is
            taskUserId = result.task.userId;
            
            // Try to find the username in our local users list
            if (users.length > 0) {
              const taskUser = users.find(u => String(u._id) === String(taskUserId));
              if (taskUser) {
                taskUsername = taskUser.username;
                console.log(t('foundUsernameForTask', { username: taskUsername }));
              }
            }
          }
        }
        
        // Create a properly formatted task object with username info
        const newTaskObject = {
          ...result.task,
          _username: taskUsername, // Store username directly in task for easy access
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
        setNewTaskTitle('');
        setNewTaskDescription('');
        setSelectedUserId(null);
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

  // Eliminar tarea
  const deleteTask = async (taskId) => {
    try {
      const taskToDelete = tasks.find(task => task._id === taskId);
      if (!taskToDelete) {
        console.error(t('taskNotFound'), taskId);
        return;
      }

      // Eliminar la tarea - el backend registrará la actividad automáticamente
      await api.deleteTask(taskId);
      
      // Actualizar la UI después de eliminar
      setTasks(tasks.filter(task => task._id !== taskId));
      
      // No es necesario registrar la actividad manualmente, el backend ya lo hace
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', error.message || t('errorDeletingTask'));
    }
  };


  // Toggle task completion
  const toggleComplete = async (taskId) => {
    try {
      // Find the task to toggle
      const taskToToggle = tasks.find(task => task._id === taskId);
      if (!taskToToggle) {
        console.error('Task not found:', taskId);
        return;
      }
      
      // Determine the new completion status
      const currentCompleted = taskToToggle.completed !== undefined ? taskToToggle.completed : false;
      const newCompletedStatus = !currentCompleted;
      
      console.log(`Toggling task ${taskId} from ${currentCompleted} to ${newCompletedStatus}`);
      
      // Update locally first for immediate UI feedback
      setTasks(tasks.map(task => {
        if (task._id === taskId) {
          return { ...task, completed: newCompletedStatus };
        }
        return task;
      }));
      
      // Send update to server
      const result = await api.updateTaskCompletion(taskId, newCompletedStatus);
      console.log('Server response for task update:', result);
      
      // Save activity for task completion
      try {
        await api.saveActivity({
          type: newCompletedStatus ? 'task_complete' : 'task_update',
          taskId,
          message: newCompletedStatus 
            ? `Tarea "${taskToToggle.title}" completada`
            : `Tarea "${taskToToggle.title}" actualizada`,
          metadata: {
            title: taskToToggle.title,
            completed: newCompletedStatus,
            updatedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error saving activity:', error);
      }
      
      // If we got here, the server update was successful
    } catch (error) {
      console.error('Error updating task completion status:', error);
      
      // Revert the local change if the server update failed
      setTasks(tasks.map(task => {
        if (task._id === taskId) {
          // Asegurarnos de que completed tenga un valor por defecto
          const currentCompleted = task.completed !== undefined ? task.completed : false;
          return { ...task, completed: currentCompleted }; // Revert to original state
        }
        return task;
      }));
      
      Alert.alert('Error', error.message || t('errorOccurred'));

    }
  };

  // Seleccionar usuario para asignar tarea
  const selectUser = (userId) => {
    console.log(`Usuario seleccionado: ${userId}`);
    console.log('Tipo de userId:', typeof userId);
    
    // Asegurarnos de que el userId sea un string
    const userIdString = userId.toString();
    console.log(`userId convertido a string: ${userIdString}`);
    
    setSelectedUserId(userIdString);
    setShowUserSelector(false);
  };

  // Renderizar una tarea
  const renderTask = ({ item }) => {
    // Get assigned user's name
    let assignedUserName = t('noUserAssigned');
    if (user?.isAdmin && item.userId) {
      // Try to get username from cached username first
      if (item._username) {
        assignedUserName = item._username;
        console.log(t('usingCachedUsername', { taskId: item._id, username: assignedUserName }));
      } else {
        // If no cached username, look up in users array
        const assignedUser = users.find(u => u._id === item.userId);
        if (assignedUser) {
          assignedUserName = assignedUser.username;
          console.log(t('foundUsernameInUsers', { taskId: item._id, username: assignedUserName }));
        } else {
          console.log(t('noUserFoundForTask', { taskId: item._id, userId: item.userId }));
        }
      }
    }
    
    return (
      <TouchableOpacity 
        style={styles.taskItem}
        onPress={() => navigation.navigate('TaskDetails', { taskId: item._id })}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{item.title || t('noTitle')}</Text>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              deleteTask(item._id);
            }}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.taskDetails}>
          <Text style={styles.taskDescription}>{item.description || ''}</Text>
          
          {user?.isAdmin && (
            <View style={styles.assignedToContainer}>
              <Text style={styles.assignedToLabel}>{t('assignedTo')}:</Text>
              <Text style={styles.assignedToValue}>{assignedUserName}</Text>
            </View>
          )}
          
          <View style={styles.taskFooter}>
            <Text style={styles.taskDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              style={[
                styles.completeButton,
                item.completed && styles.completedButton
              ]}
              onPress={(e) => {
                e.stopPropagation();
                toggleComplete(item._id);
              }}
            >
              <Text style={styles.completeButtonText}>
                {item.completed ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar el selector de usuarios
  const renderUserSelector = () => (
    <Modal
      visible={showUserSelector}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowUserSelector(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('selectUser')}</Text>
            <TouchableOpacity 
              onPress={() => setShowUserSelector(false)}
              style={{ padding: 5 }}
            >
              <Text style={{ color: '#fff3e5', fontSize: 24, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.userList}>
            {users.map(user => (
              <TouchableOpacity
                key={user._id}
                style={[
                  styles.userItem,
                  selectedUserId === user._id && styles.selectedUserItem
                ]}
                onPress={() => selectUser(user._id)}
              >
                <Text style={[
                  styles.userItemText,
                  selectedUserId === user._id && { color: '#000000' }
                ]}>{user.username}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Function to handle selecting a saved location
  const handleSelectSavedLocation = (location) => {
    console.log('Selected saved location:', JSON.stringify(location, null, 2));
    
    try {
      // Validate the location data
      if (!location || !location.location || !location.location.coordinates) {
        throw new Error('Invalid location data');
      }
      
      // Extract coordinates
      const [longitude, latitude] = location.location.coordinates;
      
      // Update the task location
      setTaskLocation({
        coordinates: [longitude, latitude]
      });
      
      // Update the task radius
      setTaskRadius(location.radius || 0.5);
      
      // Update the location name
      setTaskLocationName(location.name || 'Saved Location');
      
      // Close the saved locations selector
      setShowSavedLocationsSelector(false);
      
      console.log('Successfully set location from saved location');
    } catch (error) {
      console.error('Error selecting saved location:', error);
      Alert.alert(
        t('error') || 'Error',
        (t('errorSelectingLocation') || 'Error selecting location') + ': ' + error.message,
        [{ text: t('ok') || 'OK' }]
      );
    }
  };

  // Función para manejar la selección de ubicación y radio
  const handleLocationSelected = (locationData) => {
    setTaskLocation(locationData.location);
    setTaskRadius(locationData.radius);
    setTaskLocationName(locationData.locationName);
    console.log(t('locationSelected', { 
      coordinates: JSON.stringify(locationData.location.coordinates), 
      radius: locationData.radius,
      place: locationData.locationName 
    }));
  };

  // Función para manejar la selección de una plantilla de tarea
  const handleSelectTemplate = (template) => {
    // Aplicar los datos de la plantilla al formulario
    setNewTaskTitle(template.title || '');
    setNewTaskDescription(template.description || '');
    
    // Aplicar datos de ubicación si existen
    if (template.location) {
      setTaskLocation(template.location.coordinates || null);
      setTaskRadius(template.radius || 1.0);
      setTaskLocationName(template.locationName || '');
    }
    
    // Aplicar límite de tiempo si existe
    if (template.timeLimit) {
      const hours = Math.floor(template.timeLimit / 60);
      const minutes = template.timeLimit % 60;
      setSelectedHours(hours);
      setSelectedMinutes(minutes);
      setTaskTimeLimit(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
    
    // Aplicar palabras clave si existen
    if (template.keywords && Array.isArray(template.keywords)) {
      setTaskKeywords(template.keywords);
    }
    
    // Aplicar modo manos libres
    setHandsFreeMode(template.handsFreeMode || false);
    
    // Cerrar el selector de plantillas
    setShowTemplateSelector(false);
    
    // Mostrar mensaje de confirmación
    Alert.alert(
      t('success'),
      `${t('templateApplied')}: ${template.name}`,
      [{ text: 'OK' }]
    );
  };

  // Renderizar el formulario para añadir tareas
  const renderAddTaskForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.formHeaderRow}>
          <Text style={styles.formTitle}>{t('addNewTask')}</Text>
        </View>
        
        <TextInput
          style={[styles.input, { color: '#fff3e5', borderColor: '#fff3e5' }]}
          placeholder={t('taskTitle')}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          placeholderTextColor="#a8a8a8"
        />
        
        <TextInput
          style={[styles.input, styles.textArea, { color: '#fff3e5', borderColor: '#fff3e5' }]}
          placeholder={t('taskDescription')}
          value={newTaskDescription}
          onChangeText={setNewTaskDescription}
          multiline={true}
          numberOfLines={3}
          placeholderTextColor="#a8a8a8"
        />
        
        {/* Campo para tiempo límite (solo para administradores) */}
        {user?.isAdmin && (
          <View style={styles.timeLimitContainer}>
            <Ionicons name="timer-outline" size={20} color="#fff3e5" style={styles.timeLimitIcon} />
            <TouchableOpacity 
              style={styles.timePicker} 
              onPress={showTimePicker}
            >
              <Text style={styles.timePickerText}>
                {formatSelectedTime()}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#fff3e5" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Botón para seleccionar ubicación */}
        <View style={styles.locationContainer}>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => setShowLocationSelector(true)}
          >
            <Ionicons name="location" size={20} color="#000000" />
            <Text style={[styles.locationButtonText, { color: '#fff3e5' }]}>
              {taskLocation 
                ? `${taskLocationName || t('selectedLocation')} (${taskRadius} km)` 
                : t('addLocationAndRadius')}
            </Text>
          </TouchableOpacity>
          
          {/* Botón para seleccionar ubicaciones guardadas */}
          <TouchableOpacity 
            style={[styles.savedLocationsButton, { backgroundColor: '#fff3e5', padding: 10, marginLeft: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => setShowSavedLocationsSelector(true)}
          >
            <Ionicons name="bookmark" size={24} color="#000000" />
          </TouchableOpacity>
          
          {/* Botón para plantillas de tareas (solo para administradores) */}
          {/* Botón para seleccionar plantillas de tareas (solo para administradores) */}
          {user?.isAdmin && (
            <TouchableOpacity 
              style={[styles.templateButton, { backgroundColor: '#fff3e5', padding: 10, marginLeft: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }]}
              onPress={() => setShowTemplateSelector(true)}
            >
              <Ionicons name="copy-outline" size={24} color="#000000" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Opción de Modo Manos Libres */}
        <View style={styles.handsFreeContainer}>
          <View style={styles.handsFreeTextContainer}>
            <Ionicons name="mic-outline" size={20} color="#fff3e5" />
            <Text style={[styles.handsFreeText, { color: '#fff3e5' }]}>{t('handsFreeMode')}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.handsFreeSwitch, 
              handsFreeMode ? { backgroundColor: '#fff3e5' } : styles.handsFreeInactive
            ]}
            onPress={() => setHandsFreeMode(!handsFreeMode)}
          >
            <View style={[
              styles.handsFreeHandle,
              handsFreeMode ? { backgroundColor: '#000000' } : styles.handsFreeHandleInactive
            ]} />
          </TouchableOpacity>
        </View>
        
        {/* Campo para palabras clave solo si handsFreeMode está activado */}
        {handsFreeMode && (
          <View style={styles.keywordsContainer}>
            <Text style={[styles.keywordsLabel, { color: '#fff3e5' }]}>{t('voiceKeywords') || 'Palabras clave para activación por voz'}</Text>
            
            <View style={styles.keywordInputRow}>
              <TextInput
                style={[styles.input, styles.keywordInput, { color: '#fff3e5', borderColor: '#fff3e5' }]}
                placeholder={t('keywordPlaceholder') || "Escriba una palabra clave"}
                value={currentKeyword}
                onChangeText={setCurrentKeyword}
                placeholderTextColor="#a8a8a8"
              />
              <TouchableOpacity 
                style={[styles.addKeywordButton, { backgroundColor: '#fff3e5' }]}
                onPress={() => {
                  if (currentKeyword.trim()) {
                    setTaskKeywords([...taskKeywords, currentKeyword.trim()]);
                    setCurrentKeyword('');
                  }
                }}
              >
                <Text style={[styles.addKeywordButtonText, { color: '#000000' }]}>+</Text>
              </TouchableOpacity>
            </View>
            
            {taskKeywords.length > 0 && (
              <View style={styles.keywordsList}>
                <Text style={styles.keywordsListTitle}>Keywords:</Text>
                <View style={styles.keywordTags}>
                  {taskKeywords.map((keyword, index) => (
                    <View key={`keyword-${index}`} style={styles.keywordTag}>
                      <Text style={styles.keywordTagText}>{keyword}</Text>
                      <TouchableOpacity
                        style={styles.removeKeywordButton}
                        onPress={() => {
                          const updatedKeywords = [...taskKeywords];
                          updatedKeywords.splice(index, 1);
                          setTaskKeywords(updatedKeywords);
                        }}
                      >
                        <Text style={styles.removeKeywordButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
        
        {user?.isAdmin && (
          <TouchableOpacity 
            style={styles.userSelectButton}
            onPress={() => setShowUserSelector(true)}
          >
            <Text style={[styles.userSelectButtonText, { color: '#fff3e5' }]}>
              {selectedUserId 
                ? users.find(u => u._id === selectedUserId)?.username || t('userSelected')
                : t('assignToUser')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#fff3e5" />
          </TouchableOpacity>
        )}
        
        <View style={styles.formButtons}>
          <TouchableOpacity 
            style={[styles.formButton, styles.cancelButton]}
            onPress={() => {
              setShowAddForm(false);
              setNewTaskTitle('');
              setNewTaskDescription('');
              setSelectedUserId(null);
              setTaskLocation(null);
              setTaskRadius(1.0);
              setTaskLocationName('');
              setHandsFreeMode(false); // Restablecer el modo manos libres
              setTaskKeywords([]); // Restablecer palabras clave
              setCurrentKeyword(''); // Limpiar el campo de entrada actual
              setTaskTimeLimit(''); // Limpiar el campo de tiempo límite
            }}
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.formButton, styles.saveButton]}
            onPress={addTask}
          >
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        {/* Location and Radius Selector */}
        <LocationRadiusSelector
          visible={showLocationSelector}
          onClose={() => setShowLocationSelector(false)}
          onSave={handleLocationSelected}
          initialLocation={taskLocation ? {
            latitude: taskLocation.coordinates[1],
            longitude: taskLocation.coordinates[0]
          } : null}
          initialRadius={taskRadius}
          initialLocationName={taskLocationName}
        />
        
        {/* Saved Locations Selector */}
        <SavedLocationsSelector
          visible={showSavedLocationsSelector}
          onClose={() => setShowSavedLocationsSelector(false)}
          onSelect={handleSelectSavedLocation}
        />
        
        {/* Task Templates Selector - Solo para administradores */}
        {user?.isAdmin && (
          <TaskTemplateSelector
            visible={showTemplateSelector}
            onClose={() => setShowTemplateSelector(false)}
            onSelectTemplate={handleSelectTemplate}
            currentTask={{
              title: newTaskTitle,
              description: newTaskDescription,
              location: taskLocation ? { coordinates: taskLocation.coordinates } : null,
              radius: taskRadius,
              locationName: taskLocationName,
              timeLimit: selectedHours * 60 + selectedMinutes,
              keywords: taskKeywords,
              handsFreeMode: handsFreeMode
            }}
          />
        )}
      </View>
    );
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
                <TouchableOpacity style={styles.timeButton} onPress={incrementHours}>
                  <Ionicons name="chevron-up" size={24} color="#fff3e5" />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{selectedHours.toString().padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={decrementHours}>
                  <Ionicons name="chevron-down" size={24} color="#fff3e5" />
                </TouchableOpacity>
              </View>
              
              {/* Separador */}
              <Text style={styles.timeSeparator}>:</Text>
              
              {/* Selector de minutos */}
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>{t('minutes') || "Minutos"}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={incrementMinutes}>
                  <Ionicons name="chevron-up" size={24} color="#fff3e5" />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{selectedMinutes.toString().padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={decrementMinutes}>
                  <Ionicons name="chevron-down" size={24} color="#fff3e5" />
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
          <Text style={styles.statValue}>{tasks.length}</Text>
          <Text style={styles.statLabel}>{t('total')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tasks.filter(task => task.completed).length}
          </Text>
          <Text style={styles.statLabel}>{t('completed')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tasks.filter(task => !task.completed).length}
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
          
          {showAddForm && user?.isAdmin && renderAddTaskForm()}
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('noTasks')}</Text>
              <Text style={styles.emptySubText}>{t('tasksWillAppearHere')}</Text>
            </View>
          ) : (
            <FlatList
              style={styles.taskList}
              data={tasks}
              renderItem={renderTask}
              keyExtractor={item => item._id}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}
        </>
      )}
      
      {renderUserSelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
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
    padding: 15,
    borderRadius: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#cccccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addTaskButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.04, 16),
    marginLeft: 8,
  },
  taskList: {
    flex: 1,
    marginHorizontal: 15,
  },
  taskItem: {
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  taskTitle: {
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: '#ff5252',
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: 'bold',
  },
  taskDetails: {
    flex: 1,
  },
  taskDescription: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.7,
    marginBottom: 5,
  },
  assignedToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  assignedToLabel: {
    fontSize: Math.min(width * 0.03, 12),
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  assignedToValue: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.7,
    marginLeft: 5,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  taskDate: {
    fontSize: 12,
    color: '#666',
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
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
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
});

export default TaskScreen;
