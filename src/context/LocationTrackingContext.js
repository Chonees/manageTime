import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import * as Location from 'expo-location';

const LocationTrackingContext = createContext();

export const useLocationTracking = () => useContext(LocationTrackingContext);

export const LocationTrackingProvider = ({ children }) => {
  const [tracking, setTracking] = useState(false);
  const [locations, setLocations] = useState([]);
  const intervalRef = useRef(null);

  const startTracking = async () => {
    if (tracking) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Location permission is required.');
      return;
    }
    setTracking(true);
    intervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        setLocations(prev => [...prev, loc.coords]);
      } catch (e) {
        // Optionally handle error
      }
    }, 10000);
  };

  const stopTracking = () => {
    setTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTracking();
  }, []);

  return (
    <LocationTrackingContext.Provider value={{ tracking, locations, startTracking, stopTracking }}>
      {children}
    </LocationTrackingContext.Provider>
  );
};
