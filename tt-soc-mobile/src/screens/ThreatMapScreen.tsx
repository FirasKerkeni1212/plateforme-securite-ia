import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../api/axiosConfig';

interface AlertItem {
  id: string;
  attack_type: string;
  severity: string;
  ip?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
}

export default function ThreatMapScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts?limit=50');
      setAlerts(res.data.alerts || []);
    } catch (e) {
      console.error('ThreatMap fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH':     return '#f97316';
      case 'MEDIUM':   return '#eab308';
      default:         return '#22c55e';
    }
  };

  const getAttackIcon = (type: string) => {
    const icons: Record<string, string> = {
      'DDoS': '🌊', 'XSS': '💻', 'Brute Force': '🔐',
      'SQL Injection': '💉', 'Ransomware': '🦠',
      'Port Scan': '🌐', 'Trojan': '🐴',
    };
    return icons[type] || '⚠️';
  };

  // ✅ Génération HTML Leaflet avec les marqueurs dynamiques
  const generateMapHTML = (alerts: AlertItem[]) => {
    const markers = alerts
      .filter(a => a.latitude && a.longitude)
      .map(a => {
        const color = a.severity === 'CRITICAL' ? 'red'
          : a.severity === 'HIGH' ? 'orange'
          : a.severity === 'MEDIUM' ? 'gold' : 'green';

        return `
          L.circleMarker([${a.latitude}, ${a.longitude}], {
            color: '${color}',
            fillColor: '${color}',
            fillOpacity: 0.8,
            radius: ${a.severity === 'CRITICAL' ? 14 : 10}
          })
          .addTo(map)
          .bindPopup(\`
            <b>${a.attack_type}</b><br/>
            🌐 IP: ${a.ip || 'Inconnue'}<br/>
            🔴 Sévérité: ${a.severity}<br/>
            🕐 ${new Date(a.timestamp).toLocaleString('fr-FR')}
          \`);
        `;
      }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          #map { width: 100vw; height: 100vh; background: #0f172a; }
          .leaflet-popup-content-wrapper {
            background: #1e293b;
            color: #fff;
            border: 1px solid #334155;
            border-radius: 8px;
          }
          .leaflet-popup-tip { background: #1e293b; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', {
            center: [20, 0],
            zoom: 2,
            zoomControl: true
          });

          // Tuile sombre style SOC
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CartoDB',
            subdomains: 'abcd'
          }).addTo(map);

          ${markers}

          // Pulse animation sur les marqueurs critiques
          const style = document.createElement('style');
          style.textContent = \`
            @keyframes pulse {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.3); }
              100% { opacity: 1; transform: scale(1); }
            }
            .leaflet-interactive { animation: pulse 2s infinite; }
          \`;
          document.head.appendChild(style);
        </script>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount     = alerts.filter(a => a.severity === 'HIGH').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📍 Géolocalisation des attaques</Text>
        <Text style={styles.headerSubtitle}>{alerts.length} attaques détectées</Text>
      </View>

      {/* Stats rapides */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { borderColor: '#ef4444' }]}>
          <Text style={styles.statValue}>{criticalCount}</Text>
          <Text style={[styles.statLabel, { color: '#ef4444' }]}>CRITICAL</Text>
        </View>
        <View style={[styles.statBadge, { borderColor: '#f97316' }]}>
          <Text style={styles.statValue}>{highCount}</Text>
          <Text style={[styles.statLabel, { color: '#f97316' }]}>HIGH</Text>
        </View>
        <View style={[styles.statBadge, { borderColor: '#3b82f6' }]}>
          <Text style={styles.statValue}>{alerts.length}</Text>
          <Text style={[styles.statLabel, { color: '#3b82f6' }]}>TOTAL</Text>
        </View>
      </View>

      {/* Carte Leaflet */}
      <View style={styles.mapContainer}>
        {alerts.length > 0 ? (
          <WebView
            source={{ html: generateMapHTML(alerts) }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            )}
          />
        ) : (
          <View style={[styles.center, { flex: 1 }]}>
            <Text style={{ fontSize: 48 }}>🗺️</Text>
            <Text style={styles.loadingText}>Aucune attaque géolocalisée</Text>
          </View>
        )}
      </View>

      {/* Liste des IPs attaquantes */}
      <View style={styles.ipList}>
        <Text style={styles.ipListTitle}>🌐 IPs Attaquantes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {alerts.slice(0, 8).map((alert) => (
            <View key={alert.id} style={[styles.ipChip, { borderColor: getSeverityColor(alert.severity) }]}>
              <Text style={styles.ipIcon}>{getAttackIcon(alert.attack_type)}</Text>
              <Text style={styles.ipText}>{alert.ip || '?.?.?.?'}</Text>
              <Text style={[styles.ipSeverity, { color: getSeverityColor(alert.severity) }]}>
                {alert.severity}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },

  header: {
    padding: 16, backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: '#334155'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    padding: 12, backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: '#334155'
  },
  statBadge: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, backgroundColor: '#0f172a'
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  mapContainer: { flex: 1 },
  map: { flex: 1, backgroundColor: '#0f172a' },

  ipList: {
    padding: 12, backgroundColor: '#1e293b',
    borderTopWidth: 1, borderTopColor: '#334155'
  },
  ipListTitle: { fontSize: 13, color: '#94a3b8', marginBottom: 8, fontWeight: '600' },
  ipChip: {
    alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 8,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
    marginRight: 8
  },
  ipIcon: { fontSize: 16 },
  ipText: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },
  ipSeverity: { fontSize: 9, fontWeight: 'bold', marginTop: 2 },
});