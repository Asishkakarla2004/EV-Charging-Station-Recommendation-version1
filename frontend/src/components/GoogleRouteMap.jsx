import { useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { useTheme } from '../context/ThemeContext';

const normalizePoint = (point) => {
  if (!point) {
    return null;
  }

  const lat = point.lat ?? point.location_lat;
  const lng = point.lng ?? point.location_lng;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { ...point, lat, lng };
};

const getRouteStroke = (isDark) => ({
  strokeColor: isDark ? '#ffffff' : '#111111',
  strokeOpacity: 0.95,
  strokeWeight: 5,
});

const MapCanvas = ({
  source,
  destination,
  stations,
  routePoints,
  selectedStationId,
  onSelectStation,
  onRouteComputed,
  onStationsLoadingChange,
  onStationsDiscovered,
}) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const routeRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const { isDark } = useTheme();

  const normalizedSource = useMemo(() => normalizePoint(source), [source]);
  const normalizedDestination = useMemo(() => normalizePoint(destination), [destination]);
  const normalizedStations = useMemo(() => stations.map(normalizePoint).filter(Boolean), [stations]);
  const normalizedRoutePoints = useMemo(() => routePoints.map(normalizePoint).filter(Boolean), [routePoints]);
  const sourceKey = normalizedSource ? `${normalizedSource.lat},${normalizedSource.lng}` : '';
  const destinationKey = normalizedDestination ? `${normalizedDestination.lat},${normalizedDestination.lng}` : '';
  const routeKey = normalizedRoutePoints.map((point) => `${point.lat},${point.lng}`).join('|');
  const lastDirectionsKeyRef = useRef('');
  const lastPlacesKeyRef = useRef('');

  useEffect(() => {
    if (!mapRef.current || googleMapRef.current || !window.google) {
      return;
    }

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: normalizedSource || { lat: 12.9716, lng: 77.5946 },
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: isDark
        ? [
            { elementType: 'geometry', stylers: [{ color: '#111111' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#d4d4d8' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#111111' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2f2f32' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1c1c1f' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050505' }] },
          ]
        : [
            { elementType: 'geometry', stylers: [{ color: '#f5f5f4' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#1f2937' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#f9fafb' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d4d4d8' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e7e5e4' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6d3d1' }] },
          ],
    });

    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      suppressPolylines: true,
      preserveViewport: true,
    });
    directionsRendererRef.current.setMap(googleMapRef.current);
    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [isDark, normalizedSource]);

  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !window.google) {
      return;
    }

    map.setOptions({
      styles: isDark
        ? [
            { elementType: 'geometry', stylers: [{ color: '#111111' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#d4d4d8' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#111111' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2f2f32' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1c1c1f' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050505' }] },
          ]
        : [
            { elementType: 'geometry', stylers: [{ color: '#f5f5f4' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#1f2937' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#f9fafb' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d4d4d8' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e7e5e4' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6d3d1' }] },
          ],
    });
  }, [isDark]);

  useEffect(() => {
    const map = googleMapRef.current;
    const directionsService = directionsServiceRef.current;
    const directionsRenderer = directionsRendererRef.current;

    if (!map || !window.google || !directionsService || !directionsRenderer || !normalizedSource || !normalizedDestination) {
      if (directionsRenderer) {
        directionsRenderer.setDirections({ routes: [] });
      }
      return;
    }

    const currentDirectionsKey = `${sourceKey}->${destinationKey}`;
    if (lastDirectionsKeyRef.current === currentDirectionsKey) {
      return;
    }
    lastDirectionsKeyRef.current = currentDirectionsKey;

    directionsService.route(
      {
        origin: { lat: normalizedSource.lat, lng: normalizedSource.lng },
        destination: { lat: normalizedDestination.lat, lng: normalizedDestination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.[0]) {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0].legs?.[0];
          const points =
            result.routes[0].overview_path?.map((point) => ({
              lat: point.lat(),
              lng: point.lng(),
            })) || [];
          onRouteComputed?.({
            points,
            distanceKm: leg?.distance?.value ? leg.distance.value / 1000 : null,
            durationText: leg?.duration?.text || '',
          });
        } else {
          directionsRenderer.setDirections({ routes: [] });
          onRouteComputed?.({
            points: normalizedRoutePoints,
            distanceKm: null,
            durationText: '',
          });
        }
      }
    );
  }, [destinationKey, isDark, normalizedDestination, normalizedSource, onRouteComputed, routeKey, sourceKey]);

  useEffect(() => {
    const map = googleMapRef.current;

    if (!map || !window.google?.maps?.places || normalizedRoutePoints.length < 2) {
      onStationsDiscovered?.([]);
      onStationsLoadingChange?.(false);
      return;
    }

    if (lastPlacesKeyRef.current === routeKey) {
      return;
    }
    lastPlacesKeyRef.current = routeKey;

    const placesService = new window.google.maps.places.PlacesService(map);
    const sampleStep = Math.max(Math.floor(normalizedRoutePoints.length / 4), 1);
    const samplePoints = normalizedRoutePoints.filter((_, index) => index % sampleStep === 0);
    const sampledRoute = samplePoints.slice(0, 5);

    let cancelled = false;
    onStationsLoadingChange?.(true);

    const searchPoint = (point) =>
      new Promise((resolve) => {
        placesService.nearbySearch(
          {
            location: { lat: point.lat, lng: point.lng },
            radius: 4000,
            keyword: 'EV charging station',
          },
          (results, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              Array.isArray(results)
            ) {
              resolve(results);
            } else {
              resolve([]);
            }
          }
        );
      });

    Promise.all(sampledRoute.map((point) => searchPoint(point)))
      .then((resultSets) => {
        if (cancelled) {
          return;
        }

        const deduped = new Map();
        resultSets.flat().forEach((place) => {
          if (!place.place_id || !place.geometry?.location) {
            return;
          }

          if (!deduped.has(place.place_id)) {
            const syntheticPower = 30 + (place.name?.length % 6) * 15;
            const syntheticPoints = Math.max((place.name?.length % 5) + 2, 2);
            const syntheticAvailable = Math.max(syntheticPoints - ((place.name?.length % 3) + 1), 1);
            const syntheticPrice = 4.5 + ((place.name?.length % 4) * 0.8);

            deduped.set(place.place_id, {
              id: `google-${place.place_id}`,
              source: 'internet',
              name: place.name || 'EV Charging Station',
              address: place.vicinity || place.formatted_address || '',
              location_lat: place.geometry.location.lat(),
              location_lng: place.geometry.location.lng(),
              total_slots: syntheticPoints,
              available_slots: syntheticAvailable,
              charging_speed: syntheticPower,
              price_per_hour: syntheticPrice,
              emergency_price_percent: 18,
              status_text: place.business_status || (place.opening_hours?.open_now ? 'OPEN' : 'UNKNOWN'),
              usage_cost: `Approx. INR ${Math.round(syntheticPrice * 83)}/hour`,
              operator_name: place.name || 'Google Maps',
            });
          }
        });

        onStationsDiscovered?.([...deduped.values()]);
      })
      .finally(() => {
        if (!cancelled) {
          onStationsLoadingChange?.(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedRoutePoints, onStationsDiscovered, onStationsLoadingChange, routeKey]);

  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !window.google) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (routeRef.current) {
      routeRef.current.setMap(null);
      routeRef.current = null;
    }

    if (normalizedRoutePoints.length) {
      routeRef.current = new window.google.maps.Polyline({
        path: normalizedRoutePoints,
        geodesic: true,
        ...getRouteStroke(isDark),
      });
      routeRef.current.setMap(map);
    }

    const bounds = new window.google.maps.LatLngBounds();

    const addMarker = (position, title, config = {}) => {
      const marker = new window.google.maps.Marker({
        position,
        map,
        title,
        icon: config.icon,
      });

      if (config.onClick) {
        marker.addListener('click', config.onClick);
      }

      markersRef.current.push(marker);
      bounds.extend(position);
      return marker;
    };

    if (normalizedSource) {
      addMarker(
        { lat: normalizedSource.lat, lng: normalizedSource.lng },
        normalizedSource.name || 'Source',
        {
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: isDark ? '#f5f5f5' : '#111111',
            fillOpacity: 1,
            strokeColor: isDark ? '#111111' : '#f5f5f5',
            strokeWeight: 2,
          },
        }
      );
    }

    if (normalizedDestination) {
      addMarker(
        { lat: normalizedDestination.lat, lng: normalizedDestination.lng },
        normalizedDestination.name || 'Destination',
        {
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#bdbdbd',
            fillOpacity: 1,
            strokeColor: '#111111',
            strokeWeight: 2,
          },
        }
      );
    }

    normalizedStations.forEach((station) => {
      const marker = addMarker(
        { lat: station.lat, lng: station.lng },
        station.name,
        {
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: station.id === selectedStationId ? 8 : 6,
            fillColor: station.id === selectedStationId ? '#f5f5f5' : '#6b7280',
            fillOpacity: 1,
            strokeColor: '#111111',
            strokeWeight: station.id === selectedStationId ? 3 : 2,
          },
          onClick: () => {
            onSelectStation(station);
            if (infoWindowRef.current) {
              infoWindowRef.current.setContent(`
                <div style="padding:6px 8px;color:#111;font-family:Segoe UI, sans-serif;">
                  <div style="font-weight:600;">${station.name}</div>
                  <div style="font-size:12px;margin-top:4px;">${station.available_slots ?? '-'} slots available</div>
                </div>
              `);
              infoWindowRef.current.open({ anchor: marker, map });
            }
          },
        }
      );
    });

    if (!bounds.isEmpty() && !directionsRendererRef.current?.getDirections()) {
      map.fitBounds(bounds, 60);
    } else if (normalizedSource && !normalizedRoutePoints.length) {
      map.setCenter({ lat: normalizedSource.lat, lng: normalizedSource.lng });
      map.setZoom(12);
    }
  }, [isDark, normalizedDestination, normalizedRoutePoints, normalizedSource, normalizedStations, onSelectStation, selectedStationId]);

  return <div ref={mapRef} className="h-[540px] w-full overflow-hidden rounded-[24px]" />;
};

const GoogleRouteMap = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey.includes('your_actual_google_maps_api_key_here')) {
    return (
      <div className="app-panel overflow-hidden p-4">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Google Maps</p>
          <h3 className="mt-1 text-xl font-semibold">Google Maps API key required</h3>
        </div>
        <div className="app-panel-muted flex h-[540px] items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Add `VITE_GOOGLE_MAPS_API_KEY=your_key_here` to `frontend/.env` and restart the frontend dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Google Maps</p>
          <h3 className="mt-1 text-xl font-semibold">Live map with route corridor and charging markers</h3>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Source, destination, and recommended stations</div>
      </div>
      <Wrapper apiKey={apiKey} libraries={['places']} render={(status) => (
        <div className="app-panel-muted flex h-[540px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          {status === 'LOADING' ? 'Loading Google Maps...' : 'Google Maps could not be loaded.'}
        </div>
      )}>
        <MapCanvas {...props} />
      </Wrapper>
    </div>
  );
};

export default GoogleRouteMap;
