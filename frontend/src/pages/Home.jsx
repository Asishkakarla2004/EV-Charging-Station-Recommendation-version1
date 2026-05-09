import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import GoogleRouteMap from '../components/GoogleRouteMap';
import StatCard from '../components/StatCard';
import { API_BASE } from '../lib/api';
import { BOOKINGS_UPDATED_EVENT, notifyBookingsUpdated } from '../lib/dashboardEvents';
import {
  deriveAvailability,
  destinationCatalog,
  fallbackSource,
  formatCurrency,
  haversineDistanceKm,
  interpolateRoute,
  nearestPointDistanceKm,
  nearestRoutePointIndex,
  resolveDestination,
} from '../lib/evMath';

function toDateTimeLocal(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function createDefaultBookingWindow() {
  const start = new Date();
  start.setMinutes(30, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {
    start: toDateTimeLocal(start),
    end: toDateTimeLocal(end),
  };
}

const Home = () => {
  const [stations, setStations] = useState([]);
  const [liveRouteStations, setLiveRouteStations] = useState([]);
  const [sourceQuery, setSourceQuery] = useState('Current Location');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [source, setSource] = useState(fallbackSource);
  const [destination, setDestination] = useState(destinationCatalog[0]);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState({
    distanceKm: null,
    durationText: '',
  });
  const [routeRequest, setRouteRequest] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookingType, setBookingType] = useState('normal');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingWindow, setBookingWindow] = useState(createDefaultBookingWindow);
  const [loading, setLoading] = useState(true);
  const [searchingRoute, setSearchingRoute] = useState(false);
  const [loadingLiveStations, setLoadingLiveStations] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sourceSearchError, setSourceSearchError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [googleSuggestions, setGoogleSuggestions] = useState([]);
  const [googleSourceSuggestions, setGoogleSourceSuggestions] = useState([]);

  const persistLocalBooking = (booking) => {
    const existing = JSON.parse(localStorage.getItem('localRouteBookings') || '[]');
    localStorage.setItem('localRouteBookings', JSON.stringify([booking, ...existing]));
  };

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await axios.get(`${API_BASE}/stations`);
        setStations(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();

    window.addEventListener(BOOKINGS_UPDATED_EVENT, fetchStations);
    window.addEventListener('focus', fetchStations);
    const intervalId = window.setInterval(fetchStations, 15000);

    return () => {
      window.removeEventListener(BOOKINGS_UPDATED_EVENT, fetchStations);
      window.removeEventListener('focus', fetchStations);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSource({
          name: 'Live Location',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSourceQuery('Current Location');
      },
      () => {
        setSource(fallbackSource);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    if (!destinationQuery.trim() && !routeRequest) {
      setRoutePoints([]);
      setLiveRouteStations([]);
      setRouteMetrics({
        distanceKm: null,
        durationText: '',
      });
    }
  }, [destinationQuery, routeRequest, source, destination]);

  const destinationSuggestions = useMemo(() => {
    if (googleSuggestions.length) {
      return googleSuggestions;
    }

    const query = destinationQuery.trim().toLowerCase();

    if (!query) {
      return destinationCatalog.slice(0, 6).map((option) => ({
        name: option.name,
        region: option.region,
        source: 'preset',
      }));
    }

    return destinationCatalog
      .filter((option) => `${option.name} ${option.region}`.toLowerCase().includes(query))
      .slice(0, 6)
      .map((option) => ({
        name: option.name,
        region: option.region,
        source: 'preset',
      }));
  }, [destinationQuery, googleSuggestions]);

  const sourceSuggestions = useMemo(() => {
    if (googleSourceSuggestions.length) {
      return googleSourceSuggestions;
    }

    const query = sourceQuery.trim().toLowerCase();

    if (!query || query === 'current location') {
      return [
        { name: 'Current Location', region: 'Use detected location', source: 'current' },
        ...destinationCatalog.slice(0, 5).map((option) => ({
          name: option.name,
          region: option.region,
          source: 'preset',
        })),
      ];
    }

    return destinationCatalog
      .filter((option) => `${option.name} ${option.region}`.toLowerCase().includes(query))
      .slice(0, 6)
      .map((option) => ({
        name: option.name,
        region: option.region,
        source: 'preset',
      }));
  }, [googleSourceSuggestions, sourceQuery]);

  useEffect(() => {
    const query = destinationQuery.trim();

    if (!query || !window.google?.maps?.places?.AutocompleteService) {
      setGoogleSuggestions([]);
      return;
    }

    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'in' },
      },
      (predictions, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          setGoogleSuggestions([]);
          return;
        }

        setGoogleSuggestions(
          predictions.slice(0, 6).map((prediction) => ({
            name: prediction.description,
            region: prediction.structured_formatting?.secondary_text || 'Google suggestion',
            source: 'google',
          }))
        );
      }
    );
  }, [destinationQuery]);

  useEffect(() => {
    const query = sourceQuery.trim();

    if (!query || query.toLowerCase() === 'current location' || !window.google?.maps?.places?.AutocompleteService) {
      setGoogleSourceSuggestions([]);
      return;
    }

    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'in' },
      },
      (predictions, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          setGoogleSourceSuggestions([]);
          return;
        }

        setGoogleSourceSuggestions(
          predictions.slice(0, 6).map((prediction) => ({
            name: prediction.description,
            region: prediction.structured_formatting?.secondary_text || 'Google suggestion',
            source: 'google',
          }))
        );
      }
    );
  }, [sourceQuery]);

  const routeDistance = routeMetrics.distanceKm ?? 0;

  const recommendedStations = useMemo(() => {
    const stationPool = liveRouteStations.length ? liveRouteStations : stations;
    const corridorWidthKm = Math.max(0.8, Math.min(2, Math.max(routeDistance, 1) * 0.025));

    return stationPool
      .map((station) => {
        const stationPoint = { lat: station.location_lat, lng: station.location_lng };
        const corridorDistance = nearestPointDistanceKm(stationPoint, routePoints);
        const nearestIndex = nearestRoutePointIndex(stationPoint, routePoints);
        const routeProgress =
          routePoints.length > 1 && nearestIndex >= 0
            ? nearestIndex / (routePoints.length - 1)
            : 0;
        const destinationDistance = haversineDistanceKm(stationPoint, destination);
        const availableSlots = station.available_slots ?? deriveAvailability(station);

        return {
          ...station,
          corridorDistance,
          routeProgress,
          destinationDistance,
          available_slots: availableSlots,
          total_slots: station.total_slots ?? 0,
          routeScore: corridorDistance * 0.55 + destinationDistance * 0.25 + (station.price_per_hour || 0) * 0.2,
        };
      })
      .filter(
        (station) =>
          station.corridorDistance <= corridorWidthKm &&
          station.routeProgress >= 0.02 &&
          station.routeProgress <= 0.98
      )
      .sort((left, right) => {
        if (left.available_slots !== right.available_slots) {
          return right.available_slots - left.available_slots;
        }
        return left.routeScore - right.routeScore;
      })
      .slice(0, 6);
  }, [destination, liveRouteStations, routeDistance, routePoints, stations]);

  useEffect(() => {
    setSelectedStation((current) => {
      if (current) {
        return recommendedStations.find((station) => station.id === current.id) ?? recommendedStations[0] ?? null;
      }
      return recommendedStations[0] ?? null;
    });
  }, [recommendedStations]);

  useEffect(() => {
    if (recommendedStations.length > 0) {
      setLoadingLiveStations(false);
    }
  }, [recommendedStations]);

  const applySuggestion = (option) => {
    setDestinationQuery(option.name);
    if (option.lat && option.lng) {
      setDestination(option);
    }
    setShowSuggestions(false);
    setSearchError('');
    setBookingMessage('');
    setGoogleSuggestions([]);
  };

  const applySourceSuggestion = (option) => {
    setSourceQuery(option.name);
    if (option.source === 'current') {
      setSource(fallbackSource);
    } else if (option.lat && option.lng) {
      setSource(option);
    }
    setShowSourceSuggestions(false);
    setSourceSearchError('');
    setGoogleSourceSuggestions([]);
  };

  const handleSearch = async () => {
    setSearchingRoute(true);
    setSearchError('');
    setSourceSearchError('');
    setBookingMessage('');
    setShowSuggestions(false);
    setShowSourceSuggestions(false);
    setLiveRouteStations([]);
    setRouteMetrics({
      distanceKm: null,
      durationText: '',
    });

    let resolvedSource = source;
    const fallbackDestination = resolveDestination(destinationQuery) ?? destinationSuggestions[0] ?? destinationCatalog[0];

    if (!window.google?.maps || !destinationQuery.trim()) {
      setDestination(fallbackDestination);
      setRouteRequest({
        source: resolvedSource,
        destination: fallbackDestination,
        requestedAt: Date.now(),
      });
      setSearchingRoute(false);
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      if (sourceQuery.trim() && sourceQuery.trim().toLowerCase() !== 'current location') {
        try {
          const sourceResults = await geocoder.geocode({ address: sourceQuery });
          const firstSourceResult = sourceResults.results?.[0];
          if (firstSourceResult?.geometry?.location) {
            resolvedSource = {
              name: firstSourceResult.formatted_address,
              lat: firstSourceResult.geometry.location.lat(),
              lng: firstSourceResult.geometry.location.lng(),
            };
            setSource(resolvedSource);
          } else {
            setSourceSearchError('Source was not found precisely. Using your current location instead.');
            resolvedSource = source;
          }
        } catch (error) {
          setSourceSearchError('Source could not be resolved. Using your current location instead.');
          resolvedSource = source;
        }
      }

      const results = await geocoder.geocode({ address: destinationQuery });
      const firstResult = results.results?.[0];

      if (!firstResult?.geometry?.location) {
        setDestination(fallbackDestination);
        setSearchError('Destination was not found precisely. Showing the closest saved destination instead.');
        setSearchingRoute(false);
        return;
      }

      setDestination({
        name: firstResult.formatted_address,
        lat: firstResult.geometry.location.lat(),
        lng: firstResult.geometry.location.lng(),
      });
      setRouteRequest({
        source: resolvedSource,
        destination: {
          name: firstResult.formatted_address,
          lat: firstResult.geometry.location.lat(),
          lng: firstResult.geometry.location.lng(),
        },
        requestedAt: Date.now(),
      });
      setGoogleSuggestions([]);
    } catch (error) {
      setDestination(fallbackDestination);
      setRouteRequest({
        source: resolvedSource,
        destination: fallbackDestination,
        requestedAt: Date.now(),
      });
      setSearchError('Google Maps could not resolve that destination. Showing the closest saved option.');
    } finally {
      setSearchingRoute(false);
    }
  };

  const handleBook = async () => {
    if (!selectedStation) {
      return;
    }

    const token = localStorage.getItem('token');
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);

    try {
      const response = await axios.post(
        `${API_BASE}/bookings`,
        {
          station_id: selectedStation.id,
          station_name: selectedStation.name,
          station_address: selectedStation.address || '',
          station_location_lat: selectedStation.location_lat,
          station_location_lng: selectedStation.location_lng,
          station_total_slots: selectedStation.total_slots,
          station_charging_speed: selectedStation.charging_speed,
          station_price_per_hour: selectedStation.price_per_hour,
          station_emergency_price_percent: selectedStation.emergency_price_percent,
          slot_id: null,
          booking_type: bookingType,
          start_time: now.toISOString(),
          end_time: end.toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStations((currentStations) =>
        currentStations.map((station) =>
          station.id === selectedStation.id
            ? {
                ...station,
                active_bookings: response.data.active_bookings,
                available_slots: response.data.available_slots,
              }
            : station
        )
      );

      setSelectedStation((currentStation) =>
        currentStation
          ? {
              ...currentStation,
              active_bookings: response.data.active_bookings,
              available_slots: response.data.available_slots,
            }
          : currentStation
      );

      persistLocalBooking({
        id: response.data.id,
        station_id: selectedStation.id,
        station_name: selectedStation.name,
        booking_type: bookingType,
        start_time: now.toISOString(),
        end_time: end.toISOString(),
        total_price: response.data.total_price,
        status: 'active',
        source: selectedStation.source || 'local',
        created_at: new Date().toISOString(),
      });

      setBookingMessage(
        `${selectedStation.name} reserved successfully as a ${bookingType === 'emergency' ? 'priority emergency' : 'standard'} session. View it in Bookings.`
      );
      notifyBookingsUpdated({ bookingId: response.data.id, status: 'active' });
    } catch (error) {
      setBookingMessage(error.response?.data?.error || 'Booking could not be created.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="app-panel relative z-30 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Enter Source
                </label>
                <div className={`relative z-40 ${showSourceSuggestions && sourceSuggestions.length ? 'mb-80' : 'mb-4'}`}>
                  <input
                    value={sourceQuery}
                    onChange={(event) => {
                      setSourceQuery(event.target.value);
                      setShowSourceSuggestions(true);
                    }}
                    onFocus={() => setShowSourceSuggestions(true)}
                    className="app-input"
                    placeholder="Current Location"
                  />
                  {showSourceSuggestions && sourceSuggestions.length ? (
                    <div className="absolute z-[100] mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111111]">
                      {sourceSuggestions.map((option) => (
                        <button
                          key={`${option.source}-${option.name}`}
                          type="button"
                          onClick={() => applySourceSuggestion(option)}
                          className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-black/[0.04] dark:border-white/5 dark:text-gray-200 dark:hover:bg-white/[0.06]"
                        >
                          <span className="block font-medium">{option.name}</span>
                          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                            {option.source === 'google'
                              ? `Google Maps • ${option.region}`
                              : option.region}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Enter Destination
                </label>
                <div className="relative z-40">
                  <input
                    value={destinationQuery}
                    onChange={(event) => {
                      setDestinationQuery(event.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="app-input"
                    placeholder="Search airport, district, or EV hub"
                  />
                  {showSuggestions && destinationSuggestions.length ? (
                    <div className="absolute z-[100] mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111111]">
                      {destinationSuggestions.map((option) => (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => applySuggestion(option)}
                          className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-black/[0.04] dark:border-white/5 dark:text-gray-200 dark:hover:bg-white/[0.06]"
                        >
                          <span className="block font-medium">{option.name}</span>
                          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                            {option.source === 'google' ? `Google Maps • ${option.region}` : option.region}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <button type="button" onClick={handleSearch} className="app-button-primary xl:min-w-[180px]">
                {searchingRoute ? 'Finding Route...' : 'Build Route'}
              </button>
            </div>
            {sourceSearchError ? <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{sourceSearchError}</p> : null}
            {searchError ? <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{searchError}</p> : null}
          </div>

          <GoogleRouteMap
            source={routeRequest?.source || source}
            destination={routeRequest?.destination || null}
            stations={recommendedStations}
            routePoints={routePoints}
            selectedStationId={selectedStation?.id}
            onSelectStation={setSelectedStation}
            onStationsLoadingChange={setLoadingLiveStations}
            onStationsDiscovered={setLiveRouteStations}
            onRouteComputed={({ points, distanceKm, durationText }) => {
              if (points?.length) {
                setRoutePoints(points);
              }
              setRouteMetrics({
                distanceKm:
                  distanceKm ??
                  haversineDistanceKm(routeRequest?.source || source, routeRequest?.destination || destination),
                durationText: durationText || '',
              });
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="app-panel p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Station Detail</p>
            {selectedStation ? (
              <div className="mt-5 space-y-5">
                <div>
                  <h3 className="text-2xl font-semibold">{selectedStation.name}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {selectedStation.source === 'internet'
                      ? `${selectedStation.status_text || 'Unknown'} • ${selectedStation.charging_speed || 0} kW max speed`
                      : `${selectedStation.available_slots} slots available • ${selectedStation.charging_speed} kW charging speed`}
                  </p>
                </div>
                <div className="space-y-2 text-[15px] leading-7 text-gray-700 dark:text-gray-200">
                  <p>
                    Total slots available:{' '}
                    <span className="font-semibold text-black dark:text-white">
                      {selectedStation.total_slots ?? selectedStation.available_slots ?? 0}
                    </span>
                  </p>
                  <p>
                    Available time slots:{' '}
                    <span className="font-semibold text-black dark:text-white">
                      {selectedStation.available_slots ?? deriveAvailability(selectedStation)}
                    </span>
                  </p>
                 
                  <p>
                    Charging speed:{' '}
                    <span className="font-semibold text-black dark:text-white">
                      {selectedStation.charging_speed || 0} kW
                    </span>
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="app-panel-muted p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      {selectedStation.source === 'internet' ? 'Operator' : 'Price / Hour'}
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-snug break-words">
                      {selectedStation.source === 'internet'
                        ? selectedStation.operator_name || 'Unknown'
                        : formatCurrency(selectedStation.price_per_hour)}
                    </p>
                  </div>
                  <div className="app-panel-muted p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      {selectedStation.source === 'internet' ? 'Usage Cost' : 'Emergency Uplift'}
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-snug break-words">
                      {selectedStation.source === 'internet'
                        ? selectedStation.usage_cost || 'Check operator'
                        : `+${selectedStation.emergency_price_percent}%`}
                    </p>
                  </div>
                </div>
                {selectedStation.address ? (
                  <div className="app-panel-muted p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Address</p>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{selectedStation.address}</p>
                  </div>
                ) : null}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Booking Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['normal', 'emergency'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setBookingType(option)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                          bookingType === option
                            ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                            : 'border-black/10 hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        {option === 'normal' ? 'Normal Booking' : 'Emergency Booking'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Start Time</span>
                    <input
                      type="datetime-local"
                      value={bookingWindow.start}
                      onChange={(event) =>
                        setBookingWindow((current) => ({ ...current, start: event.target.value }))
                      }
                      className="app-input"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">End Time</span>
                    <input
                      type="datetime-local"
                      value={bookingWindow.end}
                      onChange={(event) =>
                        setBookingWindow((current) => ({ ...current, end: event.target.value }))
                      }
                      className="app-input"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleBook}
                  className="app-button-primary w-full"
                >
                  Confirm Booking
                </button>
                {bookingMessage ? <p className="text-sm text-gray-500 dark:text-gray-400">{bookingMessage}</p> : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Select a recommended station to inspect slots, speed, and booking options.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="app-panel relative overflow-hidden p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,rgba(17,17,17,0.95),rgba(17,17,17,0.72))] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-white/60 dark:text-gray-400">Smart Route Planning</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white dark:text-white">
              Find the cleanest charging path before range anxiety finds you.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 dark:text-gray-300">
              Search a destination, visualize the corridor, and compare high-confidence charging stops by detour,
              availability, and cost.
            </p>
          </div>
          <div className="app-panel-muted p-5 text-sm text-gray-700 dark:text-gray-200">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Current Route</p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
                <p className="mt-1 text-lg font-medium">{source.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Destination</p>
                <p className="mt-1 text-lg font-medium">{destinationQuery.trim() ? destination.name : 'Waiting for destination'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Route Distance</p>
                <p className="mt-1 text-lg font-medium">{routeMetrics.distanceKm ? `${routeDistance.toFixed(1)} km` : 'Not started'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Drive</p>
                <p className="mt-1 text-lg font-medium">{routeMetrics.durationText || 'Enter a destination'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Stations In Corridor" value={routePoints.length ? recommendedStations.length : 0} hint="Inside the active source-to-destination route strip" />
        <StatCard label="Fastest Charger" value={`${Math.max(...(liveRouteStations.length ? liveRouteStations : stations).map((station) => station.charging_speed || 0), 0)} kW`} hint="Peak speed across the visible route stations" />
        <StatCard label="Average Price" value={formatCurrency((liveRouteStations.length ? liveRouteStations : stations).reduce((sum, station) => sum + (station.price_per_hour || 0), 0) / Math.max((liveRouteStations.length ? liveRouteStations : stations).length, 1))} hint="Live internet stations may not publish pricing" />
      </section>
    </div>
  );
};

export default Home;
