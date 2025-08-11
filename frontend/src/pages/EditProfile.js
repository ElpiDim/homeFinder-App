// src/pages/EditProperty.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  StandaloneSearchBox,
} from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "320px" };
const LIBRARIES = ["places"];
const LOADER_ID = "gmap";

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

export default function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    type: "",
    floor: "",
    squareMeters: "",
    surface: "",
    onTopFloor: false,
    levels: "",
    bedrooms: "",
    bathrooms: "",
    wc: "",
    kitchens: "",
    livingRooms: "",
    status: "available",
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
  const [center, setCenter] = useState({ lat: 37.9838, lng: 23.7275 }); // Αθήνα default

  // SearchBox
  const searchBoxRef = useRef(null);
  const onSearchLoad = (ref) => (searchBoxRef.current = ref);
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

    const addr =
      place.formatted_address ?? place.vicinity ?? place.name ?? formData.location;
    setFormData((prev) => ({ ...prev, location: addr }));
  };

  // reverse geocode on click
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

  // ---- Load property
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await axios.get(`/api/properties/${propertyId}`);
        const p = res.data;

        setFormData({
          title: p.title || "",
          location: p.location || "",
          price: p.price ?? "",
          type: p.type || "sale",
          floor: p.floor ?? "",
          squareMeters: p.squareMeters ?? "",
          surface: p.surface ?? "",
          onTopFloor: !!p.onTopFloor,
          levels: p.levels ?? "",
          bedrooms: p.bedrooms ?? "",
          bathrooms: p.bathrooms ?? "",
          wc: p.wc ?? "",
          kitchens: p.kitchens ?? "",
          livingRooms: p.livingRooms ?? "",
          status: p.status || "available",
          features: Array.isArray(p.features) ? p.features : [],
        });

        setExistingImages(p.images || []);

        // set map position if we have coords
        if (
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(Number(p.latitude)) &&
          !Number.isNaN(Number(p.longitude))
        ) {
          const pos = { lat: Number(p.latitude), lng: Number(p.longitude) };
          setLatLng(pos);
          setCenter(pos);
        }
      } catch (err) {
        console.error("Error fetching property:", err);
      }
    };

    fetchProperty();
  }, [propertyId]);

  // ---- Form handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && name === "features") {
      setFormData((prev) => ({
        ...prev,
        features: checked
          ? [...prev.features, value]
          : prev.features.filter((f) => f !== value),
      }));
    } else if (type === "checkbox" && name === "onTopFloor") {
      setFormData((prev) => ({ ...prev, onTopFloor: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => setNewImages([...e.target.files]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const data = new FormData();

    // Clean numeric fields
    const toInt = (v) => (v === "" || v == null ? undefined : parseInt(v, 10));
    const toFloat = (v) => (v === "" || v == null ? undefined : parseFloat(v));

    const cleaned = {
      ...formData,
      price: toFloat(formData.price),
      floor: toInt(formData.floor),
      squareMeters: toInt(formData.squareMeters),
      surface: toInt(formData.surface),
      levels: toInt(formData.levels),
      bedrooms: toInt(formData.bedrooms),
      bathrooms: toInt(formData.bathrooms),
      wc: toInt(formData.wc),
      kitchens: toInt(formData.kitchens),
      livingRooms: toInt(formData.livingRooms),
      onTopFloor: !!formData.onTopFloor,
    };

    Object.entries(cleaned).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((x) => data.append(`${k}[]`, x));
      else if (v !== undefined) data.append(k, v);
    });

    if (latLng) {
      data.append("latitude", String(latLng.lat));
      data.append("longitude", String(latLng.lng));
    }

    newImages.forEach((img) => data.append("images", img));

    try {
      await axios.put(`/api/properties/${propertyId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      navigate(`/property/${propertyId}`);
    } catch (err) {
      console.error("❌ Error updating property:", err);
      alert(err.response?.data?.message || "Update failed");
    }
  };

  const roomControls = ["bedrooms", "bathrooms", "wc", "kitchens", "livingRooms"];
  const featureOptions = [
    "Parking spot",
    "Elevator",
    "Secure door",
    "Alarm",
    "Furnished",
    "Storage space",
    "Fireplace",
    "Balcony",
    "Internal staircase",
    "Garden",
    "Swimming pool",
    "Playroom",
    "Attic",
    "View",
    "Solar water heating",
  ];

  // Gradient
  const pageGradient = useMemo(
    () => ({
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)",
    }),
    []
  );

  return (
    <div style={pageGradient} className="py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: 900 }}>
        <h4 className="fw-bold mb-4">Edit Property</h4>

        <form onSubmit={handleSubmit}>
          {/* Basic fields */}
          {[
            ["Title", "title"],
            ["Location", "location"],
            ["Price (€)", "price"],
            ["Floor", "floor"],
            ["Square Meters", "squareMeters"],
            ["Surface (m²)", "surface"],
            ["Levels", "levels"],
          ].map(([label, name]) => (
            <div className="mb-3" key={name}>
              <label className="form-label">{label}</label>
              <input
                name={name}
                type={["price", "levels", "floor", "squareMeters", "surface"].includes(name) ? "number" : "text"}
                className="form-control"
                value={formData[name]}
                onChange={handleChange}
                required={["title", "location", "price"].includes(name)}
              />
            </div>
          ))}

          <div className="mb-3">
            <label className="form-label">Type</label>
            <select name="type" className="form-control" value={formData.type} onChange={handleChange} required>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Status</label>
            <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="onTopFloor"
              name="onTopFloor"
              checked={!!formData.onTopFloor}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="onTopFloor">
              On Top Floor
            </label>
          </div>

          <h5 className="mt-4">Rooms</h5>
          {roomControls.map((room) => (
            <div key={room} className="mb-2">
              <label className="form-label">{room.charAt(0).toUpperCase() + room.slice(1)}</label>
              <input name={room} type="number" className="form-control" value={formData[room]} onChange={handleChange} />
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
                  id={feature}
                  checked={formData.features.includes(feature)}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor={feature}>
                  {feature}
                </label>
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

          <div className="mb-2 small text-muted">
            Click on the map to (re)pin the exact property location
          </div>

          <div className="rounded overflow-hidden border" style={{ height: 320, position: "relative" }}>
            {isLoaded ? (
              <GoogleMap
                onLoad={setMap}
                mapContainerStyle={containerStyle}
                center={center}
                zoom={latLng ? 14 : 12}
                onClick={onMapClick}
                options={{
                  disableDefaultUI: true, // no built-in search
                  zoomControl: true,
                  gestureHandling: "greedy",
                }}
              >
                {latLng && <Marker position={latLng} />}
              </GoogleMap>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">Loading map…</div>
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
          <div className="mb-3 mt-4">
            <label className="form-label">Existing Images</label>
            <div className="d-flex flex-wrap gap-2">
              {existingImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img.startsWith("http") ? img : `http://localhost:5000${img}`}
                  alt={`Existing ${idx}`}
                  style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 6 }}
                />
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Add New Images</label>
            <input type="file" name="images" multiple accept="image/*" onChange={handleImageChange} className="form-control" />
          </div>

          <div className="d-flex justify-content-between">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
