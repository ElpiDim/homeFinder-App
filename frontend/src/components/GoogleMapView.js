import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const containerStyle = { width: "100%", height: "100%" };
const LIBRARIES = ["places"]; // σταθερό array
const LOADER_ID = "gmap";      // ίδιο id παντού

// Πιάνει Vite / Next / CRA με ασφαλή τρόπο
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

/* --------------------- WRAPPER (ΔΕΝ καλεί useJsApiLoader) --------------------- */
export default function GoogleMapView(props) {
  const apiKey = getMapsApiKey();

  // Αν δεν υπάρχει key, δείξε μήνυμα και ΜΗΝ φορτώσεις καθόλου τον Loader
  if (!apiKey) {
    return (
      <div className="card shadow-sm d-flex align-items-center justify-content-center" style={{ height: props.height || "500px" }}>
        <div className="text-center p-3">
          <div className="fw-bold">Google Maps: Δεν βρέθηκε API key</div>
          <div className="small text-muted mt-2">
            Πρόσθεσε στο <code>.env</code> ένα από:
            <br />
            <code>VITE_GOOGLE_MAPS_API_KEY</code> (Vite) ή <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (Next.js) ή <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> (CRA)
            <br />και κάνε restart το dev server.
          </div>
        </div>
      </div>
    );
  }

  return <GoogleMapViewInner {...props} apiKey={apiKey} />;
}

/* --------------------- INNER (ΚΑΛΕΙ useJsApiLoader ΜΙΑ ΦΟΡΑ) --------------------- */
function GoogleMapViewInner({
  apiKey,
  properties = [],
  height = "500px",
  zoom = 11,
  defaultCenter = { lat: 37.9838, lng: 23.7275 }, // Αθήνα
  useClustering = true,
  mapId, // optional styled map id
  showSearch = true,
}) {
  const { isLoaded } = useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    // προαιρετικά κράτα σταθερά αν τα χρησιμοποιήσεις:
    // language: "el",
    // region: "GR",
    // mapIds: mapId ? [mapId] : [],
  });

  const [map, setMap] = useState(null);
  const [active, setActive] = useState(null);
  const clustererRef = useRef(null);

// SearchBox reference
  const searchBoxRef = useRef(null);
  const onSearchLoad = (ref) => {
    searchBoxRef.current = ref;
  };
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
        .map((p) =>({
          id: p._id,
          title: p.title,
          text: p.location,
          img: p.images?.[0],
          position: { lat: Number(p.latitude), lng: Number(p.longitude) },
        })),
    [properties]
  );

  // Fit bounds
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
      m.addListener("click", () => setActive(pt));
      return m;
    });
    if (markers.length) {
      clustererRef.current = new MarkerClusterer({ markers, map });
    }
    return () => clustererRef.current?.clearMarkers();
  }, [map, points, useClustering]);

  if (!isLoaded) return <div className="card shadow-sm" style={{ height }} />;

  return (
    <div className="card shadow-sm" style={{ height, position: "relative" }}>

      {/* searchbox */}
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
          // Κλείνουμε τα default UI kai to built in search 
          disableDefaultUI: true,
          searchControle: false, 
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "greedy",
          mapId,
        }}
      >
        {!useClustering &&
          points.map((pt) => (
            <Marker
              key={pt.id || `${pt.position.lat}-${pt.position.lng}`}
              position={pt.position}
              onClick={() => setActive(pt)}
            />
          ))}

        {active && (
          <InfoWindow position={active.position} onCloseClick={() => setActive(null)}>
            <div style={{ maxWidth: 220 }}>
              <strong>{active.title}</strong>
              <div className="small text-muted">{active.text}</div>
              {active.img && (
                <img src={active.img} alt={active.title} style={{ width: "100%", marginTop: 6, borderRadius: 6 }} />
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
