import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  userLat: number | null;
  userLon: number | null;
  pickupLat: number | null;
  pickupLon: number | null;
  destLat: number | null;
  destLon: number | null;
  driverLat?: number | null;
  driverLon?: number | null;
  onReady?: () => void;
  onMapPress?: (coords: { lat: number; lon: number }) => void;
}

export default function LeafletMap({
  userLat,
  userLon,
  pickupLat,
  pickupLon,
  destLat,
  destLon,
  driverLat = null,
  driverLon = null,
  onReady,
  onMapPress,
}: Props) {
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    if (!webRef.current) return;

    const message = JSON.stringify({
      type: 'UPDATE',
      userLat,
      userLon,
      pickupLat,
      pickupLon,
      destLat,
      destLon,
      driverLat,
      driverLon,
    });

    webRef.current.postMessage(message);
  }, [destLat, destLon, driverLat, driverLon, pickupLat, pickupLon, userLat, userLon]);

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
  .current-icon {
    background: #2563EB;
    border: 3px solid #fff;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
  }
  .pickup-icon {
    background: #16A34A;
    border: 3px solid #fff;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.35);
  }
  .car-icon {
    width: 34px;
    height: 18px;
    background: #FF6B00;
    border-radius: 9px;
    border: 3px solid #fff;
    box-shadow: 0 4px 10px rgba(255, 107, 0, 0.3);
    position: relative;
  }
  .car-icon::before,
  .car-icon::after {
    content: '';
    position: absolute;
    bottom: -5px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #111827;
    border: 1px solid #fff;
  }
  .car-icon::before { left: 3px; }
  .car-icon::after { right: 3px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
<script>
  const DEFAULT_LAT = -17.8292;
  const DEFAULT_LON = 31.0522;

  const map = L.map('map', {
    zoomControl: true,
    attributionControl: false
  }).setView([DEFAULT_LAT, DEFAULT_LON], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const currentIcon = L.divIcon({
    className: 'current-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const pickupIcon = L.divIcon({
    className: 'pickup-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const carIcon = L.divIcon({
    className: '',
    html: '<div class="car-icon"></div>',
    iconSize: [34, 18],
    iconAnchor: [17, 9]
  });

  const destinationIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  let currentMarker = null;
  let pickupMarker = null;
  let destinationMarker = null;
  let driverMarker = null;
  let routeControl = null;

  const samePoint = (firstLat, firstLon, secondLat, secondLon) => {
    if ([firstLat, firstLon, secondLat, secondLon].some((value) => typeof value !== 'number')) {
      return false;
    }

    return Math.abs(firstLat - secondLat) < 0.00001 && Math.abs(firstLon - secondLon) < 0.00001;
  };

  const resetRoute = () => {
    if (routeControl) {
      map.removeControl(routeControl);
      routeControl = null;
    }
  };

  const removeMarker = (marker) => {
    if (!marker) return null;
    map.removeLayer(marker);
    return null;
  };

  const addPoint = (points, lat, lon) => {
    if (typeof lat === 'number' && typeof lon === 'number') {
      points.push([lat, lon]);
    }
  };

  function updateMarker(marker, latLng, icon, popupText) {
    if (!marker) {
      return L.marker(latLng, { icon }).addTo(map).bindPopup(popupText);
    }

    marker.setLatLng(latLng);
    return marker;
  }

  function updateMap(userLat, userLon, pickupLat, pickupLon, destLat, destLon, driverLat, driverLon) {
    const points = [];
    resetRoute();

    if (typeof userLat === 'number' && typeof userLon === 'number') {
      currentMarker = updateMarker(currentMarker, [userLat, userLon], currentIcon, 'Your location');
      addPoint(points, userLat, userLon);
    } else {
      currentMarker = removeMarker(currentMarker);
    }

    if (typeof pickupLat === 'number' && typeof pickupLon === 'number') {
      if (samePoint(driverLat, driverLon, pickupLat, pickupLon)) {
        pickupMarker = removeMarker(pickupMarker);
      } else {
        pickupMarker = updateMarker(pickupMarker, [pickupLat, pickupLon], pickupIcon, 'Pickup point');
      }
      addPoint(points, pickupLat, pickupLon);
    } else {
      pickupMarker = removeMarker(pickupMarker);
    }

    if (typeof destLat === 'number' && typeof destLon === 'number') {
      destinationMarker = updateMarker(destinationMarker, [destLat, destLon], destinationIcon, 'Destination');
      addPoint(points, destLat, destLon);
    } else {
      destinationMarker = removeMarker(destinationMarker);
    }

    if (typeof driverLat === 'number' && typeof driverLon === 'number') {
      driverMarker = updateMarker(driverMarker, [driverLat, driverLon], carIcon, 'Driver');
      addPoint(points, driverLat, driverLon);
    } else {
      driverMarker = removeMarker(driverMarker);
    }

    const waypoints = [];
    if (typeof driverLat === 'number' && typeof driverLon === 'number') {
      waypoints.push(L.latLng(driverLat, driverLon));
    } else if (typeof userLat === 'number' && typeof userLon === 'number') {
      waypoints.push(L.latLng(userLat, userLon));
    }

    if (typeof pickupLat === 'number' && typeof pickupLon === 'number') {
      if (!samePoint(driverLat, driverLon, pickupLat, pickupLon) && !samePoint(userLat, userLon, pickupLat, pickupLon)) {
        waypoints.push(L.latLng(pickupLat, pickupLon));
      }
    }

    if (typeof destLat === 'number' && typeof destLon === 'number') {
      waypoints.push(L.latLng(destLat, destLon));
    }

    if (waypoints.length >= 2) {
      routeControl = L.Routing.control({
        waypoints,
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        lineOptions: {
          styles: [
            { color: '#FF6B00', weight: 5, opacity: 0.2 },
            { color: '#FF6B00', weight: 3, opacity: 0.9 }
          ]
        },
        show: false,
        addWaypoints: false,
        fitSelectedRoutes: false,
        createMarker: () => null
      }).addTo(map);
    }

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }

  map.on('click', (event) => {
    const payload = JSON.stringify({
      type: 'MAP_PRESS',
      lat: event.latlng.lat,
      lon: event.latlng.lng
    });

    window.ReactNativeWebView?.postMessage(payload);
  });

  document.addEventListener('message', (event) => handleMessage(event.data));
  window.addEventListener('message', (event) => handleMessage(event.data));

  function handleMessage(raw) {
    try {
      const message = JSON.parse(raw);
      if (message.type !== 'UPDATE') return;
      updateMap(
        message.userLat,
        message.userLon,
        message.pickupLat,
        message.pickupLon,
        message.destLat,
        message.destLon,
        message.driverLat,
        message.driverLon
      );
    } catch (error) {}
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
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.type === 'READY') {
            onReady?.();
            return;
          }

          if (message.type === 'MAP_PRESS') {
            onMapPress?.({ lat: Number(message.lat), lon: Number(message.lon) });
          }
        } catch (error) {}
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#f0f0f0' },
});
