import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  StandaloneSearchBox,
} from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "320px" };
const LIBRARIES = ["places"];
const LOADER_ID = "gmap";

// key helper (CRA/Next/Vite)
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

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);

  const [formData, setFormData] = useState({
    title: "", location: "", price: "", type: "",
    floor: "", squareMeters: "", surface: "", onTopFloor: false, levels: 1,
    bedrooms: 0, bathrooms: 0, wc: 0, kitchens: 0, livingRooms: 0,
    features: [],
  });

  // ---- Google Maps ----
  const apiKey = getMapsApiKey();
  const { isLoaded } = useJsApiLoader(
    apiKey
      ? { id: LOADER_ID, googleMapsApiKey: apiKey, libraries: LIBRARIES }
      : { id: LOADER_ID }
  );
  const [map, setMap] = useState(null);
  const [latLng, setLatLng] = useState(null);
  const [center, setCenter] = useState({ lat: 37.9838, lng: 23.7275 }); // Αθήνα

  // StandaloneSearchBox
  const searchBoxRef = useRef(null);
  const onSearchLoad = (ref) => { searchBoxRef.current = ref; };
  const onPlacesChanged = () => {
    if (!map || !searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    const place = places && places[0];
    if (!place?.geometry?.location) return;

    const loc = place.geometry.location;
    const p = { lat: loc.lat(), lng: loc.lng() };
    setLatLng(p);
    setCenter(p);
    map.panTo(p);
    map.setZoom(Math.max(map.getZoom() || 0, 14));

    // Προσπάθησε να γεμίσεις το address
    const addr =
      place.formatted_address ??
      place.vicinity ??
      place.name ??
      formData.location;
    setFormData((prev) => ({ ...prev, location: addr }));
  };

  // reverse geocoding στο click
  const reverseGeocode = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      if (results && results[0]) {
        setFormData((prev) => ({ ...prev, location: results[0].formatted_address }));
      }
    } catch (e) {
      console.warn("Reverse geocode failed", e);
    }
  };

  const onMapClick = (e) => {
    const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLatLng(p);
    setCenter(p);
    reverseGeocode(p.lat, p.lng);
  };

  // ---- Form handlers ----
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && name === "features") {
      setFormData((prev) => ({
        ...prev,
        features: checked
          ? [...prev.features, value]
          : prev.features.filter((f) => f !== value),
      }));
    } else if (type === "radio" && name === "onTopFloor") {
      setFormData((prev) => ({ ...prev, onTopFloor: value === "yes" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || user.role !== "owner") return;

    if (!latLng) {
      const cont = window.confirm("Δεν έχεις ορίσει σημείο στο χάρτη. Συνέχεια χωρίς γεωγραφική θέση;");
      if (!cont) return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((x) => data.append(k, x));
      else data.append(k, v);
    });

    if (latLng) {
      data.append("latitude", String(latLng.lat));
      data.append("longitude", String(latLng.lng));
    }
    images.forEach((img) => data.append("images", img));

    try {
      const token = localStorage.getItem("token");
      await api.post("/properties", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Property created!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error uploading property");
    }
  };

  const roomControls = ["bedrooms", "bathrooms", "wc", "kitchens", "livingRooms"];
  const featureOptions = [
    "Parking spot","Elevator","Secure door","Alarm","Furnished",
    "Storage space","Fireplace","Balcony","Internal staircase",
    "Garden","Swimming pool","Playroom","Attic","View","Solar water heating",
  ];

  // Gradient
  const pageGradient = useMemo(() => ({
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)",
  }), []);

  if (!user || user.role !== "owner") {
    return <p className="text-danger text-center mt-5">Only owners can add properties.</p>;
  }

  return (
    <div style={pageGradient} className="py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: 900 }}>
        <h4 className="fw-bold mb-4">Add Property</h4>

        <form onSubmit={handleSubmit}>
          {/* Basic fields */}
          {[
            ["Title","title"],["Location","location"],["Price (€)","price"],["Floor","floor"],
            ["Square Meters","squareMeters"],["Property Surface (m²)","surface"],["Levels","levels"]
          ].map(([label, name]) => (
            <div className="mb-3" key={name}>
              <label className="form-label">{label}</label>
              <input
                name={name}
                type={["price","levels"].includes(name) ? "number" : "text"}
                className="form-control"
                value={formData[name]}
                onChange={handleChange}
                required={["title","location","price"].includes(name)}
              />
            </div>
          ))}

          <div className="mb-3">
            <label className="form-label">Type</label>
            <select name="type" className="form-control" onChange={handleChange} required>
              <option value="">Select Type</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Is on Top Floor?</label>
            <div>
              <input type="radio" name="onTopFloor" value="yes" onChange={handleChange}/> Yes
              <input type="radio" name="onTopFloor" value="no" onChange={handleChange} className="ms-3"/> No
            </div>
          </div>

          <h5 className="mt-4">Rooms</h5>
          {roomControls.map((room) => (
            <div key={room} className="mb-2">
              <label className="form-label">{room.charAt(0).toUpperCase() + room.slice(1)}</label>
              <input name={room} type="number" className="form-control" onChange={handleChange}/>
            </div>
          ))}

          <h5 className="mt-4">Features</h5>
          <div className="d-flex flex-wrap gap-3">
            {featureOptions.map((feature) => (
              <div key={feature} className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="features"
                  value={feature}
                  onChange={handleChange}
                  id={feature}
                />
                <label className="form-check-label" htmlFor={feature}>{feature}</label>
              </div>
            ))}
          </div>

          {/* ---- LOCATION (Google Maps + SearchBox) ---- */}
          <hr className="my-4" />
          <h5 className="fw-bold">Property location</h5>

          <label className="form-label mt-2">Search address</label>
          <div className="mb-2" style={{ maxWidth: 560 }}>
            {isLoaded && (
              <StandaloneSearchBox onLoad={onSearchLoad} onPlacesChanged={onPlacesChanged}>
                <input
                  type="text"
                  placeholder="Street, number, area"
                  className="form-control"
                  style={{ width: "100%" }}
                />
              </StandaloneSearchBox>
            )}
          </div>

          <div className="mb-2 small text-muted">Click on the map to pin property location</div>

          <div className="rounded overflow-hidden border" style={{ height: 320, position: "relative" }}>
            {isLoaded ? (
              <GoogleMap
                onLoad={setMap}
                mapContainerStyle={containerStyle}
                center={center}
                zoom={12}
                onClick={onMapClick}
                options={{
                  disableDefaultUI: true, // 🔒 κλείνει το built-in Search
                  zoomControl: true,
                  gestureHandling: "greedy",
                  // Μην περνάς mapId που έχει ενεργό Search στο Cloud Style
                }}
              >
                {latLng && <Marker position={latLng} />}
              </GoogleMap>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                Loading map…
              </div>
            )}
          </div>

          <div className="row g-2 mt-2" style={{ maxWidth: 560 }}>
            <div className="col">
              <input className="form-control" value={latLng?.lat || ""} readOnly placeholder="Latitude" />
            </div>
            <div className="col">
              <input className="form-control" value={latLng?.lng || ""} readOnly placeholder="Longitude" />
            </div>
          </div>

          {/* Images */}
          <div className="mb-4 mt-4">
            <label className="form-label">Upload Images</label>
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              onChange={(e) => setImages([...e.target.files])}
              className="form-control"
            />
          </div>

          <div className="d-flex justify-content-between">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">Set location & Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
