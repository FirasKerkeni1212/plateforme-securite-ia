import React from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';

const AttackMap = ({ attacks }) => {
  // Ex: attacks = [{ lat: 36.8, lon: 10.1, type: 'DDoS', criticality: 'CRITICAL' }]
  
  const getMarkerColor = (crit) => {
    switch (crit?.toUpperCase()) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      default: return '#3b82f6';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 30,
          longitude: 0,
          latitudeDelta: 80,
          longitudeDelta: 80,
        }}
        mapType="dark"
      >
        {attacks.map((attack, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: attack.lat, longitude: attack.lon }}
            pinColor={getMarkerColor(attack.criticality)}
            title={`${attack.type} (${attack.criticality})`}
            description={`IP: ${attack.ip || 'Inconnue'} • Confiance: ${attack.confidence}%`}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 400, width: '100%', borderRadius: 12, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
});

export default AttackMap;