import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function LeafletMapView({
  pickupCoords,
  dropCoords,
  carCoords,
  pickupLabel = 'Pickup',
  dropLabel = 'Drop',
  routeCoords = [],
  style,
  onMapReady,
}) {
  const webViewRef = useRef(null);

  // Normalize coordinates
  const pLat = pickupCoords?.latitude || null;
  const pLng = pickupCoords?.longitude || null;
  const dLat = dropCoords?.latitude || null;
  const dLng = dropCoords?.longitude || null;
  const cLat = carCoords?.latitude || null;
  const cLng = carCoords?.longitude || null;

  const normalizedRoute = useMemo(() => {
    if (!Array.isArray(routeCoords) || routeCoords.length === 0) return [];
    return routeCoords.map((pt) => {
      if (Array.isArray(pt)) return [pt[0], pt[1]];
      if (pt && typeof pt === 'object') return [pt.latitude, pt.longitude];
      return null;
    }).filter(Boolean);
  }, [routeCoords]);

  // Generate HTML for Leaflet Map with Google Roadmap Tiles
  const htmlContent = useMemo(() => {
    const centerLat = pLat && dLat ? (pLat + dLat) / 2 : (pLat || 22.0366);
    const centerLng = pLng && dLng ? (pLng + dLng) / 2 : (pLng || 74.9031);
    const initialZoom = normalizedRoute.length > 0 ? 11 : 12;

    const routeJson = JSON.stringify(normalizedRoute);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: #EAE5DB;
          }
          .custom-pin {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .pin-pickup {
            width: 24px;
            height: 24px;
            background: #22C55E;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          }
          .pin-drop {
            width: 24px;
            height: 24px;
            background: #EF4444;
            border: 3px solid #FFFFFF;
            border-radius: 6px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          }
          .leaflet-control-attribution {
            font-size: 8px !important;
            background: rgba(255,255,255,0.7) !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: true
          }).setView([${centerLat}, ${centerLng}], ${initialZoom});

          // Google Maps Road Tile Layer
          L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: 'Google Maps'
          }).addTo(map);

          var pickupMarker = null;
          var dropMarker = null;
          var carMarker = null;
          var routePolyline = null;
          var routeGlow = null;

          var pickupIcon = L.divIcon({
            className: 'custom-pin',
            html: '<div class="pin-pickup"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          var dropIcon = L.divIcon({
            className: 'custom-pin',
            html: '<div class="pin-drop"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          var carIcon = L.divIcon({
            className: 'custom-pin',
            html: '<div style="font-size:26px; line-height:1; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5)); transform: translate(-2px, -2px);">🚖</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          function updateMap(pLat, pLng, dLat, dLng, routeCoords, cLat, cLng) {
            var boundsPoints = [];

            if (pickupMarker) map.removeLayer(pickupMarker);
            if (pLat && pLng) {
              pickupMarker = L.marker([pLat, pLng], { icon: pickupIcon }).addTo(map);
              boundsPoints.push([pLat, pLng]);
            }

            if (dropMarker) map.removeLayer(dropMarker);
            if (dLat && dLng) {
              dropMarker = L.marker([dLat, dLng], { icon: dropIcon }).addTo(map);
              boundsPoints.push([dLat, dLng]);
            }

            if (carMarker) map.removeLayer(carMarker);
            if (cLat && cLng) {
              carMarker = L.marker([cLat, cLng], { icon: carIcon }).addTo(map);
              boundsPoints.push([cLat, cLng]);
            }

            if (routePolyline) map.removeLayer(routePolyline);
            if (routeGlow) map.removeLayer(routeGlow);

            if (routeCoords && routeCoords.length > 0) {
              routeGlow = L.polyline(routeCoords, {
                color: 'rgba(217, 154, 54, 0.35)',
                weight: 8,
                lineCap: 'round'
              }).addTo(map);

              routePolyline = L.polyline(routeCoords, {
                color: '#D99A36',
                weight: 4,
                lineCap: 'round'
              }).addTo(map);

              map.fitBounds(L.latLngBounds(routeCoords), { padding: [40, 40] });
            } else if (boundsPoints.length >= 2) {
              map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50] });
            } else if (boundsPoints.length === 1) {
              map.setView(boundsPoints[0], 13);
            }
          }

          // Initial paint
          var initialRoute = ${routeJson};
          var initPLat = ${pLat || 'null'};
          var initPLng = ${pLng || 'null'};
          var initDLat = ${dLat || 'null'};
          var initDLng = ${dLng || 'null'};
          var initCLat = ${cLat || 'null'};
          var initCLng = ${cLng || 'null'};

          updateMap(initPLat, initPLng, initDLat, initDLng, initialRoute, initCLat, initCLng);
        </script>
      </body>
      </html>
    `;
  }, [pLat, pLng, dLat, dLng, cLat, cLng, normalizedRoute]);

  // Push live updates to webview when coordinates change without full reload
  useEffect(() => {
    if (webViewRef.current) {
      const script = `
        if (typeof updateMap === 'function') {
          updateMap(
            ${pLat || 'null'},
            ${pLng || 'null'},
            ${dLat || 'null'},
            ${dLng || 'null'},
            ${JSON.stringify(normalizedRoute)},
            ${cLat || 'null'},
            ${cLng || 'null'}
          );
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [pLat, pLng, dLat, dLng, cLat, cLng, normalizedRoute]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#D99A36" />
          </View>
        )}
        onLoadEnd={onMapReady}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EAE5DB',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: '#EAE5DB',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EAE5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
