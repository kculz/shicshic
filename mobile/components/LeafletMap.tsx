import React, { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface PlaceSuggestion {
    display_name: string;
    lat: string;
    lon: string;
}

interface Props {
    userLat: number | null;
    userLon: number | null;
    destLat: number | null;
    destLon: number | null;
    onReady?: () => void;
}

export default function LeafletMap({ userLat, userLon, destLat, destLon, onReady }: Props) {
    const webRef = useRef<WebView>(null);

    // Send updated coordinates to the map whenever props change
    useEffect(() => {
        if (!webRef.current) return;
        const msg = JSON.stringify({ type: 'UPDATE', userLat, userLon, destLat, destLon });
        webRef.current.postMessage(msg);
    }, [userLat, userLon, destLat, destLon]);

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100vh; }
  .leaflet-routing-container { display: none !important; }
  .custom-user-icon { background: #FF6B00; border: 3px solid #fff; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
<script>
  const DEFAULT_LAT = -17.8292;
  const DEFAULT_LON = 31.0522; // Harare, Zimbabwe default

  const map = L.map('map', { zoomControl: true, attributionControl: false }).setView(
    [DEFAULT_LAT, DEFAULT_LON], 13
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const orangeIcon = L.divIcon({
    className: 'custom-user-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const destIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  let userMarker = null;
  let destMarker = null;
  let routeControl = null;

  function updateMap(userLat, userLon, destLat, destLon) {
    // User location marker
    if (userLat && userLon) {
      const userLatLng = [userLat, userLon];
      if (!userMarker) {
        userMarker = L.marker(userLatLng, { icon: orangeIcon })
          .addTo(map)
          .bindPopup('You are here');
      } else {
        userMarker.setLatLng(userLatLng);
      }
    }

    // Destination marker
    if (destLat && destLon) {
      const destLatLng = [destLat, destLon];
      if (!destMarker) {
        destMarker = L.marker(destLatLng, { icon: destIcon })
          .addTo(map)
          .bindPopup('Destination');
      } else {
        destMarker.setLatLng(destLatLng);
      }

      // Draw route if we have both points
      if (userLat && userLon) {
        if (routeControl) {
          map.removeControl(routeControl);
        }
        routeControl = L.Routing.control({
          waypoints: [
            L.latLng(userLat, userLon),
            L.latLng(destLat, destLon)
          ],
          router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
          }),
          lineOptions: {
            styles: [{ color: '#FF6B00', weight: 5, opacity: 0.85 }]
          },
          show: false,
          addWaypoints: false,
          createMarker: () => null
        }).addTo(map);

        // Fit map to show both points
        const bounds = L.latLngBounds([userLat, userLon], [destLat, destLon]);
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView([destLat, destLon], 15);
      }
    } else if (userLat && userLon) {
      map.setView([userLat, userLon], 15);
    }
  }

  // Listen for messages from React Native
  document.addEventListener('message', (e) => handleMsg(e.data));
  window.addEventListener('message', (e) => handleMsg(e.data));

  function handleMsg(raw) {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'UPDATE') {
        updateMap(msg.userLat, msg.userLon, msg.destLat, msg.destLon);
      }
    } catch (e) {}
  }

  window.onload = () => {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'READY' }));
  };
</script>
</body>
</html>`;

    return (
        <WebView
            ref={webRef}
            style={styles.map}
            source={{ html }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            onMessage={(e) => {
                try {
                    const msg = JSON.parse(e.nativeEvent.data);
                    if (msg.type === 'READY') onReady?.();
                } catch { }
            }}
        />
    );
}

const styles = StyleSheet.create({
    map: { flex: 1, backgroundColor: '#f0f0f0' },
});
