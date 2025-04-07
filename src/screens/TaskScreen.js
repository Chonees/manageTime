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
import * as api from '../services/api';
import LocationRadiusSelector from '../components/LocationRadiusSelector';

const TaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [taskLocation, setTaskLocation] = useState(null);
  const [taskRadius, setTaskRadius] = useState(1.0);
  const [taskLocationName, setTaskLocationName] = useState('');

  // Cargar tareas
  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Cargando tareas...');
      // Usar getUserTasks para usuarios normales y getTasks para administradores
      const tasksData = user?.isAdmin 
        ? await api.getTasks() 
        : await api.getUserTasks();
      
      console.log(`Se cargaron ${tasksData.length} tareas`);
      
      // Asegurarnos de que todas las tareas tengan la propiedad completed
      const formattedTasks = tasksData.map(task => ({
        ...task,
        completed: task.completed !== undefined ? task.completed : false
      }));
      
      setTasks(formattedTasks);
      
      // Si es administrador, también cargar usuarios
      if (user?.isAdmin) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
      setError(error.message || 'Error al cargar tareas');
      Alert.alert('Error', error.message || 'Error al cargar tareas');
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
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    }
  };

  // Cargar tareas y usuarios al montar el componente
  useEffect(() => {
    loadTasks();
  }, []);

  // Añadir nueva tarea
  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para la tarea');
      return;
    }

    try {
      console.log('Creando tarea con los siguientes datos:');
      
      const taskData = { 
        title: newTaskTitle,
        description: newTaskDescription,
        completed: false  
      };
      
      // Añadir información de ubicación si está configurada
      if (taskLocation) {
        taskData.location = taskLocation;
        taskData.radius = taskRadius;
        taskData.locationName = taskLocationName;
        console.log(`Añadiendo ubicación: ${taskLocation.coordinates}, radio: ${taskRadius}km, lugar: ${taskLocationName || 'Sin nombre'}`);
      }
      
      let result;
      
      // Si es admin y hay un usuario seleccionado, usar el endpoint específico para asignar tareas
      if (user?.isAdmin && selectedUserId) {
        console.log(`Administrador asignando tarea al usuario con ID: ${selectedUserId}`);
        taskData.userId = selectedUserId;
        
        // Usar la nueva función específica para asignar tareas
        result = await api.assignTask(taskData);
        console.log('Respuesta del servidor (asignación):', JSON.stringify(result));
      } else {
        // Caso normal: crear tarea para el usuario actual
        console.log('Creando tarea para el usuario actual');
        result = await api.saveTask(taskData);
        console.log('Respuesta del servidor (normal):', JSON.stringify(result));
      }
      
      // Verificamos que result.task existe antes de añadirlo
      if (result && result.task) {
        // Añadimos la nueva tarea a la lista actual
        setTasks(currentTasks => [result.task, ...currentTasks]);
        
        // Resetear formulario
        setNewTaskTitle('');
        setNewTaskDescription('');
        setSelectedUserId(null);
        setTaskLocation(null);
        setTaskRadius(1.0);
        setTaskLocationName('');
        setShowAddForm(false);
        
        console.log('Tarea añadida correctamente a la interfaz de usuario');
      } else {
        console.error('Respuesta incompleta del servidor:', result);
        Alert.alert('Error', 'No se pudo crear la tarea');
      }
    } catch (error) {
      console.error('Error al crear tarea:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la tarea');
    }
  };

  // Eliminar tarea
  const deleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter(task => task._id !== taskId));
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      Alert.alert('Error', error.message || 'Error al eliminar tarea');
    }
  };

  // Confirmar eliminación de tarea
  const confirmDeleteTask = (taskId) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteTask(taskId) }
      ]
    );
  };

  // Alternar estado de completado
  const toggleComplete = async (taskId) => {
    try {
      // Encontrar la tarea que se va a actualizar
      const taskToUpdate = tasks.find(task => task._id === taskId);
      if (!taskToUpdate) {
        console.error(`No se encontró la tarea con ID: ${taskId}`);
        return;
      }
      
      // Obtener el estado actual y el nuevo estado
      const currentCompleted = taskToUpdate.completed !== undefined ? taskToUpdate.completed : false;
      const newCompletedStatus = !currentCompleted;
      
      console.log(`Cambiando estado de tarea ${taskId} a ${newCompletedStatus ? 'completada' : 'pendiente'}`);
      
      // Actualizar optimistamente en la UI primero
      setTasks(tasks.map(task => {
        if (task._id === taskId) {
          return { ...task, completed: newCompletedStatus };
        }
        return task;
      }));
      
      // Mostrar indicador de guardado
      const toastMessage = newCompletedStatus ? 'Marcando tarea como completada...' : 'Marcando tarea como pendiente...';
      Alert.alert('Actualizando', toastMessage, [], { cancelable: true });
      
      try {
        // Enviar la actualización al backend con un timeout explícito
        console.log('Enviando actualización al servidor...');
        const result = await api.updateTask(taskId, { completed: newCompletedStatus });
        console.log('Respuesta recibida del servidor:', result);
        
        // También registrar la actividad manualmente para mayor seguridad
        if (newCompletedStatus) {
          try {
            await api.saveActivity({
              type: 'task_complete',
              taskId: taskId,
              message: `Tarea "${taskToUpdate.title}" completada`,
              metadata: { title: taskToUpdate.title }
            });
            console.log('Actividad de completado registrada manualmente');
          } catch (activityError) {
            console.error('Error al registrar actividad manualmente:', activityError);
          }
        }
        
        // Opcional: recargar las tareas para asegurarse que todo está sincronizado
        await loadTasks();
        
        console.log(`Tarea ${taskId} actualizada correctamente`);
      } catch (error) {
        console.error('Error al cambiar estado de tarea:', error);
        Alert.alert('Error', `No se pudo actualizar el estado de la tarea: ${error.message}`);
        
        // Revertir el cambio en la UI si hubo error
        await loadTasks();
      }
    } catch (error) {
      console.error('Error general en toggleComplete:', error);
      Alert.alert('Error', 'Ocurrió un problema al procesar la tarea');
      await loadTasks();
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

  // Renderizar cada tarea
  const renderTask = ({ item }) => {
    // Verificar que item existe
    if (!item) {
      console.log('Error: Se intentó renderizar una tarea undefined');
      return null;
    }
    
    // Asegurarnos de que completed tenga un valor por defecto
    const completed = item.completed !== undefined ? item.completed : false;
    
    // Encontrar el nombre del usuario asignado si es administrador
    let assignedUserName = '';
    if (user?.isAdmin && users.length > 0 && item.userId) {
      // Extraer el ID del usuario, que puede venir como string u objeto
      let userIdToFind;
      
      if (typeof item.userId === 'object' && item.userId._id) {
        // Si es un objeto con _id (usuario populado desde el backend)
        userIdToFind = item.userId._id.toString();
        console.log(`Tarea con usuario populado. ID a buscar: ${userIdToFind}`);
        assignedUserName = item.userId.username || 'Usuario sin nombre';
      } else {
        // Si es un string o un ObjectId
        userIdToFind = item.userId.toString();
        console.log(`Buscando usuario con ID: ${userIdToFind}`);
        
        // Buscar en la lista de usuarios
        const assignedUser = users.find(u => 
          u._id === userIdToFind || 
          u._id.toString() === userIdToFind
        );
        
        if (assignedUser) {
          assignedUserName = assignedUser.username;
          console.log(`Usuario encontrado: ${assignedUserName}`);
        } else {
          assignedUserName = 'Usuario desconocido';
          console.log(`No se encontró usuario con ID: ${userIdToFind}`);
          console.log('Lista de usuarios disponibles:', JSON.stringify(users.map(u => ({ id: u._id, username: u.username }))));
        }
      }
    }
    
    return (
      <View style={styles.taskItem}>
        <TouchableOpacity 
          style={styles.taskCheckbox}
          onPress={() => toggleComplete(item._id)}
        >
          <Ionicons 
            name={completed ? 'checkbox' : 'square-outline'} 
            size={24} 
            color={completed ? '#4CAF50' : '#757575'} 
          />
        </TouchableOpacity>
        
        <View style={styles.taskContent}>
          <Text 
            style={[
              styles.taskTitle, 
              completed && styles.taskCompleted
            ]}
          >
            {item.title || 'Sin título'}
          </Text>
          
          {item.description ? (
            <Text 
              style={[
                styles.taskDescription, 
                completed && styles.taskCompleted
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          
          {/* Mostrar el usuario asignado si es administrador */}
          {user?.isAdmin && (
            <Text style={styles.assignedUser}>
              Asignado a: {assignedUserName}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => confirmDeleteTask(item._id)}
        >
          <Ionicons name="trash-outline" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Seleccionar Usuario</Text>
          
          <ScrollView style={styles.userList}>
            {users.map(user => (
              <TouchableOpacity
                key={user._id}
                style={styles.userItem}
                onPress={() => selectUser(user._id)}
              >
                <Text style={styles.userName}>{user.username}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowUserSelector(false)}
          >
            <Text style={styles.closeButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Función para manejar la selección de ubicación y radio
  const handleLocationSelected = (locationData) => {
    setTaskLocation(locationData.location);
    setTaskRadius(locationData.radius);
    setTaskLocationName(locationData.locationName);
    console.log(`Ubicación seleccionada: ${JSON.stringify(locationData.location.coordinates)}, radio: ${locationData.radius}km, lugar: ${locationData.locationName}`);
  };

  // Renderizar el formulario para añadir tareas
  const renderAddTaskForm = () => {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Añadir Nueva Tarea</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Título de la tarea"
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descripción (opcional)"
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
              ? `${taskLocationName || 'Ubicación seleccionada'} (${taskRadius} km)` 
              : 'Añadir ubicación y radio'}
          </Text>
        </TouchableOpacity>
        
        {user?.isAdmin && (
          <TouchableOpacity 
            style={styles.userSelectButton}
            onPress={() => setShowUserSelector(true)}
          >
            <Text style={styles.userSelectButtonText}>
              {selectedUserId 
                ? users.find(u => u._id === selectedUserId)?.username || 'Usuario seleccionado'
                : 'Asignar a un usuario'}
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
            }}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.formButton, styles.saveButton]}
            onPress={addTask}
          >
            <Text style={styles.saveButtonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tasks.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {tasks.filter(task => task.completed).length}
              </Text>
              <Text style={styles.statLabel}>Completadas</Text>
            </View>
            <View style={[styles.statItem, { borderRightWidth: 0 }]}>
              <Text style={styles.statValue}>
                {tasks.filter(task => !task.completed).length}
              </Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>
          
          {!showAddForm && (
            <TouchableOpacity 
              style={styles.addTaskButton}
              onPress={() => setShowAddForm(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addTaskButtonText}>Añadir Tarea</Text>
            </TouchableOpacity>
          )}
          
          {showAddForm && renderAddTaskForm()}
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          {tasks.length > 0 ? (
            <FlatList
              data={tasks}
              renderItem={renderTask}
              keyExtractor={(item) => item._id}
              style={styles.taskList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay tareas disponibles</Text>
              <Text style={styles.emptySubtext}>
                Las tareas que añadas aparecerán aquí
              </Text>
            </View>
          )}
        </>
      )}
      
      {renderUserSelector()}
      
      {/* Selector de ubicación y radio */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
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
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  addTaskButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    textAlign: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
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
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskCheckbox: {
    marginRight: 10,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
  },
  assignedUser: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 5,
    fontStyle: 'italic',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  deleteButton: {
    padding: 5,
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
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  userList: {
    maxHeight: 300,
  },
  userItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
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
    fontWeight: 'bold',
  },
});

export default TaskScreen;