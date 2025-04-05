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
import * as api from '../services/api';

const TaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { strings, language, toggleLanguage } = useLanguage();
  
  // Debug - Log language and available translations
  console.log('TaskScreen - Current language:', language);
  console.log('TaskScreen - Translation keys available:', Object.keys(strings || {}));
  
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);

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
      setError(error.message || strings.loadTasksError);
      Alert.alert(strings.errorAlert, error.message || strings.loadTasksError);
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
      Alert.alert(strings.errorAlert, strings.loadUsersError);
    }
  };

  // Cargar tareas y usuarios al montar el componente
  useEffect(() => {
    loadTasks();
    
    // Add a debug listener for tasks and users updates
    console.log('TaskScreen mounted');
    
    return () => {
      console.log('TaskScreen unmounted');
    };
  }, []);

  // Add a useEffect to monitor users state
  useEffect(() => {
    if (users.length > 0) {
      console.log('Users state updated. Now have', users.length, 'users.');
      console.log('First 3 users:', users.slice(0, 3).map(u => ({ 
        id: u._id, 
        username: u.username,
        idType: typeof u._id 
      })));
    }
  }, [users]);
  
  // Add a useEffect to monitor tasks state
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('Tasks state updated. Now have', tasks.length, 'tasks.');
      console.log('First 3 tasks:', tasks.slice(0, 3).map(t => ({ 
        id: t._id, 
        title: t.title,
        userId: t.userId,
        userIdType: typeof t.userId
      })));
    }
  }, [tasks]);

  // Añadir nueva tarea
  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert(strings.errorAlert, strings.titleRequired);
      return;
    }

    try {
      console.log('Creando tarea con los siguientes datos:');
      console.log('Título:', newTaskTitle);
      console.log('Descripción:', newTaskDescription);
      console.log('Usuario seleccionado ID:', selectedUserId);
      console.log('Usuario seleccionado nombre:', selectedUserName);
      
      const taskData = { 
        title: newTaskTitle,
        description: newTaskDescription,
        completed: false  
      };
      
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
        // Aseguramos que la tarea tenga la propiedad completed
        const newTask = {
          ...result.task,
          completed: result.task.completed !== undefined ? result.task.completed : false
        };
        setTasks([...tasks, newTask]);
      } else if (result) {
        // Si no hay result.task pero hay result, asumimos que el resultado es la tarea
        const newTask = {
          ...result,
          completed: result.completed !== undefined ? result.completed : false
        };
        setTasks([...tasks, newTask]);
      }
      
      setNewTaskTitle('');
      setNewTaskDescription('');
      setSelectedUserId(null);
      setSelectedUserName('');
      setShowAddForm(false);
      
      // Mostrar mensaje de éxito
      Alert.alert(strings.successAlert, strings.taskAddSuccess);
      
      // Recargar las tareas para asegurarnos de tener los datos actualizados
      loadTasks();
    } catch (error) {
      console.error('Error al añadir tarea:', error);
      Alert.alert(strings.errorAlert, error.message || 'Error al añadir tarea');
    }
  };

  // Eliminar tarea
  const deleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter(task => task._id !== taskId));
      Alert.alert(strings.successAlert, strings.taskDeleteSuccess);
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      Alert.alert(strings.errorAlert, error.message || 'Error al eliminar tarea');
    }
  };

  // Confirmar eliminación de tarea
  const confirmDeleteTask = (taskId) => {
    Alert.alert(
      strings.confirmDelete,
      strings.deleteWarning,
      [
        { text: strings.no, style: 'cancel' },
        { text: strings.yes, style: 'destructive', onPress: () => deleteTask(taskId) }
      ]
    );
  };

  // Alternar estado de completado
  const toggleComplete = (taskId) => {
    setTasks(tasks.map(task => {
      if (task._id === taskId) {
        // Asegurarnos de que completed tenga un valor por defecto
        const currentCompleted = task.completed !== undefined ? task.completed : false;
        return { ...task, completed: !currentCompleted };
      }
      return task;
    }));
  };

  // Renderizar cada tarea
  const renderTask = ({ item }) => {
    // Verificar que item existe
    if (!item) {
      console.log('Error: Se intentó renderizar una tarea undefined');
      return null;
    }
    
    // Con optional chaining para evitar errores
    const completed = item?.completed !== undefined ? item.completed : false;
    
    let assignedUserName = '';
    
    if (user?.isAdmin && item?.userId) {
      console.log(`Looking for user with ID "${item.userId}" (${typeof item.userId})`);
      
      // Log all users for debugging
      if (users.length > 0) {
        console.log('Available users:', users.map(u => `${u.username} (${u._id}, ${typeof u._id})`).join(', '));
      } else {
        console.log('No users available in state');
      }
      
      // Convert userId to string for consistent comparison
      const userIdString = String(item.userId);
      
      // Buscar el nombre de usuario en la lista de usuarios with better matching
      const assignedUser = users.find(u => {
        const uIdString = String(u._id);
        const matches = uIdString === userIdString;
        
        if (matches) {
          console.log(`Found matching user: ${u.username} with ID ${u._id}`);
        }
        
        return matches;
      });
      
      if (assignedUser) {
        assignedUserName = assignedUser.username;
        console.log(`Task ${item._id} - assigned to user: ${assignedUserName}`);
      } else {
        console.log(`Task ${item._id} - NO MATCHING USER FOUND for ID: ${item.userId}`);
        assignedUserName = 'Unknown User';
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
              completed && styles.taskCompleted,
              {color: completed ? '#aaaaaa' : '#333333'}
            ]}
          >
            {item.title || strings?.noTitle || 'No title'}
          </Text>
          
          {item.description ? (
            <Text 
              style={[
                styles.taskDescription, 
                completed && styles.taskCompleted,
                {color: completed ? '#aaaaaa' : '#666666'}
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          
          {/* Mostrar el usuario asignado si es administrador */}
          {user?.isAdmin && (
            <Text style={[styles.assignedUser, {color: '#4A90E2'}]}>
              {strings?.assignTo || 'Assign to'}: {assignedUserName}
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

  // Renderizar selector de usuarios
  const renderUserSelector = () => {
    return (
      <Modal
        visible={showUserSelector}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {color: '#333333'}]}>
              {strings?.selectUserToAssign || 'Select user to assign'}
            </Text>
            
            <ScrollView style={styles.userList}>
              {users.map(user => (
                <TouchableOpacity
                  key={user._id.toString()}
                  style={styles.userItem}
                  onPress={() => {
                    // Store both the ID and the username, always as strings
                    const userId = String(user._id);
                    setSelectedUserId(userId);
                    setSelectedUserName(user.username);
                    console.log(`Selected user: ${user.username} with ID ${userId}`);
                    setShowUserSelector(false);
                  }}
                >
                  <Text style={[styles.userName, {color: '#333333'}]}>
                    {user.username}
                  </Text>
                  {String(user._id) === selectedUserId && (
                    <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowUserSelector(false)}
            >
              <Text style={[styles.closeButtonText, {color: '#FFFFFF'}]}>
                {strings?.close || 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Add Task Button only */}
      <View style={styles.headerRow}>
        {!showAddForm ? (
          <TouchableOpacity 
            style={styles.addTaskButton}
            onPress={() => setShowAddForm(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addTaskButtonText}>
              {strings?.addNewTask || 'Add New Task'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      
      {showAddForm ? (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder={strings?.taskTitle || 'Task title'}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={strings?.taskDescription || 'Description (optional)'}
            value={newTaskDescription}
            onChangeText={setNewTaskDescription}
            multiline
            numberOfLines={3}
          />
          
          {/* Botón para seleccionar usuario si es administrador */}
          {user?.isAdmin && (
            <TouchableOpacity
              style={styles.userSelectButton}
              onPress={() => setShowUserSelector(true)}
            >
              <Text style={styles.userSelectButtonText}>
                {selectedUserId 
                  ? `${strings?.assignTo || 'Assign to'}: ${selectedUserName || 'Selected User'}`
                  : strings?.selectUser || 'Select User'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#4A90E2" />
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
                setSelectedUserName('');
              }}
            >
              <Text style={styles.cancelButtonText}>
                {strings?.cancel || 'Cancel'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.formButton, styles.addButton]}
              onPress={addTask}
            >
              <Text style={styles.addButtonText}>
                {strings?.add || 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, {color: '#666666'}]}>
            {strings?.loadingTasks || 'Loading tasks...'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>{tasks.length}</Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.total || 'Total'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>
                {tasks.filter(task => !task.completed).length}
              </Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.pending || 'Pending'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#4A90E2'}]}>
                {tasks.filter(task => task.completed).length}
              </Text>
              <Text style={[styles.statLabel, {color: '#666666'}]}>
                {strings?.completed || 'Completed'}
              </Text>
            </View>
          </View>
          
          <FlatList
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item._id.toString()}
            style={styles.taskList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, {color: '#666666'}]}>
                  {strings?.noTasks || 'No tasks available'}
                </Text>
                <Text style={[styles.emptySubtext, {color: '#999999'}]}>
                  {strings?.addTaskPrompt || 'Add a new task using the button above'}
                </Text>
              </View>
            }
          />
        </>
      )}
      
      {/* Modal para seleccionar usuario */}
      {renderUserSelector()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    backgroundColor: '#f9f9f9',
    color: '#333333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: 'bold',
  },
  addTaskButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  addTaskButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  userSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
  },
  userSelectButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
    color: '#666666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    color: '#666666',
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
    color: '#333333',
    marginBottom: 5,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666666',
  },
  assignedUser: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 5,
    fontStyle: 'italic',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaaaaa',
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
    color: '#666666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
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
    color: '#333333',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
  },
  closeButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4A90E2',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  languageButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default TaskScreen;