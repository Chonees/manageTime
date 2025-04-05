import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const UserManagementScreen = () => {
  const { user } = useAuth();
  const { strings, language, toggleLanguage } = useLanguage();
  
  // Debug log
  console.log("UserManagementScreen - Current language:", language);
  console.log("UserManagementScreen - Available translation keys:", Object.keys(strings || {}));
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Cargar usuarios
  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const usersList = await api.getUsers();
      setUsers(usersList);
    } catch (error) {
      setError(error.message || strings?.loadUsersError || 'Error loading users');
      Alert.alert(strings?.errorAlert || 'Error', error.message || strings?.loadUsersError || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  // Filtrar usuarios según la búsqueda
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Renderizar lista de usuarios
  const renderUserList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>
            {strings?.loadingUsers || 'Loading users...'}
          </Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {strings?.errorAlert || 'Error'}: {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
            <Text style={styles.retryButtonText}>
              {strings?.retry || 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (users.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {strings?.noUsers || 'No registered users'}
          </Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item && item._id ? item._id.toString() : `user-${Math.random()}`}
        renderItem={({ item }) => {
          if (!item) return null;
          
          return (
            <TouchableOpacity 
              style={styles.userItem}
              onPress={() => {
                setSelectedUser(item);
                setModalVisible(true);
              }}
            >
              <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.email}>
                  {item.email || strings?.notAvailable || 'Not available'}
                </Text>
                <View style={styles.userMeta}>
                  <Text style={[
                    styles.userStatus,
                    { color: item.isActive ? '#2ecc71' : '#e74c3c' }
                  ]}>
                    {item.isActive 
                      ? (strings?.active || 'Active') 
                      : (strings?.inactive || 'Inactive')}
                  </Text>
                  <Text style={styles.userRole}>
                    {item.isAdmin 
                      ? (strings?.administrator || 'Administrator') 
                      : (strings?.normalUser || 'Normal user')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.userActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.statusButton]}
                  onPress={() => toggleUserStatus(item._id, item.isActive)}
                >
                  <Text style={styles.buttonText}>
                    {item.isActive 
                      ? (strings?.deactivateUser || 'Deactivate') 
                      : (strings?.activateUser || 'Activate')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.roleButton]}
                  onPress={() => toggleUserRole(item._id, item.isAdmin)}
                >
                  <Text style={styles.buttonText}>
                    {item.isAdmin 
                      ? (strings?.makeNormal || 'Normal') 
                      : (strings?.makeAdmin || 'Admin')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => confirmDeleteUser(item._id)}
                >
                  <Text style={styles.buttonText}>
                    {strings?.deleteUser || 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  // Función para cambiar el estado de un usuario (activo/inactivo)
  const toggleUserStatus = async (userId, isActive) => {
    try {
      // En una implementación real, esto sería una llamada a la API
      // await api.updateUserStatus(userId, !isActive);
      
      // Actualizar estado local
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isActive: !isActive } : user
      ));
      
      const statusMessage = isActive 
        ? (strings?.deactivated || 'deactivated') 
        : (strings?.activated || 'activated');
      
      const successTemplate = strings?.userStatusToggleSuccess || 'User successfully {0}';
      const successMessage = successTemplate.replace('{0}', statusMessage);
      
      Alert.alert(strings?.successAlert || 'Success', successMessage);
    } catch (error) {
      Alert.alert(strings?.errorAlert || 'Error', error.message || strings?.loadUsersError || 'Error updating user status');
    }
  };

  // Función para cambiar el rol de un usuario (admin/normal)
  const toggleUserRole = async (userId, isAdmin) => {
    try {
      // En una implementación real, esto sería una llamada a la API
      // await api.updateUserRole(userId, !isAdmin);
      
      // Actualizar estado local
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isAdmin: !isAdmin } : user
      ));
      
      const roleText = isAdmin 
        ? (strings?.normalUser || 'normal user') 
        : (strings?.administrator || 'administrator');
      
      const successTemplate = strings?.userRoleToggleSuccess || 'User role changed to {0}';
      const successMessage = successTemplate.replace('{0}', roleText);
      
      Alert.alert(strings?.successAlert || 'Success', successMessage);
    } catch (error) {
      Alert.alert(strings?.errorAlert || 'Error', error.message || strings?.loadUsersError || 'Error updating user role');
    }
  };

  // Función para eliminar un usuario
  const deleteUser = async (userId) => {
    try {
      // En una implementación real, esto sería una llamada a la API
      // await api.deleteUser(userId);
      
      // Actualizar estado local
      setUsers(users.filter(user => user._id !== userId));
      
      Alert.alert(strings?.successAlert || 'Success', strings?.userDeleteSuccess || 'User successfully deleted');
    } catch (error) {
      Alert.alert(strings?.errorAlert || 'Error', error.message || 'Error deleting user');
    }
  };

  // Función para confirmar eliminación de usuario
  const confirmDeleteUser = (userId) => {
    Alert.alert(
      strings?.confirmUserDelete || 'Confirm Deletion',
      strings?.userDeleteWarning || 'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: strings?.cancel || 'Cancel', style: 'cancel' },
        { text: strings?.delete || 'Delete', style: 'destructive', onPress: () => deleteUser(userId) }
      ]
    );
  };

  // Renderizar modal de detalles de usuario
  const renderUserDetailsModal = () => {
    if (!selectedUser) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {strings?.userDetails || 'User Details'}
            </Text>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>
                {strings?.userId || 'ID'}:
              </Text>
              <Text style={styles.detailValue}>
                {selectedUser._id || strings?.notAvailable || 'Not available'}
              </Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>
                {strings?.username || 'Username'}:
              </Text>
              <Text style={styles.detailValue}>
                {selectedUser.username || strings?.notAvailable || 'Not available'}
              </Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>
                {strings?.userEmail || 'Email'}:
              </Text>
              <Text style={styles.detailValue}>
                {selectedUser.email || strings?.notAvailable || 'Not available'}
              </Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>
                {strings?.userRole || 'Role'}:
              </Text>
              <Text style={styles.detailValue}>
                {selectedUser.isAdmin 
                  ? (strings?.administrator || 'Administrator') 
                  : (strings?.normalUser || 'Normal user')}
              </Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>
                {strings?.userStatus || 'Status'}:
              </Text>
              <Text style={[
                styles.detailValue,
                { color: selectedUser.isActive ? '#2ecc71' : '#e74c3c' }
              ]}>
                {selectedUser.isActive 
                  ? (strings?.active || 'Active') 
                  : (strings?.inactive || 'Inactive')}
              </Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>
                {strings?.userRegistrationDate || 'Registration date'}:
              </Text>
              <Text style={styles.detailValue}>
                {selectedUser.createdAt 
                  ? new Date(selectedUser.createdAt).toLocaleDateString() 
                  : (strings?.notAvailable || 'Not available')}
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>
                  {strings?.close || 'Close'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.statusButton]}
                onPress={() => {
                  if (selectedUser && selectedUser._id) {
                    toggleUserStatus(selectedUser._id, selectedUser.isActive);
                    setModalVisible(false);
                  }
                }}
              >
                <Text style={styles.buttonText}>
                  {selectedUser.isActive 
                    ? (strings?.deactivateUser || 'Deactivate') 
                    : (strings?.activateUser || 'Activate')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.roleButton]}
                onPress={() => {
                  if (selectedUser && selectedUser._id) {
                    toggleUserRole(selectedUser._id, selectedUser.isAdmin);
                    setModalVisible(false);
                  }
                }}
              >
                <Text style={styles.buttonText}>
                  {selectedUser.isAdmin 
                    ? (strings?.makeNormal || 'Normal') 
                    : (strings?.makeAdmin || 'Admin')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Title Only */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          {strings?.userManagementTitle || 'User Management'}
        </Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={strings?.searchUsers || 'Search users...'}
          placeholderTextColor="#999999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {renderUserList()}
      
      {renderUserDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    backgroundColor: '#f8f8f8',
    color: '#333333',
  },
  errorText: {
    color: '#e74c3c',
    padding: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  userItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    marginBottom: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  email: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: 5,
    marginBottom: 10,
  },
  userStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 10,
  },
  userRole: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: 'bold',
    paddingVertical: 3,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  statusButton: {
    backgroundColor: '#3498db',
  },
  roleButton: {
    backgroundColor: '#9b59b6',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
    textAlign: 'center',
  },
  userDetailItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    flex: 2,
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#95a5a6',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default UserManagementScreen;
