const BASE = import.meta.env.VITE_API_URL || 'https://safarsetu-backend-production-cd62.up.railway.app';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const auth = getStoredAuth();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `${res.status} ${res.statusText}`);
  return body;
}

export async function postMapRoute(pickup, drop, pickupCoords = null, dropCoords = null) {
  try {
    return await api('/api/maps/route', {
      method: 'POST',
      body: JSON.stringify({ pickup, drop, pickupCoords, dropCoords }),
    });
  } catch {
    // Client-side fallback to OSRM if backend route fails
    if (pickupCoords && dropCoords) {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lng},${pickupCoords.lat};${dropCoords.lng},${dropCoords.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        const route = data?.routes?.[0];
        if (route?.geometry?.coordinates) {
          return {
            pickup: { lat: pickupCoords.lat, lng: pickupCoords.lng, label: pickup },
            drop: { lat: dropCoords.lat, lng: dropCoords.lng, label: drop },
            coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMin: Math.max(5, Math.round(route.duration / 60)),
          };
        }
      } catch {
        /* fallback */
      }
    }
    throw new Error('Could not calculate route');
  }
}

export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const list = await api(`/api/maps/search?q=${encodeURIComponent(query)}`);
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {
    /* fallback to direct Photon */
  }

  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`);
    if (res.ok) {
      const data = await res.json();
      return (data?.features || []).map(f => {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties || {};
        const title = p.name || p.street || p.city || 'Location';
        const subtitle = [p.district, p.city, p.state].filter(Boolean).join(', ');
        return {
          name: subtitle ? `${title}, ${subtitle}` : title,
          lat,
          lng,
          type: p.type || 'place',
        };
      });
    }
  } catch {
    /* ignore */
  }
  return [];
}

export async function reverseGeocodeCoord(lat, lng) {
  try {
    const data = await api(`/api/maps/reverse?lat=${lat}&lng=${lng}`);
    if (data?.address) return data.address;
  } catch {
    /* fallback */
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        const addr = data.address || {};
        return [addr.road || addr.suburb, addr.city || addr.town, addr.state].filter(Boolean).join(', ') || data.display_name;
      }
    }
  } catch {
    /* fallback */
  }
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

