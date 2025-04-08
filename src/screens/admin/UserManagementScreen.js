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
  const { t, toggleLanguage, language } = useLanguage();
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
          <ActivityIndicator size="large" color="#0066cc" />
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
                  <Text style={[
                    styles.userStatus,
                    { color: item.isActive ? '#2ecc71' : '#e74c3c' }
                  ]}>
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
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.roleButton]}
                  onPress={() => toggleUserRole(item._id, item.isAdmin)}
                >
                  <Text style={styles.buttonText}>
                    {item.isAdmin ? t('normalUser') : t('adminUser')}
                  </Text>
                </TouchableOpacity>
                
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
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isActive: !isActive } : user
      ));
      
      Alert.alert(t('success'), t('userUpdated'));
    } catch (error) {
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
                { color: selectedUser.isActive ? '#2ecc71' : '#e74c3c' }
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
                <Text style={styles.buttonText}>
                  {selectedUser.isAdmin ? t('normalUser') : t('adminUser')}
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('userManagement')}</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchUsers')}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    padding: 15,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
    color: '#666',
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
    color: '#666',
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
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
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
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
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
    color: '#333',
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
    color: '#666',
  },
  detailValue: {
    flex: 2,
    fontSize: 14,
    color: '#333',
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
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default UserManagementScreen;
