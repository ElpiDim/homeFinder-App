import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useNavigate } from "react-router-dom";

const containerStyle = { width: "100%", height: "100%" };
const LIBRARIES = ["places"];
const LOADER_ID = "gmap";
const PLACEHOLDER = "https://via.placeholder.com/120x80?text=No+Image";

function getMapsApiKey() {
  const viteKey =
    typeof import.meta !== "undefined" &&
    import.meta?.env &&
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    viteKey ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    ""
  );
}

export default function GoogleMapView(props) {
  const apiKey = getMapsApiKey();
  if (!apiKey) {
    return (
      <div className="card shadow-sm d-flex align-items-center justify-content-center" style={{ height: props.height || "500px" }}>
        <div className="text-center p-3">
          <div className="fw-bold">Google Maps: Δεν βρέθηκε API key</div>
          <div className="small text-muted mt-2">
            Πρόσθεσε στο <code>.env</code> ένα από:
            <code> VITE_GOOGLE_MAPS_API_KEY</code> / <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> / <code>REACT_APP_GOOGLE_MAPS_API_KEY</code>
          </div>
        </div>
      </div>
    );
  }
  return <GoogleMapViewInner {...props} apiKey={apiKey} />;
}

function GoogleMapViewInner({
  apiKey,
  properties = [],
  height = "500px",
  zoom = 11,
  defaultCenter = { lat: 37.9838, lng: 23.7275 },
  useClustering = true,
  mapId,
  showSearch = true,
}) {
  const { isLoaded } = useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [active, setActive] = useState(null); // { id, title, text, img, position }
  const clustererRef = useRef(null);
  const navigate = useNavigate();

  // 1ο κλικ: ανοίγει InfoWindow | 2ο κλικ στο ίδιο pin: navigate
  const handleMarkerClick = useCallback(
    (pt) => {
      setActive((prev) => {
        if (prev && prev.id === pt.id) {
          navigate(`/property/${pt.id}`);
          return prev; // state δεν αλλάζει
        }
        return pt; // ανοίγει το InfoWindow
      });
    },
    [navigate]
  );

  // SearchBox
  const searchBoxRef = useRef(null);
  const onSearchLoad = (ref) => (searchBoxRef.current = ref);
  const onPlacesChanged = () => {
    if (!map || !searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    const place = places && places[0];
    if (!place?.geometry?.location) return;
    const loc = place.geometry.location;
    map.panTo({ lat: loc.lat(), lng: loc.lng() });
    map.setZoom(14);
  };

  const points = useMemo(
    () =>
      properties
        .filter(
          (p) =>
            p.latitude != null &&
            p.longitude != null &&
            !Number.isNaN(Number(p.latitude)) &&
            !Number.isNaN(Number(p.longitude))
        )
        .map((p) => ({
          id: p._id,
          title: p.title,
          text: p.location,
          img: p.images?.[0],
          position: { lat: Number(p.latitude), lng: Number(p.longitude) },
        })),
    [properties]
  );

  // Fit bounds στα properties
  useEffect(() => {
    if (!map || points.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((pt) => bounds.extend(pt.position));
    map.fitBounds(bounds, { padding: 40 });
  }, [map, points]);

  // Clustering
  useEffect(() => {
    if (!map || !useClustering) return;
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    const markers = points.map((pt) => {
      const m = new window.google.maps.Marker({ position: pt.position, title: pt.title });
      m.addListener("click", () => handleMarkerClick(pt));
      return m;
    });
    if (markers.length) {
      clustererRef.current = new MarkerClusterer({ markers, map });
    }
    return () => clustererRef.current?.clearMarkers();
  }, [map, points, useClustering, handleMarkerClick]);

  if (!isLoaded) return <div className="card shadow-sm" style={{ height }} />;

  return (
    <div className="card shadow-sm" style={{ height, position: "relative" }}>
      {showSearch && (
        <div style={{ position: "absolute", zIndex: 2, margin: 12, width: "min(480px,90%)" }}>
          <StandaloneSearchBox onLoad={onSearchLoad} onPlacesChanged={onPlacesChanged}>
            <input
              type="text"
              placeholder="Αναζήτησε διεύθυνση ή μέρος"
              className="form-control"
              style={{ width: "100%" }}
            />
          </StandaloneSearchBox>
        </div>
      )}

      <GoogleMap
        onLoad={setMap}
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={zoom}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "greedy",
          mapId,
        }}
      >
        {/* Χωρίς clustering: κατευθείαν <Marker/> */}
        {!useClustering &&
          points.map((pt) => (
            <Marker
              key={pt.id || `${pt.position.lat}-${pt.position.lng}`}
              position={pt.position}
              onClick={() => handleMarkerClick(pt)}
            />
          ))}

        {/* InfoWindow στο ενεργό pin */}
        {active && (
    <InfoWindow position={active.position} onCloseClick={() => setActive(null)}>
      <div style={{ maxWidth: 240 }}>
        <div
          onClick={() => navigate(`/property/${active.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/property/${active.id}`)}
          style={{ cursor: 'pointer' }}
          aria-label={`Open ${active.title}`}
          title="Open details"
        >
          <img
            src={active.img || PLACEHOLDER}
            alt={active.title}
            style={{
              width: "100%",
              height: 100,
              objectFit: "cover",
              borderRadius: 6,
              marginBottom: 6
            }}
          />
          <div style={{ fontWeight: 600 }}>{active.title}</div>
        </div>
        <div className="small text-muted">{active.text}</div>
      </div>
    </InfoWindow>
  )}
      </GoogleMap>
    </div>
  );
}
