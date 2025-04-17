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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import * as api from '../services/api';
import LocationRadiusSelector from '../components/LocationRadiusSelector';

const TaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
  const [taskLocation, setTaskLocation] = useState(null);
  const [taskRadius, setTaskRadius] = useState(1.0);
  const [taskLocationName, setTaskLocationName] = useState('');
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [taskKeywords, setTaskKeywords] = useState([]);
  const [currentKeyword, setCurrentKeyword] = useState('');

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

  // Añadir nueva tarea
  const addTask = async () => {
    // Verificar que el usuario sea administrador
    if (!user?.isAdmin) {
      Alert.alert(t('error'), t('unauthorizedAction'));
      return;
    }

    if (!newTaskTitle.trim()) {
      Alert.alert(t('error'), t('taskTitleRequired'));
      return;
    }

    try {
      console.log(t('creatingTask'));
      
      const taskData = { 
        title: newTaskTitle,
        description: newTaskDescription,
        completed: false,
        handsFreeMode: handsFreeMode,  // Añadir opción de manos libres
        status: handsFreeMode ? 'in_progress' : 'pending',  // Si es manos libres, establecer como in_progress
        keywords: handsFreeMode ? taskKeywords.join(',') : null
      };
      
      // Añadir información de ubicación si está configurada
      if (taskLocation) {
        taskData.location = taskLocation;
        taskData.radius = taskRadius;
        taskData.locationName = taskLocationName;
        console.log(t('addingLocation', { 
          coordinates: taskLocation.coordinates, 
          radius: taskRadius,
          place: taskLocationName || t('noPlaceName')
        }));
      }
      
      let result;
      
      // Si es admin y hay un usuario seleccionado, usar el endpoint específico para asignar tareas
      if (user?.isAdmin && selectedUserId) {
        // Make sure userId is a string
        const userIdString = String(selectedUserId);
        console.log(t('adminAssigningTask', { userId: userIdString }));
        
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
          if (typeof result.task.userId === 'object') {
            taskUserId = result.task.userId._id;
            taskUsername = result.task.userId.username;
            console.log(t('newTaskHasUsername', { username: taskUsername }));
          } else {
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
          _username: taskUsername,
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
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
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
                <Text style={styles.userItemText}>{user.username}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

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

  // Renderizar el formulario para añadir tareas
  const renderAddTaskForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.formHeaderRow}>
          <Text style={styles.formTitle}>{t('addNewTask')}</Text>
        </View>
        
        <TextInput
          style={styles.input}
          placeholder={t('taskTitle')}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('taskDescription')}
          value={newTaskDescription}
          onChangeText={setNewTaskDescription}
          multiline={true}
          numberOfLines={3}
        />
        
        {/* Botón para abrir selector de ubicación y radio */}
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={() => setShowLocationSelector(true)}
        >
          <Ionicons name="location" size={20} color="#4A90E2" />
          <Text style={styles.locationButtonText}>
            {taskLocation 
              ? `${taskLocationName || t('selectedLocation')} (${taskRadius} km)` 
              : t('addLocationAndRadius')}
          </Text>
        </TouchableOpacity>
        
        {/* Opción de Modo Manos Libres */}
        <View style={styles.handsFreeContainer}>
          <View style={styles.handsFreeTextContainer}>
            <Ionicons name="mic-outline" size={20} color="#4A90E2" />
            <Text style={styles.handsFreeText}>{t('handsFreeMode')}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.handsFreeSwitch, 
              handsFreeMode ? styles.handsFreeActive : styles.handsFreeInactive
            ]}
            onPress={() => setHandsFreeMode(!handsFreeMode)}
          >
            <View style={[
              styles.handsFreeHandle,
              handsFreeMode ? styles.handsFreeHandleActive : styles.handsFreeHandleInactive
            ]} />
          </TouchableOpacity>
        </View>
        
        {/* Campo para palabras clave solo si handsFreeMode está activado */}
        {handsFreeMode && (
          <View style={styles.keywordsContainer}>
            <Text style={styles.keywordsLabel}>{t('voiceKeywords') || 'Palabras clave para activación por voz'}</Text>
            
            <View style={styles.keywordInputRow}>
              <TextInput
                style={[styles.input, styles.keywordInput]}
                placeholder={t('keywordPlaceholder') || "Escriba una palabra clave"}
                value={currentKeyword}
                onChangeText={setCurrentKeyword}
              />
              <TouchableOpacity 
                style={styles.addKeywordButton}
                onPress={() => {
                  if (currentKeyword.trim()) {
                    setTaskKeywords([...taskKeywords, currentKeyword.trim()]);
                    setCurrentKeyword('');
                  }
                }}
              >
                <Text style={styles.addKeywordButtonText}>+</Text>
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
            <Text style={styles.userSelectButtonText}>
              {selectedUserId 
                ? users.find(u => u._id === selectedUserId)?.username || t('userSelected')
                : t('assignToUser')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
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

        {/* Location and Radius Selector ayush */}
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tasks')}</Text>
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
        <View style={[styles.statItem, { borderRightWidth: 0 }]}>
          <Text style={styles.statValue}>
            {tasks.filter(task => !task.completed).length}
          </Text>
          <Text style={styles.statLabel}>{t('pending')}</Text>
        </View>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>{t('loadingTasks')}</Text>
        </View>
      ) : (
        <>
          {!showAddForm && user?.isAdmin && (
            <TouchableOpacity 
              style={styles.addTaskButton}
              onPress={() => setShowAddForm(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  addTaskButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  taskList: {
    flex: 1,
    marginHorizontal: 15,
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 20,
    fontWeight: 'bold',
  },
  taskDetails: {
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  assignedToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  assignedToLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  assignedToValue: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#333',
    flex: 1,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  userSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userSelectButtonText: {
    color: '#4A90E2',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationButtonText: {
    color: '#4A90E2',
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
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
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
    color: '#333',
    flex: 1,
  },
  userList: {
    maxHeight: 300,
  },
  userItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedUserItem: {
    backgroundColor: '#4A90E2',
  },
  closeButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#666',
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
    backgroundColor: '#4A90E2',
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
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addKeywordButtonText: {
    color: '#fff',
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
});

export default TaskScreen;
