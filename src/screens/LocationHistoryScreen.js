import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
  Button,
  Platform,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import MapComponent from '../components/MapComponent';
import { Ionicons } from '@expo/vector-icons';

const LocationHistoryScreen = () => {
  const { user } = useAuth();
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState(null);
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' o 'list'
  const [dateFilter, setDateFilter] = useState(null);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estado para el selector de fecha personalizado
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  // Referencia para el intervalo de actualización automática
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(user?.isAdmin || false);

  // Cargar historial de ubicaciones
  const loadLocationHistory = useCallback(async (userId = null) => {
    setLoading(true);
    setError(null);

    try {
      const history = await api.getLocationHistory(userId);
      console.log(`Cargadas ${history.length} ubicaciones`);
      setLocationHistory(history);
      
      // Si hay un filtro de fecha activo, aplicarlo inmediatamente
      if (dateFilter) {
        applyDateFilter(history, dateFilter);
      } else {
        setFilteredLocations(history);
      }
    } catch (error) {
      console.error('Error al cargar el historial de ubicaciones:', error);
      setError(error.message || 'Error al cargar el historial de ubicaciones');
      Alert.alert('Error', error.message || 'Error al cargar el historial de ubicaciones');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  // Cargar lista de usuarios (solo para administradores)
  const loadUsers = useCallback(async () => {
    if (!user?.isAdmin) return;
    
    try {
      const usersList = await api.getUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  }, [user]);

  // Configurar actualización automática para administradores
  useEffect(() => {
    let intervalId = null;
    
    if (user?.isAdmin && autoRefreshEnabled) {
      // Actualizar cada 30 segundos para administradores
      intervalId = setInterval(() => {
        console.log('Actualizando automáticamente datos para administrador...');
        loadLocationHistory(selectedUserId);
        loadUsers();
      }, 30000); // 30 segundos
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user, autoRefreshEnabled, selectedUserId, loadLocationHistory, loadUsers]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadLocationHistory();
    if (user?.isAdmin) {
      loadUsers();
    }
    
    // Inicializar los valores del selector de fecha con la fecha actual
    const today = new Date();
    setSelectedDay(today.getDate().toString());
    setSelectedMonth((today.getMonth() + 1).toString());
    setSelectedYear(today.getFullYear().toString());
  }, [user, loadLocationHistory, loadUsers]);

  // Función para manejar la actualización de ubicación actual
  const handleLocationChange = (location) => {
    if (location && location.coords) {
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    }
  };

  // Función para refrescar los datos
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLocationHistory(selectedUserId);
      if (user?.isAdmin) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error al refrescar datos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Función para formatear la fecha en formato corto (solo día/mes/año)
  const formatShortDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Función para aplicar filtro de fecha
  const applyDateFilter = (locations, date) => {
    if (!date) {
      setFilteredLocations(locations);
      return;
    }

    // Crear fecha de inicio y fin del día seleccionado
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Filtrando por fecha: ${startDate.toISOString()} hasta ${endDate.toISOString()}`);
    
    // Filtrar ubicaciones que estén dentro del rango de fecha
    const filtered = locations.filter(location => {
      if (!location.timestamp) return false;
      
      const locationDate = new Date(location.timestamp);
      return locationDate >= startDate && locationDate <= endDate;
    });
    
    console.log(`Ubicaciones filtradas: ${filtered.length} de ${locations.length}`);
    setFilteredLocations(filtered);
  };

  // Aplicar la fecha seleccionada en el selector personalizado
  const applyCustomDateFilter = () => {
    // Validar que los valores ingresados sean números válidos
    const day = parseInt(selectedDay, 10);
    const month = parseInt(selectedMonth, 10) - 1; // Los meses en JS son 0-11
    const year = parseInt(selectedYear, 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year) || 
        day < 1 || day > 31 || month < 0 || month > 11 || year < 2000 || year > 2100) {
      Alert.alert('Error', 'Por favor ingresa una fecha válida');
      return;
    }
    
    // Crear objeto Date con los valores seleccionados
    const selectedDate = new Date(year, month, day);
    
    // Verificar que la fecha sea válida
    if (selectedDate.getDate() !== day) {
      Alert.alert('Error', 'La fecha ingresada no es válida');
      return;
    }
    
    console.log(`Fecha seleccionada: ${selectedDate.toISOString()}`);
    setDateFilter(selectedDate);
    applyDateFilter(locationHistory, selectedDate);
    setShowDatePicker(false);
  };

  // Limpiar filtro de fecha
  const clearDateFilter = () => {
    setDateFilter(null);
    setFilteredLocations(locationHistory);
  };

  // Renderizar selector de usuarios (solo para administradores)
  const renderUserSelector = () => {
    if (!user?.isAdmin) return null;
    
    return (
      <View style={styles.userSelectorContainer}>
        <Text style={styles.selectorLabel}>Seleccionar Usuario:</Text>
        <FlatList
          data={users}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item && item._id ? item._id.toString() : `user-${Math.random()}`}
          renderItem={({ item }) => {
            if (!item) return null;
            
            return (
              <TouchableOpacity
                style={[
                  styles.userItem,
                  selectedUserId === item._id && styles.selectedUserItem
                ]}
                onPress={() => {
                  setSelectedUserId(item._id);
                  setSelectedUserName(item.username);
                  loadLocationHistory(item._id);
                }}
              >
                <Text 
                  style={[
                    styles.userItemText,
                    selectedUserId === item._id && styles.selectedUserItemText
                  ]}
                >
                  {item.username}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  // Renderizar selector de fecha personalizado
  const renderCustomDatePicker = () => {
    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar fecha</Text>
            
            <View style={styles.dateInputContainer}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Día</Text>
                <TextInput
                  style={styles.dateInput}
                  value={selectedDay}
                  onChangeText={setSelectedDay}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="DD"
                />
              </View>
              
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Mes</Text>
                <TextInput
                  style={styles.dateInput}
                  value={selectedMonth}
                  onChangeText={setSelectedMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="MM"
                />
              </View>
              
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Año</Text>
                <TextInput
                  style={styles.dateInput}
                  value={selectedYear}
                  onChangeText={setSelectedYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="YYYY"
                />
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={applyCustomDateFilter}
              >
                <Text style={styles.modalButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar filtro de fecha
  const renderDateFilter = () => {
    return (
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.filterButtonText}>Filtrar por fecha</Text>
        </TouchableOpacity>
        
        {dateFilter && (
          <>
            <View style={styles.activeDateFilter}>
              <Text style={styles.dateFilterText}>
                Fecha: {formatShortDate(dateFilter)}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={clearDateFilter}
            >
              <Text style={styles.filterButtonText}>Limpiar filtro</Text>
            </TouchableOpacity>
          </>
        )}
        
        {renderCustomDatePicker()}
      </View>
    );
  };

  // Determinar qué ubicaciones mostrar (filtradas o todas)
  const locationsToDisplay = dateFilter ? filteredLocations : locationHistory;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {renderUserSelector()}
      {renderDateFilter()}
      
      <View style={styles.mapContainer}>
        <View style={[
          styles.mapHeader,
          user?.isAdmin ? styles.mapHeaderAdmin : styles.mapHeaderUser
        ]}>
          <Text style={styles.mapTitle}>
            Mapa de {selectedUserName ? selectedUserName : 'ubicaciones'}
          </Text>
          {user?.isAdmin && (
            <View style={styles.adminControls}>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={onRefresh}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.autoRefreshButton, 
                  autoRefreshEnabled ? styles.autoRefreshEnabled : styles.autoRefreshDisabled
                ]}
                onPress={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              >
                <Ionicons 
                  name={autoRefreshEnabled ? "sync-circle" : "sync-circle-outline"} 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
          </View>
        ) : locationsToDisplay.length > 0 ? (
          <MapComponent 
            locations={locationsToDisplay}
            currentLocation={currentLocation}
            isLoading={loading}
            selectedUserName={selectedUserName}
          />
        ) : (
          <View style={styles.emptyMapContainer}>
            <Ionicons name="location-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay ubicaciones</Text>
            {dateFilter && (
              <Text style={styles.emptySubtext}>
                No se encontraron registros para la fecha seleccionada
              </Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            viewMode === 'map' && styles.activeActionButton
          ]}
          onPress={() => setViewMode('map')}
        >
          <Text style={styles.actionButtonText}>Ver Mapa</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton,
            viewMode === 'list' && styles.activeActionButton
          ]}
          onPress={() => setViewMode('list')}
        >
          <Text style={styles.actionButtonText}>Ver Lista</Text>
        </TouchableOpacity>
      </View>
      
      {viewMode === 'list' && (
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Historial de ubicaciones
            </Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
            </View>
          ) : locationsToDisplay.length > 0 ? (
            <FlatList
              data={locationsToDisplay.slice(0, 20)}
              keyExtractor={(item, index) => `location-${index}`}
              renderItem={({ item }) => (
                <View style={styles.locationItem}>
                  <View 
                    style={[
                      styles.locationTypeIndicator,
                      { 
                        backgroundColor: 
                          item.type === 'start' ? '#4CAF50' : 
                          item.type === 'end' ? '#F44336' : 
                          '#2196F3'
                      }
                    ]}
                  />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationType}>
                      {item.type === 'start' ? 'Inicio de trabajo' : 
                       item.type === 'end' ? 'Fin de trabajo' : 
                       'Seguimiento'}
                    </Text>
                    <Text style={styles.locationDate}>
                      {formatDate(item.timestamp)}
                    </Text>
                    <Text style={styles.locationCoords}>
                      Lat: {item.latitude.toFixed(6)}, Lon: {item.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No hay ubicaciones</Text>
              {dateFilter && (
                <Text style={styles.emptySubtext}>
                  No se encontraron registros para la fecha seleccionada
                </Text>
              )}
            </View>
          )}
          
          {locationsToDisplay.length > 20 && (
            <TouchableOpacity style={styles.viewMoreButton}>
              <Text style={styles.viewMoreButtonText}>Ver más registros...</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userSelectorContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  userItem: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  selectedUserItem: {
    backgroundColor: '#4A90E2',
  },
  userItemText: {
    color: '#333',
  },
  selectedUserItemText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateFilterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 5,
  },
  clearFilterButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activeDateFilter: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 10,
    alignSelf: 'stretch',
  },
  dateFilterText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHeader: {
    backgroundColor: '#4A90E2',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapHeaderAdmin: {
    justifyContent: 'space-between',
  },
  mapHeaderUser: {
    justifyContent: 'center',
  },
  mapTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  adminControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoRefreshEnabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
  autoRefreshDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyMapContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listHeader: {
    backgroundColor: '#4A90E2',
    padding: 15,
  },
  listTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 15,
    marginTop: 5,
  },
  locationInfo: {
    flex: 1,
  },
  locationType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  activeActionButton: {
    backgroundColor: '#2c6cb0',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 10,
  },
  locationListContainer: {
    padding: 10,
  },
  viewMoreButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  viewMoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  dateInputGroup: {
    alignItems: 'center',
    width: '30%',
  },
  dateInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LocationHistoryScreen;
