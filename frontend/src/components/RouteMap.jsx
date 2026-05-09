const RouteMap = ({
  source,
  destination,
  stations,
  routePoints,
  selectedStationId,
  onSelectStation,
}) => {
  const normalizePoint = (point) => {
    if (!point) {
      return null;
    }

    return {
      ...point,
      lat: point.lat ?? point.location_lat,
      lng: point.lng ?? point.location_lng,
    };
  };

  const normalizedSource = normalizePoint(source);
  const normalizedDestination = normalizePoint(destination);
  const normalizedStations = stations.map(normalizePoint).filter(Boolean);
  const normalizedRoutePoints = routePoints.map(normalizePoint).filter(Boolean);

  const points = [normalizedSource, normalizedDestination, ...normalizedStations, ...normalizedRoutePoints].filter(
    (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
  );

  if (!points.length) {
    return null;
  }

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const bounds = {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes),
  };

  const width = 720;
  const height = 420;
  const padding = 36;

  const project = (point) => {
    const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.05);
    const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.05);
    return {
      x: padding + ((point.lng - bounds.minLng) / lngRange) * (width - padding * 2),
      y: height - padding - ((point.lat - bounds.minLat) / latRange) * (height - padding * 2),
    };
  };

  const routePath = normalizedRoutePoints
    .map((point, index) => {
      const projected = project(point);
      return `${index === 0 ? 'M' : 'L'} ${projected.x} ${projected.y}`;
    })
    .join(' ');

  return (
    <div className="app-panel relative overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Route Canvas</p>
          <h3 className="mt-1 text-xl font-semibold">Destination and nearby charging points</h3>
        </div>
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>White: route</span>
          <span>Gray: stations</span>
          <span>Black ring: selected</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[420px] w-full rounded-[24px] bg-black/[0.92] dark:bg-black">
        <defs>
          <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#map-grid)" />
        {routePath ? <path d={routePath} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" /> : null}
        {normalizedStations.map((station) => {
          const projected = project(station);
          const isSelected = station.id === selectedStationId;
          return (
            <g key={station.id} onClick={() => onSelectStation(station)} className="cursor-pointer">
              <circle
                cx={projected.x}
                cy={projected.y}
                r={isSelected ? 10 : 8}
                fill={isSelected ? '#ffffff' : '#9ca3af'}
                stroke={isSelected ? '#111111' : '#f5f5f5'}
                strokeWidth={isSelected ? 4 : 2}
              />
              <text x={projected.x + 12} y={projected.y - 12} fontSize="11" fill="rgba(255,255,255,0.86)">
                {station.name}
              </text>
            </g>
          );
        })}
        {[normalizedSource, normalizedDestination].filter(Boolean).map((point, index) => {
          const projected = project(point);
          const isSource = index === 0;
          return (
            <g key={`${point.name}-${index}`}>
              <circle cx={projected.x} cy={projected.y} r="9" fill={isSource ? '#ffffff' : '#d1d5db'} stroke="#111111" strokeWidth="3" />
              <text x={projected.x + 12} y={projected.y + 4} fontSize="11" fill="rgba(255,255,255,0.96)">
                {point.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RouteMap;
