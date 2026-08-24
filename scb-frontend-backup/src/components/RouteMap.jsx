import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FaLocationArrow, FaClock, FaRoute, 
  FaGlobeAmericas, FaMap, FaMountain, FaCar 
} from 'react-icons/fa';

// Uber/Ola Grade Custom Markers
const createPickupIcon = () =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(34, 197, 94, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #22c55e; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `,
    className: 'uber-pickup-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const createDropIcon = () =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 34px; height: 38px;">
        <div style="width: 24px; height: 24px; border-radius: 6px; background: #ef4444; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 2px;"></div>
        </div>
        <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #ef4444; margin-top: -1px;"></div>
      </div>
    `,
    className: 'uber-drop-marker',
    iconSize: [34, 38],
    iconAnchor: [17, 36],
  });

const createCarIcon = (color = '#EAB308') =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(234, 179, 8, 0.35); animation: pulse 2s infinite;"></div>
        <div style="width: 30px; height: 30px; border-radius: 50%; background: #0f172a; border: 2px solid ${color}; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 14px;">
          🚕
        </div>
      </div>
    `,
    className: 'uber-car-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const pickupIcon = createPickupIcon();
const dropIcon = createDropIcon();
const driverCarIcon = createCarIcon('#22c55e');

// Google Maps Tile Layers
const MAP_LAYERS = {
  roadmap: {
    name: 'Default',
    icon: <FaMap />,
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
  },
  satellite: {
    name: 'Satellite',
    icon: <FaGlobeAmericas />,
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
  },
  terrain: {
    name: 'Terrain',
    icon: <FaMountain />,
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
  },
};

// Auto Fit Bounds Component
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length < 2) return;
    try {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
        duration: 0.8,
      });
    } catch {
      /* ignore */
    }
  }, [map, positions]);

  return null;
}

const RouteMap = ({
  pickup,
  drop,
  routeCoords = null,
  distanceKm = null,
  driverCoords = null,
  showLayerToggle = true,
  turnInstruction = null,
}) => {
  const { t } = useTranslation();
  const [mapLayer, setMapLayer] = useState('roadmap');

  const positions = useMemo(() => {
    if (routeCoords?.length >= 2) return routeCoords;
    return [
      [22.0366, 74.9031],
      [22.7196, 75.8577],
    ];
  }, [routeCoords]);

  const pickupCoords = positions[0];
  const dropCoords = positions[positions.length - 1];
  const center = useMemo(() => {
    const midLat = (pickupCoords[0] + dropCoords[0]) / 2;
    const midLng = (pickupCoords[1] + dropCoords[1]) / 2;
    return [midLat, midLng];
  }, [pickupCoords, dropCoords]);

  const displayKm =
    distanceKm != null && !Number.isNaN(Number(distanceKm))
      ? Number(distanceKm).toFixed(1)
      : (positions.length > 2 ? '12.4' : '—');

  const estimatedMins = Math.max(4, Math.round((parseFloat(displayKm) || 10) * 1.8));

  return (
    <div className="w-full h-full min-h-[320px] rounded-3xl overflow-hidden relative border border-border shadow-2xl bg-surface">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', minHeight: '320px', background: '#e5e7eb' }}
      >
        <TileLayer
          key={mapLayer}
          attribution={MAP_LAYERS[mapLayer].attribution}
          url={MAP_LAYERS[mapLayer].url}
          subdomains={MAP_LAYERS[mapLayer].subdomains}
          maxZoom={20}
        />

        <FitBounds positions={driverCoords ? [...positions, driverCoords] : positions} />

        {/* Pickup Pin */}
        <Marker position={pickupCoords} icon={pickupIcon}>
          <Popup>
            <div className="font-bold text-xs p-1">
              <span className="text-green-600 font-black uppercase tracking-wider block text-[9px] mb-0.5">🟢 Pickup Point</span>
              {pickup || 'Pickup'}
            </div>
          </Popup>
        </Marker>

        {/* Drop Pin */}
        <Marker position={dropCoords} icon={dropIcon}>
          <Popup>
            <div className="font-bold text-xs p-1">
              <span className="text-red-500 font-black uppercase tracking-wider block text-[9px] mb-0.5">🔴 Drop Destination</span>
              {drop || 'Destination'}
            </div>
          </Popup>
        </Marker>

        {/* Optional Live Driver Car Position */}
        {driverCoords && (
          <Marker position={driverCoords} icon={driverCarIcon}>
            <Popup>
              <div className="font-bold text-xs p-1">
                <span className="text-primary font-black uppercase tracking-wider block text-[9px] mb-0.5">🚕 Live Driver Location</span>
                Moving along route
              </div>
            </Popup>
          </Marker>
        )}

        {/* Outer Route Halo */}
        <Polyline positions={positions} color="#0f172a" weight={8} opacity={0.3} lineCap="round" lineJoin="round" />
        {/* Inner High-Contrast Yellow Line */}
        <Polyline positions={positions} color="#EAB308" weight={5} opacity={0.95} lineCap="round" lineJoin="round" />
      </MapContainer>

      {/* Google Maps Layer Switcher */}
      {showLayerToggle && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 bg-background/95 backdrop-blur-md p-1 rounded-2xl border border-border shadow-xl">
          {Object.entries(MAP_LAYERS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setMapLayer(key)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                mapLayer === key
                  ? 'bg-primary text-dark shadow-md shadow-primary/30 scale-105'
                  : 'text-muted hover:text-dark hover:bg-dark/5'
              }`}
              title={item.name}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Ola/Uber Route HUD */}
      <div className="absolute top-3 left-3 z-[1000] p-3 glass-card bg-background/95 backdrop-blur-xl border-primary/40 shadow-2xl rounded-2xl flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary text-dark flex items-center justify-center text-base shrink-0 shadow-md shadow-primary/20">
          <FaLocationArrow className="rotate-45" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black text-dark tracking-tight leading-none">
              {displayKm} <span className="text-xs font-bold text-muted uppercase">km</span>
            </span>
            <span className="text-xs font-bold text-primary flex items-center gap-1">
              • <FaClock size={10} /> {estimatedMins} min
            </span>
          </div>
          <p className="text-[9px] text-green-600 uppercase font-black tracking-widest mt-0.5">
            {turnInstruction || 'Fastest Google Road Route'}
          </p>
        </div>
      </div>

      {/* Bottom Badges */}
      <div className="absolute bottom-3 right-3 z-[1000] flex gap-2 pointer-events-none">
        <div className="glass-card bg-background/90 backdrop-blur-md px-3 py-1 flex items-center gap-1.5 border-border shadow-lg rounded-xl">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[9px] font-black uppercase text-dark tracking-wider">Pickup</span>
        </div>
        <div className="glass-card bg-background/90 backdrop-blur-md px-3 py-1 flex items-center gap-1.5 border-border shadow-lg rounded-xl">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <span className="text-[9px] font-black uppercase text-dark tracking-wider">Drop</span>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
