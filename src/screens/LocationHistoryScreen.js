import React, { useState, useEffect } from 'react';
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
  Button
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

  // Cargar historial de ubicaciones
  const loadLocationHistory = async (userId = null) => {
    setLoading(true);
    setError(null);

    try {
      const history = await api.getLocationHistory(userId);
      setLocationHistory(history);
    } catch (error) {
      console.error('Error al cargar el historial de ubicaciones:', error);
      setError(error.message || 'Error al cargar el historial de ubicaciones');
      Alert.alert('Error', error.message || 'Error al cargar el historial de ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  // Cargar lista de usuarios (solo para administradores)
  const loadUsers = async () => {
    if (!user?.isAdmin) return;
    
    try {
      const usersList = await api.getUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadLocationHistory();
    if (user?.isAdmin) {
      loadUsers();
    }
  }, [user]);

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
                  setFilteredLocations([]);
                  setDateFilter(null);
                }}
              >
                <Text 
                  style={[
                    styles.userItemText,
                    selectedUserId === item._id && styles.selectedUserItemText
                  ]}
                >
                  {item.username || 'Usuario sin nombre'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
        
        <TouchableOpacity
          style={[
            styles.userItem,
            !selectedUserId && styles.selectedUserItem,
            { marginTop: 10 }
          ]}
          onPress={() => {
            setSelectedUserId(null);
            setSelectedUserName(null);
            loadLocationHistory();
            setFilteredLocations([]);
            setDateFilter(null);
          }}
        >
          <Text 
            style={[
              styles.userItemText,
              !selectedUserId && styles.selectedUserItemText
            ]}
          >
            Mi historial
          </Text>
        </TouchableOpacity>

        {selectedUserId && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Buscar todas las ubicaciones del usuario seleccionado
                setFilteredLocations([]);
                setDateFilter(null);
                Alert.alert('Información', `Mostrando todo el recorrido de ${selectedUserName || 'usuario seleccionado'}`);
              }}
            >
              <Text style={styles.actionButtonText}>Ver todo el recorrido</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const date = new Date();
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const filterDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                setDateFilter(filterDate);

                const filtered = locationHistory.filter((location) => {
                  const locationDate = new Date(location.timestamp);
                  const filterDateObject = new Date(filterDate);
                  return locationDate.toDateString() === filterDateObject.toDateString();
                });
                setFilteredLocations(filtered);
                
                if (filtered.length > 0) {
                  const formattedDate = filterDate;
                  const message = selectedUserName 
                    ? `Mostrando el recorrido de ${selectedUserName} el día ${formattedDate}`
                    : `Mostrando tu recorrido el día ${formattedDate}`;
                  Alert.alert('Información', message);
                } else {
                  const formattedDate = filterDate;
                  const message = selectedUserName 
                    ? `No hay registros de ${selectedUserName} para el día ${formattedDate}`
                    : `No hay registros para el día ${formattedDate}`;
                  Alert.alert('Sin datos', message);
                }
              }}
            >
              <Text style={styles.actionButtonText}>Filtrar por fecha</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* Selector de usuario (solo para administradores) */}
      {renderUserSelector()}
      
      {/* Mapa */}
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Mapa de Ubicaciones</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={onRefresh}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : (
          <MapComponent 
            locations={filteredLocations.length > 0 ? filteredLocations : locationHistory}
            currentLocation={currentLocation}
            isLoading={loading}
            selectedUserName={selectedUserName}
          />
        )}
      </View>
      
      {/* Lista de ubicaciones */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Registros de Ubicación</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.loadingText}>Cargando registros...</Text>
          </View>
        ) : (
          <View style={styles.locationListContainer}>
            {(filteredLocations.length > 0 ? filteredLocations : locationHistory).length > 0 ? (
              (filteredLocations.length > 0 ? filteredLocations : locationHistory)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10) // Limitamos a 10 registros para evitar problemas de rendimiento
                .map((item, index) => (
                  <View key={item._id || index} style={styles.locationItem}>
                    <View 
                      style={[
                        styles.locationTypeIndicator, 
                        { backgroundColor: item.type === 'start' ? '#4CAF50' : '#F44336' }
                      ]} 
                    />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationType}>
                        {item.type === 'start' ? 'Inicio de trabajo' : 'Fin de trabajo'}
                      </Text>
                      <Text style={styles.locationDate}>{formatDate(item.timestamp)}</Text>
                      <Text style={styles.locationCoords}>
                        Lat: {item.latitude.toFixed(6)}, Lon: {item.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No hay registros</Text>
                <Text style={styles.emptySubtext}>
                  No se encontraron registros de ubicación para mostrar.
                </Text>
              </View>
            )}
            
            {(filteredLocations.length > 0 ? filteredLocations : locationHistory).length > 10 && (
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={() => Alert.alert('Información', 'Se muestran los 10 registros más recientes. Consulta el mapa para ver todos los registros.')}
              >
                <Text style={styles.viewMoreButtonText}>Ver más registros...</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
});

export default LocationHistoryScreen;
