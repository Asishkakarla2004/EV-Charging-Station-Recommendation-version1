import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

let leafletLoader;

const loadLeaflet = () => {
  if (leafletLoader) {
    return leafletLoader;
  }

  leafletLoader = new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.dataset.leaflet = 'true';
      document.head.appendChild(css);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Leaflet failed to load.'));
    document.body.appendChild(script);
  });

  return leafletLoader;
};

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

const getRouteStyle = (isDark) => ({
  color: isDark ? '#ffffff' : '#111111',
  weight: 5,
  opacity: 0.95,
});

const LeafletRouteMap = ({
  source,
  destination,
  stations,
  routePoints,
  selectedStationId,
  onSelectStation,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const { isDark } = useTheme();

  const normalizedSource = normalizePoint(source);
  const normalizedDestination = normalizePoint(destination);
  const normalizedStations = stations.map(normalizePoint).filter(Boolean);
  const normalizedRoutePoints = routePoints.map(normalizePoint).filter(Boolean);

  useEffect(() => {
    let mounted = true;

    loadLeaflet()
      .then((L) => {
        if (!mounted || mapInstanceRef.current || !mapRef.current) {
          return;
        }

        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
        });

        mapInstanceRef.current = map;
        markerLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);
      })
      .catch(() => {
        if (mounted) {
          setLoadError('Map tiles could not be loaded.');
        }
      });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;

    if (!L || !map) {
      return;
    }

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(
      isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }
    ).addTo(map);
  }, [isDark]);

  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;

    if (!L || !map || !markerLayerRef.current || !routeLayerRef.current) {
      return;
    }

    markerLayerRef.current.clearLayers();
    routeLayerRef.current.clearLayers();

    const bounds = [];

    if (normalizedRoutePoints.length) {
      const polyline = L.polyline(
        normalizedRoutePoints.map((point) => [point.lat, point.lng]),
        getRouteStyle(isDark)
      );
      polyline.addTo(routeLayerRef.current);
      bounds.push(...normalizedRoutePoints.map((point) => [point.lat, point.lng]));
    }

    const pointIcon = (fillColor, strokeColor, isLarge = false) =>
      L.divIcon({
        className: '',
        html: `<span style="display:block;width:${isLarge ? 18 : 14}px;height:${isLarge ? 18 : 14}px;border-radius:999px;background:${fillColor};border:3px solid ${strokeColor};box-shadow:0 0 0 4px rgba(0,0,0,0.12);"></span>`,
        iconSize: [isLarge ? 18 : 14, isLarge ? 18 : 14],
        iconAnchor: [isLarge ? 9 : 7, isLarge ? 9 : 7],
      });

    if (normalizedSource) {
      L.marker([normalizedSource.lat, normalizedSource.lng], {
        icon: pointIcon(isDark ? '#f5f5f5' : '#111111', isDark ? '#111111' : '#f5f5f5', true),
      })
        .bindTooltip(normalizedSource.name || 'Source', { permanent: false })
        .addTo(markerLayerRef.current);
      bounds.push([normalizedSource.lat, normalizedSource.lng]);
    }

    if (normalizedDestination) {
      L.marker([normalizedDestination.lat, normalizedDestination.lng], {
        icon: pointIcon('#cfcfcf', '#111111', true),
      })
        .bindTooltip(normalizedDestination.name || 'Destination', { permanent: false })
        .addTo(markerLayerRef.current);
      bounds.push([normalizedDestination.lat, normalizedDestination.lng]);
    }

    normalizedStations.forEach((station) => {
      const isSelected = station.id === selectedStationId;
      const marker = L.circleMarker([station.lat, station.lng], {
        radius: isSelected ? 9 : 7,
        color: isSelected ? '#111111' : isDark ? '#f5f5f5' : '#4b5563',
        weight: isSelected ? 4 : 2,
        fillColor: isSelected ? '#f5f5f5' : isDark ? '#9ca3af' : '#6b7280',
        fillOpacity: 1,
      });

      marker.bindTooltip(station.name, { permanent: false });
      marker.on('click', () => onSelectStation(station));
      marker.addTo(markerLayerRef.current);
      bounds.push([station.lat, station.lng]);
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [32, 32] });
    }
  }, [isDark, normalizedDestination, normalizedRoutePoints, normalizedSource, normalizedStations, onSelectStation, selectedStationId]);

  return (
    <div className="app-panel overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Route Map</p>
          <h3 className="mt-1 text-xl font-semibold">Live map with route corridor and charging markers</h3>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Source, destination, and recommended stations</div>
      </div>
      {loadError ? (
        <div className="app-panel-muted flex h-[420px] items-center justify-center p-6 text-sm text-gray-500 dark:text-gray-400">
          {loadError}
        </div>
      ) : (
        <div ref={mapRef} className="h-[420px] w-full overflow-hidden rounded-[24px]" />
      )}
    </div>
  );
};

export default LeafletRouteMap;
