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
  Modal,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const UserManagementScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const usersList = await api.getUsers();
      setUsers(usersList);
    } catch (error) {
      setError(error.message || t('error'));
      Alert.alert(t('error'), error.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderUserList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.lightCream} />
          <Text style={styles.loadingText}>{t('loadingUsers')}</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('error')}: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (users.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('noUsers')}</Text>
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
                <Text style={styles.email}>{item.email || t('noEmail')}</Text>
                <View style={styles.userMeta}>
                  <Text style={[styles.userStatus, { color: item.isActive ? '#4CAF50' : '#ff5252' }]}>
                    {item.isActive ? t('active') : t('inactive')}
                  </Text>
                  <Text style={styles.userRole}>
                    {item.isAdmin ? t('adminUser') : t('normalUser')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.userActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.statusButton]}
                  onPress={() => toggleUserStatus(item._id, item.isActive)}
                >
                  <Text style={styles.buttonText}>
                    {item.isActive ? t('deactivate') : t('activate')}
                  </Text>
                </TouchableOpacity>
                
                {/* Se eliminó el botón para cambiar roles de usuario por seguridad */}
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => confirmDeleteUser(item._id)}
                >
                  <Text style={styles.buttonText}>{t('delete')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      // Primero actualizamos la UI para feedback inmediato
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isActive: !isActive } : user
      ));
      
      // Luego enviamos la actualización al servidor
      const newStatus = !isActive;
      await api.updateUserStatus(userId, newStatus);
      
      // Mostramos mensaje de éxito
      Alert.alert(
        t('success'), 
        newStatus ? t('userActivated') : t('userDeactivated')
      );
    } catch (error) {
      // En caso de error, revertimos el cambio en la UI
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isActive: isActive } : user
      ));
      console.error('Error al actualizar estado del usuario:', error);
      Alert.alert(t('error'), t('errorUpdatingUser'));
    }
  };

  const toggleUserRole = async (userId, isAdmin) => {
    try {
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isAdmin: !isAdmin } : user
      ));
      
      Alert.alert(t('success'), t('userUpdated'));
    } catch (error) {
      Alert.alert(t('error'), t('errorUpdatingUser'));
    }
  };

  const deleteUser = async (userId) => {
    try {
      setUsers(users.filter(user => user._id !== userId));
      Alert.alert(t('success'), t('userDeleted'));
    } catch (error) {
      Alert.alert(t('error'), t('errorDeletingUser'));
    }
  };

  const confirmDeleteUser = (userId) => {
    Alert.alert(
      t('confirmDelete'),
      t('deleteConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteUser(userId) }
      ]
    );
  };

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
            <Text style={styles.modalTitle}>{t('userDetails')}</Text>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>{t('userId')}:</Text>
              <Text style={styles.detailValue}>{selectedUser._id || t('notAvailable')}</Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>{t('username')}:</Text>
              <Text style={styles.detailValue}>{selectedUser.username || t('notAvailable')}</Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>{t('email')}:</Text>
              <Text style={styles.detailValue}>{selectedUser.email || t('notAvailable')}</Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>{t('role')}:</Text>
              <Text style={styles.detailValue}>{selectedUser.isAdmin ? t('adminUser') : t('normalUser')}</Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>{t('status')}:</Text>
              <Text style={[
                styles.detailValue,
                { color: selectedUser.isActive ? '#4CAF50' : '#ff5252' }
              ]}>
                {selectedUser.isActive ? t('active') : t('inactive')}
              </Text>
            </View>
            
            <View style={styles.userDetailItem}>
              <Text style={styles.detailLabel}>{t('registrationDate')}:</Text>
              <Text style={styles.detailValue}>
                {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : t('notAvailable')}
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>{t('close')}</Text>
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
                  {selectedUser.isActive ? t('deactivate') : t('activate')}
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
                {selectedUser.isAdmin ? (
                  <Text style={styles.buttonText}>{t('normalUser')}</Text>
                ) : (
                  <Text style={[styles.buttonText, {textAlign: 'center'}]}>
                    {"Adminis-\ntrador"}
                  </Text>
                )}
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
        <TouchableOpacity onPress={() => navigation.navigate('AdminDashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('userManagement')}</Text>
        <View style={styles.headerRightPlaceholder}></View>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchUsers')}
          placeholderTextColor="rgba(0, 0, 0, 0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {renderUserList()}
      
      {renderUserDetailsModal()}
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
    backgroundColor: '#1c1c1c',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 15 : 25,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: 'bold',
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
  searchContainer: {
    paddingHorizontal: 15,
    paddingTop: 0,
    paddingBottom: 15,
    backgroundColor: '#1c1c1c',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
    marginTop: -10,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(28, 28, 28, 0.3)',
    borderRadius: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff3e5',
    color: '#333333',
    fontSize: 15,
  },
  errorText: {
    color: '#ff5252',
    padding: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: Math.min(width * 0.035, 14),
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#ffffff',
  },
  userItem: {
    backgroundColor: '#1c1c1c',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  userInfo: {
    marginBottom: 10,
  },
  username: {
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  email: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.7,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  userStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userRole: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#ffffff',
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
    borderRadius: 15,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  statusButton: {
    backgroundColor: '#1c1c1c',
  },
  roleButton: {
    backgroundColor: '#1c1c1c',
  },
  deleteButton: {
    backgroundColor: '#1c1c1c',
  },
  buttonText: {
    color: '#fff3e5',
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: Math.min(width * 0.035, 14),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  modalTitle: {
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  userDetailItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
  },
  detailValue: {
    flex: 2,
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
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
    borderRadius: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  closeButton: {
    backgroundColor: '#1c1c1c',
  },
  closeButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.035, 14),
    textAlign: 'center',
  },
});

export default UserManagementScreen;
