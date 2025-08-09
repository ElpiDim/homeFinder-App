import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap, Marker, InfoWindow, Autocomplete, useJsApiLoader,
} from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const containerStyle = { width: "100%", height: "100%" };

export default function GoogleMapView({
  properties = [],
  height = "500px",
  zoom = 11,
  defaultCenter = { lat: 37.9838, lng: 23.7275 }, // Αθήνα
  useClustering = true,
  mapId, // optional styled map id
}) {
  const apiKey =
    import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useJsApiLoader({
    id: "gmap",
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  });

  const [map, setMap] = useState(null);
  const [active, setActive] = useState(null);
  const acRef = useRef(null);
  const clustererRef = useRef(null);

  const points = useMemo(
    () =>
      properties
        .filter(p => p.latitude && p.longitude)
        .map(p => ({
          id: p._id,
          title: p.title,
          text: p.location,
          img: p.images?.[0],
          position: { lat: Number(p.latitude), lng: Number(p.longitude) },
        })),
    [properties]
  );

  // Fit bounds στα σημεία
  useEffect(() => {
    if (!map || points.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach(pt => bounds.extend(pt.position));
    map.fitBounds(bounds, { padding: 40 });
  }, [map, points]);

  // Clustering (προαιρετικό)
  useEffect(() => {
    if (!map || !useClustering) return;
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    const markers = points.map(pt => {
      const m = new window.google.maps.Marker({ position: pt.position, title: pt.title });
      m.addListener("click", () => setActive(pt));
      return m;
    });
    if (markers.length) {
      clustererRef.current = new MarkerClusterer({ markers, map });
    }
    return () => clustererRef.current?.clearMarkers();
  }, [map, points, useClustering]);

  const onPlaceChanged = () => {
    const place = acRef.current?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc || !map) return;
    map.panTo({ lat: loc.lat(), lng: loc.lng() });
    map.setZoom(14);
  };

  if (!isLoaded) return <div className="card shadow-sm" style={{ height }} />;

  return (
    <div className="card shadow-sm" style={{ height }}>
      <div style={{ position: "absolute", zIndex: 2, margin: 12, width: "min(480px,90%)" }}>
        <Autocomplete onLoad={(ac) => (acRef.current = ac)} onPlaceChanged={onPlaceChanged}>
          <input className="form-control" placeholder="Αναζήτησε διεύθυνση ή μέρος" />
        </Autocomplete>
      </div>

      <GoogleMap
        onLoad={setMap}
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={zoom}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "greedy",
          mapId,
        }}
      >
        {!useClustering &&
          points.map(pt => (
            <Marker key={pt.id || `${pt.position.lat}-${pt.position.lng}`} position={pt.position} onClick={() => setActive(pt)} />
          ))}

        {active && (
          <InfoWindow position={active.position} onCloseClick={() => setActive(null)}>
            <div style={{ maxWidth: 220 }}>
              <strong>{active.title}</strong>
              <div className="small text-muted">{active.text}</div>
              {active.img && <img src={active.img} alt={active.title} style={{ width: "100%", marginTop: 6, borderRadius: 6 }} />}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
