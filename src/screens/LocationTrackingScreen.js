import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useLocationTracking } from '../context/LocationTrackingContext';

const LocationTrackingScreen = () => {
  const { tracking, locations } = useLocationTracking();

  return (
    <View style={styles.container}>
      {/* Optionally show tracking status */}
      <Text style={styles.header}>
        {tracking ? 'Tracking Active' : 'Tracking Inactive'}
      </Text>
      <Text style={styles.header}>Tracked Locations</Text>
      <FlatList
        data={locations}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item, index }) => (
          <Text style={styles.locationItem}>
            {index + 1}. Lat: {item.latitude.toFixed(6)}, Lng: {item.longitude.toFixed(6)}
          </Text>
        )}
        style={{ maxHeight: 200 }}
      />
      {locations.length > 0 && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: locations[0].latitude,
            longitude: locations[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline
            coordinates={locations}
            strokeColor="#3498db"
            strokeWidth={3}
          />
          {locations.map((loc, idx) => (
            <Marker key={idx} coordinate={loc} />
          ))}
        </MapView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  locationItem: { fontSize: 14, marginBottom: 4 },
  map: { flex: 1, minHeight: 250, marginTop: 16, borderRadius: 8 },
});

export default LocationTrackingScreen;
