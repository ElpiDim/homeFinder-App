// src/pages/AddProperty.js
import React, { useMemo, useRef, useState } from "react";
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

function getMapsApiKey() {
  return (
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );
}

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --------- Images ----------
  const [images, setImages] = useState([]);
  const [floorPlanImage, setFloorPlanImage] = useState(null);

  // --------- Form State ----------
  const [formData, setFormData] = useState({
    // required / core
    title: "",
    location: "",
    price: "",
    type: "",

    // basics
    address: "",
    description: "",
    floor: "",
    squareMeters: "",
    surface: "",
    onTopFloor: false,
    levels: 1,
    bedrooms: 0,
    bathrooms: 0,
    wc: 0,
    kitchens: 0,
    livingRooms: 0,

    // extras
    yearBuilt: "",
    condition: "", // new|excellent|very_good|good|needs_renovation
    heating: "",   // natural_gas|oil|electric|heat_pump|none
    energyClass: "", // A+..G
    orientation: "", // N|E|S|W|NE|SE|SW|NW
    furnished: false,
    petsAllowed: false,
    smokingAllowed: false,
    hasElevator: false,
    hasStorage: false,
    parkingSpaces: 0,
    monthlyMaintenanceFee: "",
    view: "", // sea|mountain|park|city|open
    insulation: false,
    plotSize: "",
    ownerNotes: "",

    // features (free-form tags)
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
    setFormData((prev) => ({ ...prev, location: addr, address: addr }));
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      if (results && results[0]) {
        setFormData((prev) => ({
          ...prev,
          location: results[0].formatted_address,
          address: results[0].formatted_address,
        }));
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
      return;
    }

    // generic boolean toggles
    const booleanKeys = [
      "onTopFloor",
      "furnished",
      "petsAllowed",
      "smokingAllowed",
      "hasElevator",
      "hasStorage",
      "insulation",
    ];
    if (type === "checkbox" && booleanKeys.includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || user.role !== "owner") return;

    if (!latLng) {
      const cont = window.confirm(
        "Δεν έχεις ορίσει σημείο στο χάρτη. Συνέχεια χωρίς γεωγραφική θέση;"
      );
      if (!cont) return;
    }

    const data = new FormData();

    // append primitives
    Object.entries(formData).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((x) => data.append(k, x));
      } else if (typeof v === "boolean") {
        data.append(k, v ? "true" : "false");
      } else if (v !== null && v !== undefined) {
        data.append(k, v);
      }
    });

    // geo
    if (latLng) {
      data.append("latitude", String(latLng.lat));
      data.append("longitude", String(latLng.lng));
    }

    // files
    images.forEach((img) => data.append("images", img));
    if (floorPlanImage) data.append("floorPlanImage", floorPlanImage);

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

  // UI Options
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

  const pageGradient = useMemo(
    () => ({
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)",
    }),
    []
  );

  if (!user || user.role !== "owner") {
    return (
      <p className="text-danger text-center mt-5">
        Only owners can add properties.
      </p>
    );
  }

  const noKey = !apiKey;

  return (
    <div style={pageGradient} className="py-5">
      <div
        className="container bg-white shadow-sm rounded p-4"
        style={{ maxWidth: 900 }}
      >
        <h4 className="fw-bold mb-4">Add Property</h4>

        <form onSubmit={handleSubmit}>
          {/* BASIC */}
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Location (displayed)</label>
            <input
              name="location"
              className="form-control"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Address (optional)</label>
            <input
              name="address"
              className="form-control"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, number, area"
            />
          </div>

          <div className="row g-3">
            <div className="col-sm-6">
              <label className="form-label">Price (€)</label>
              <input
                name="price"
                type="number"
                className="form-control"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label">Type</label>
              <select
                name="type"
                className="form-control"
                onChange={handleChange}
                required
                value={formData.type}
              >
                <option value="">Select Type</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-3 mt-3">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              rows={3}
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="A few highlights about the property..."
            />
          </div>

          {/* BASIC METRICS */}
          <div className="row g-3">
            <div className="col-sm-4">
              <label className="form-label">Floor</label>
              <input
                name="floor"
                type="number"
                className="form-control"
                value={formData.floor}
                onChange={handleChange}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Square Meters</label>
              <input
                name="squareMeters"
                type="number"
                className="form-control"
                value={formData.squareMeters}
                onChange={handleChange}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Property Surface (m²)</label>
              <input
                name="surface"
                type="number"
                className="form-control"
                value={formData.surface}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-4">
              <label className="form-label">Levels</label>
              <input
                name="levels"
                type="number"
                className="form-control"
                value={formData.levels}
                onChange={handleChange}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Plot Size (m²)</label>
              <input
                name="plotSize"
                type="number"
                className="form-control"
                value={formData.plotSize}
                onChange={handleChange}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Year Built</label>
              <input
                name="yearBuilt"
                type="number"
                className="form-control"
                value={formData.yearBuilt}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* FLAGS */}
          <div className="row g-3 mt-2">
            <div className="col-sm-3">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="onTopFloor"
                  id="onTopFloor"
                  checked={formData.onTopFloor}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="onTopFloor">
                  On Top Floor
                </label>
              </div>
            </div>
            <div className="col-sm-3">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="hasElevator"
                  id="hasElevator"
                  checked={formData.hasElevator}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="hasElevator">
                  Elevator
                </label>
              </div>
            </div>
            <div className="col-sm-3">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="hasStorage"
                  id="hasStorage"
                  checked={formData.hasStorage}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="hasStorage">
                  Storage
                </label>
              </div>
            </div>
            <div className="col-sm-3">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="insulation"
                  id="insulation"
                  checked={formData.insulation}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="insulation">
                  Insulation
                </label>
              </div>
            </div>
          </div>

          {/* ROOMS */}
          <h5 className="mt-4">Rooms</h5>
          {roomControls.map((room) => (
            <div key={room} className="mb-2">
              <label className="form-label">
                {room.charAt(0).toUpperCase() + room.slice(1)}
              </label>
              <input
                name={room}
                type="number"
                className="form-control"
                value={formData[room]}
                onChange={handleChange}
              />
            </div>
          ))}

          {/* EXTRAS */}
          <hr className="my-3" />
          <h5 className="fw-bold">Extras</h5>

          <div className="row g-3">
            <div className="col-sm-4">
              <label className="form-label">Heating</label>
              <select
                name="heating"
                className="form-control"
                value={formData.heating}
                onChange={handleChange}
              >
                <option value="">—</option>
                <option value="natural_gas">Natural Gas</option>
                <option value="oil">Oil</option>
                <option value="electric">Electric</option>
                <option value="heat_pump">Heat Pump</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Energy Class</label>
              <select
                name="energyClass"
                className="form-control"
                value={formData.energyClass}
                onChange={handleChange}
              >
                <option value="">—</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Orientation</label>
              <select
                name="orientation"
                className="form-control"
                value={formData.orientation}
                onChange={handleChange}
              >
                <option value="">—</option>
                <option value="N">N</option>
                <option value="NE">NE</option>
                <option value="E">E</option>
                <option value="SE">SE</option>
                <option value="S">S</option>
                <option value="SW">SW</option>
                <option value="W">W</option>
                <option value="NW">NW</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-4">
              <label className="form-label">Condition</label>
              <select
                name="condition"
                className="form-control"
                value={formData.condition}
                onChange={handleChange}
              >
                <option value="">—</option>
                <option value="new">New</option>
                <option value="excellent">Excellent</option>
                <option value="very_good">Very Good</option>
                <option value="good">Good</option>
                <option value="needs_renovation">Needs Renovation</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">View</label>
              <select
                name="view"
                className="form-control"
                value={formData.view}
                onChange={handleChange}
              >
                <option value="">—</option>
                <option value="sea">Sea</option>
                <option value="mountain">Mountain</option>
                <option value="park">Park</option>
                <option value="city">City</option>
                <option value="open">Open</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Parking Spaces</label>
              <input
                name="parkingSpaces"
                type="number"
                className="form-control"
                value={formData.parkingSpaces}
                onChange={handleChange}
                min={0}
              />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="furnished"
                  id="furnished"
                  checked={formData.furnished}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="furnished">
                  Furnished
                </label>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="petsAllowed"
                  id="petsAllowed"
                  checked={formData.petsAllowed}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="petsAllowed">
                  Pets Allowed
                </label>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="smokingAllowed"
                  id="smokingAllowed"
                  checked={formData.smokingAllowed}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="smokingAllowed">
                  Smoking Allowed
                </label>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-6">
              <label className="form-label">Monthly Maintenance Fee (€)</label>
              <input
                name="monthlyMaintenanceFee"
                type="number"
                className="form-control"
                value={formData.monthlyMaintenanceFee}
                onChange={handleChange}
                min={0}
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label">Owner Notes (private)</label>
              <input
                name="ownerNotes"
                className="form-control"
                value={formData.ownerNotes}
                onChange={handleChange}
                placeholder="Internal notes (not visible to tenants)"
              />
            </div>
          </div>

          {/* FEATURE TAGS */}
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
                  checked={formData.features.includes(feature)}
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

          {!apiKey && (
            <div className="alert alert-warning my-2" role="alert">
              Google Maps API key is missing. Πρόσθεσε στο <code>frontend/.env</code>:
              <br />
              <code>REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE</code>
              <br />
              και κάνε restart το <code>npm start</code>.
            </div>
          )}

          <label className="form-label mt-2">Search address</label>
          <div className="mb-2" style={{ maxWidth: 560 }}>
            {isLoaded && apiKey ? (
              <StandaloneSearchBox onLoad={onSearchLoad} onPlacesChanged={onPlacesChanged}>
                <input
                  type="text"
                  placeholder="Street, number, area"
                  className="form-control"
                  style={{ width: "100%" }}
                />
              </StandaloneSearchBox>
            ) : (
              <input
                type="text"
                className="form-control"
                placeholder="Enable Google Maps by setting an API key"
                disabled
              />
            )}
          </div>

          <div className="mb-2 small text-muted">
            Click on the map to pin property location
          </div>

          <div
            className="rounded overflow-hidden border"
            style={{ height: 320, position: "relative" }}
          >
            {isLoaded && apiKey ? (
              <GoogleMap
                onLoad={setMap}
                mapContainerStyle={containerStyle}
                center={center}
                zoom={12}
                onClick={onMapClick}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  gestureHandling: "greedy",
                }}
              >
                {latLng && <Marker position={latLng} />}
              </GoogleMap>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                {!apiKey ? "Google Maps disabled (missing API key)" : "Loading map…"}
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

          {/* IMAGES */}
          <hr className="my-4" />
          <h5 className="fw-bold">Media</h5>

          <div className="mb-3">
            <label className="form-label">Upload Images</label>
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              onChange={(e) => setImages([...e.target.files])}
              className="form-control"
            />
            <div className="form-text">You can upload multiple photos.</div>
          </div>

          <div className="mb-4">
            <label className="form-label">Floor Plan (optional)</label>
            <input
              type="file"
              name="floorPlanImage"
              accept="image/*,application/pdf"
              onChange={(e) => setFloorPlanImage(e.target.files?.[0] || null)}
              className="form-control"
            />
          </div>

          {/* ACTIONS */}
          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-4"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary rounded-pill px-4">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
