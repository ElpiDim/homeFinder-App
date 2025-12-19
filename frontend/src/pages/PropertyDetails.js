// src/pages/PropertyDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import GoogleMapView from "../components/GoogleMapView";
import "./PropertyDetails.css";

const ORIENTATION_LABELS = {
  north: "North",
  "north-east": "North-East",
  east: "East",
  "south-east": "South-East",
  south: "South",
  "south-west": "South-West",
  west: "West",
  "north-west": "North-West",
};

const VIEW_LABELS = {
  sea: "Sea",
  mountain: "Mountain",
  park: "Park",
  city: "City",
  none: "No specific view",
};

const CONDITION_LABELS = {
  new: "New",
  renovated: "Renovated",
  good: "Good",
  "needs renovation": "Needs renovation",
};

const humanize = (value) => {
  if (value === undefined || value === null) return "—";
  const str = String(value);
  const withSpaces = str.replace(/_/g, " ");
  const capitalized = withSpaces.replace(/\b\w/g, (c) => c.toUpperCase());
  return capitalized.replace(/-([a-z])/g, (_, c) => `-${c.toUpperCase()}`);
};

const formatEnumValue = (value, dictionary = {}) => {
  if (value === undefined || value === null || value === "") return "—";
  return dictionary[value] || humanize(value);
};

export default function PropertyDetails() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Gallery modal
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Contact form (UI-only, optional)
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactMsg, setContactMsg] = useState("");

  const API_ORIGIN =
    (process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
      : "") || (typeof window !== "undefined" ? window.location.origin : "");

  const normalizeUploadPath = (src) => {
    if (!src) return "";
    if (src.startsWith("http")) return src;
    const clean = src.replace(/^\/+/, "");
    return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
  };

  const getImageUrl = (path) =>
    path
      ? `${API_ORIGIN}${normalizeUploadPath(path)}`
      : "https://placehold.co/1200x800?text=No+Image";

  const money = (value) => {
    const num = Number(value);
    return Number.isFinite(num)
      ? num.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : value ?? "—";
  };

  const boolTick = (v) => (v === true ? "Yes" : v === false ? "No" : "—");

  const isOwner = useMemo(() => {
    if (!user || !property) return false;
    const ownerId = property?.ownerId?._id || property?.ownerId;
    return user?.role === "owner" && ownerId && String(ownerId) === String(user.id);
  }, [user, property]);

  const imgs = property?.images || [];
  const hasCoords =
    property?.latitude != null &&
    property?.longitude != null &&
    !Number.isNaN(Number(property.latitude)) &&
    !Number.isNaN(Number(property.longitude));

  const mapCenter = hasCoords
    ? { lat: Number(property.latitude), lng: Number(property.longitude) }
    : { lat: 37.9838, lng: 23.7275 };

  const areaForPpsm = Number(property?.squareMeters || property?.surface || 0);
  const pricePerSqm =
    areaForPpsm > 0 && property?.price != null
      ? Math.round(Number(property.price) / areaForPpsm)
      : null;

  const locationParts = property?.location
    ? property.location
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  const city = property?.city || locationParts[0] || "";
  const area = property?.area || (locationParts.length > 1 ? locationParts.slice(1).join(", ") : "");

  // ---- fetch property + favorites ----
  useEffect(() => {
    let mounted = true;

    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/${propertyId}`);
        if (!mounted) return;
        setProperty(res.data);
      } catch (err) {
        console.error("Error fetching property:", err);
      }
    };

    const checkFavorite = async () => {
      try {
        const res = await api.get("/favorites");
        const list = Array.isArray(res.data) ? res.data : [];
        const fav = list.find((f) => {
          const pid =
            f.propertyId && typeof f.propertyId === "object"
              ? f.propertyId._id
              : f.propertyId;
          return String(pid) === String(propertyId);
        });
        if (mounted) setIsFavorite(!!fav);
      } catch (err) {
        console.error("Error fetching favorites:", err);
      }
    };

    fetchProperty();
    if (user) checkFavorite();

    return () => {
      mounted = false;
    };
  }, [propertyId, user]);

  // ---- actions ----
  const handleFavorite = async () => {
    try {
      if (!isFavorite) {
        await api.post(
          "/favorites",
          { propertyId },
          { headers: { "Content-Type": "application/json" } }
        );
        setIsFavorite(true);
      } else {
        await api.delete(`/favorites/${propertyId}`);
        setIsFavorite(false);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    try {
      await api.delete(`/properties/${propertyId}`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Error deleting property:", err);
    }
  };

  const openGalleryAt = (idx) => {
    setGalleryIndex(idx);
    setShowGallery(true);
  };

  const closeGallery = () => setShowGallery(false);

  const nextImage = () => {
    if (!imgs.length) return;
    setGalleryIndex((prev) => (prev + 1) % imgs.length);
  };

  const prevImage = () => {
    if (!imgs.length) return;
    setGalleryIndex((prev) => (prev - 1 + imgs.length) % imgs.length);
  };

  const ownerId = property?.ownerId?._id || property?.ownerId;
  const ownerName = property?.ownerId?.name || property?.ownerName || "Listing Agent";
  const ownerAvatar = property?.ownerId?.profilePicture
    ? getImageUrl(property.ownerId.profilePicture)
    : "/default-avatar.jpg";

  const handleContactOwner = () => {
    if (!ownerId) return;
    navigate(`/chat/${propertyId}/${ownerId}`);
  };

  const handleScheduleTour = () => {
    // ίδιο με contact, απλά CTA
    handleContactOwner();
  };

  const amenities = useMemo(() => {
    const list = [];

    // από features string/array
    const featuresList = Array.isArray(property?.features)
      ? property.features
      : property?.features
      ? String(property.features)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [];

    featuresList.forEach((f) => list.push(f));

    // από booleans/fields (soft mapping)
    if (property?.hasElevator) list.push("Elevator");
    if (property?.hasStorage) list.push("Storage");
    if (property?.hasParking || property?.parkingSpaces > 0) list.push("Parking");
    if (property?.petsAllowed) list.push("Pet Friendly");
    if (property?.furnished) list.push("Furnished");
    if (property?.ac) list.push("A/C");

    // unique
    return Array.from(new Set(list)).slice(0, 12);
  }, [property]);

  if (!property) {
    return (
      <div className="pd-page">
        <div className="pd-wrap">Loading…</div>
      </div>
    );
  }

  const addressLine = property.address || property.location || "—";
  const title = property.title || "Property";
  const beds = property.bedrooms ?? "—";
  const baths = property.bathrooms ?? "—";
  const sqm = property.squareMeters ?? property.surface ?? "—";
  const yearBuilt = property.yearBuilt ?? "—";

  const typeLabel =
    property.type === "rent" ? "For Rent" : property.type === "sale" ? "For Sale" : humanize(property.type);

  const statusLabel = property.status ? humanize(property.status) : "";

  return (
    <div className="pd-page">
      <div className="pd-wrap">
        {/* Breadcrumbs */}
        <div className="pd-breadcrumbs">
          <Link to="/dashboard">Home</Link>
          <span>/</span>
          <span>{city || "—"}</span>
          <span>/</span>
          <span className="pd-bc-strong">{title}</span>
        </div>

        {/* Hero layout */}
        <div className="pd-hero">
          {/* LEFT hero content */}
          <div className="pd-main">
            {/* Gallery grid */}
            <div className="pd-gallery">
              <button
                type="button"
                className="pd-viewPhotos"
                onClick={() => openGalleryAt(0)}
                disabled={!imgs.length}
              >
                <span className="material-symbols-outlined">photo_library</span>
                View all {imgs.length || 0} Photos
              </button>

              <div className="pd-grid">
                <button
                  type="button"
                  className="pd-grid-big"
                  onClick={() => openGalleryAt(0)}
                  aria-label="Open photo 1"
                >
                  <img src={getImageUrl(imgs[0])} alt="Main" />
                </button>

                <button
                  type="button"
                  className="pd-grid-sm"
                  onClick={() => openGalleryAt(1)}
                  aria-label="Open photo 2"
                >
                  <img src={getImageUrl(imgs[1] || imgs[0])} alt="Photo 2" />
                </button>

                <button
                  type="button"
                  className="pd-grid-sm"
                  onClick={() => openGalleryAt(2)}
                  aria-label="Open photo 3"
                >
                  <img src={getImageUrl(imgs[2] || imgs[0])} alt="Photo 3" />
                </button>

                <button
                  type="button"
                  className="pd-grid-sm"
                  onClick={() => openGalleryAt(3)}
                  aria-label="Open photo 4"
                >
                  <img src={getImageUrl(imgs[3] || imgs[0])} alt="Photo 4" />
                </button>

                <button
                  type="button"
                  className="pd-grid-sm"
                  onClick={() => openGalleryAt(4)}
                  aria-label="Open photo 5"
                >
                  <img src={getImageUrl(imgs[4] || imgs[0])} alt="Photo 5" />
                </button>
              </div>
            </div>

            {/* Title / price row */}
            <div className="pd-headRow">
              <div>
                <div className="pd-price">
                  € {money(property.price)}
                  {property.type === "rent" && <span className="pd-priceSub">/mo</span>}
                </div>
                <div className="pd-addr">{addressLine}</div>

                <div className="pd-badges">
                  <span className="pd-badge type">{typeLabel}</span>
                  {property.condition && (
                    <span className="pd-badge soft">{formatEnumValue(property.condition, CONDITION_LABELS)}</span>
                  )}
                  {statusLabel && <span className="pd-badge soft">{statusLabel}</span>}
                  {pricePerSqm != null && <span className="pd-badge soft">€{money(pricePerSqm)}/m²</span>}
                </div>
              </div>

              <div className="pd-headActions">
                <button
                  type="button"
                  className={`pd-favBtn ${isFavorite ? "active" : ""}`}
                  onClick={handleFavorite}
                >
                  <span className="material-symbols-outlined">
                    {isFavorite ? "favorite" : "favorite_border"}
                  </span>
                </button>

                {isOwner ? (
                  <div className="pd-ownerActions">
                    <button
                      type="button"
                      className="pd-btn pd-btn-primary"
                      onClick={() => navigate(`/edit-property/${propertyId}`)}
                    >
                      Edit
                    </button>
                    <button type="button" className="pd-btn pd-btn-danger" onClick={handleDelete}>
                      Delete
                    </button>
                  </div>
                ) : (
                  <button type="button" className="pd-btn pd-btn-primary" onClick={handleContactOwner}>
                    Contact Owner
                  </button>
                )}
              </div>
            </div>

            {/* quick stats */}
            <div className="pd-stats">
              <div className="pd-stat">
                <span className="material-symbols-outlined">bed</span>
                <div>
                  <div className="pd-statVal">{beds}</div>
                  <div className="pd-statLbl">Bedrooms</div>
                </div>
              </div>
              <div className="pd-stat">
                <span className="material-symbols-outlined">bathtub</span>
                <div>
                  <div className="pd-statVal">{baths}</div>
                  <div className="pd-statLbl">Bathrooms</div>
                </div>
              </div>
              <div className="pd-stat">
                <span className="material-symbols-outlined">straighten</span>
                <div>
                  <div className="pd-statVal">{sqm}</div>
                  <div className="pd-statLbl">Square meters</div>
                </div>
              </div>
              <div className="pd-stat">
                <span className="material-symbols-outlined">calendar_month</span>
                <div>
                  <div className="pd-statVal">{yearBuilt}</div>
                  <div className="pd-statLbl">Year built</div>
                </div>
              </div>
            </div>

            {/* About */}
            <section className="pd-section">
              <div className="pd-sectionTitle">About this home</div>
              <div className="pd-sectionBody">
                <p className="pd-desc">
                  {property.description?.trim()
                    ? property.description
                    : "No description provided for this listing."}
                </p>

                <div className="pd-factsGrid">
                  <div className="pd-fact">
                    <div className="pd-factLbl">City</div>
                    <div className="pd-factVal">{city || "—"}</div>
                  </div>
                  <div className="pd-fact">
                    <div className="pd-factLbl">Area</div>
                    <div className="pd-factVal">{area || "—"}</div>
                  </div>
                  <div className="pd-fact">
                    <div className="pd-factLbl">Orientation</div>
                    <div className="pd-factVal">{formatEnumValue(property.orientation, ORIENTATION_LABELS)}</div>
                  </div>
                  <div className="pd-fact">
                    <div className="pd-factLbl">View</div>
                    <div className="pd-factVal">{formatEnumValue(property.view, VIEW_LABELS)}</div>
                  </div>
                  <div className="pd-fact">
                    <div className="pd-factLbl">Furnished</div>
                    <div className="pd-factVal">{boolTick(property.furnished)}</div>
                  </div>
                  <div className="pd-fact">
                    <div className="pd-factLbl">Pets allowed</div>
                    <div className="pd-factVal">{boolTick(property.petsAllowed)}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Amenities */}
            <section className="pd-section">
              <div className="pd-sectionTitle">Amenities & Features</div>
              <div className="pd-amenities">
                {amenities.length ? (
                  amenities.map((a, idx) => (
                    <span className="pd-chip" key={`${a}-${idx}`}>
                      {a}
                    </span>
                  ))
                ) : (
                  <div className="pd-muted">No amenities listed.</div>
                )}
              </div>
            </section>

            {/* Location */}
            <section className="pd-section">
              <div className="pd-sectionTitle">Location</div>
              <div className="pd-mapWrap">
                <GoogleMapView
                  properties={hasCoords ? [property] : []}
                  height="320px"
                  useClustering={false}
                  showSearch={false}
                  defaultCenter={mapCenter}
                  zoom={hasCoords ? 14 : 11}
                />
                {!hasCoords && <div className="pd-muted mt-2">No saved pin for this property.</div>}
              </div>
            </section>

         
          </div>

          {/* RIGHT: sticky contact card */}
          <aside className="pd-side">
            <div className="pd-agentCard">
              <div className="pd-agentTop">
                <img className="pd-agentAvatar" src={ownerAvatar} alt="agent" />
                <div>
                  <div className="pd-agentLbl">LISTING AGENT</div>
                  <div className="pd-agentName">{ownerName}</div>
                </div>
              </div>

              <button type="button" className="pd-cta pd-cta-primary" onClick={handleScheduleTour}>
                Schedule a Tour
              </button>

              <button type="button" className="pd-cta pd-cta-secondary" onClick={handleContactOwner}>
                Request Info
              </button>

              {!isOwner && (
                <div className="pd-form">
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your Name"
                  />
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email / Phone"
                  />
                  <textarea
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder={`I'm interested in ${title}...`}
                    rows={3}
                  />
                  <button
                    type="button"
                    className="pd-cta pd-cta-primary"
                    onClick={handleContactOwner}
                  >
                    Send Message
                  </button>
                  <div className="pd-muted" style={{ fontSize: 12 }}>
                    *This will open the chat with the owner.
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Gallery Modal */}
        {showGallery && (
          <div className="pd-modalBackdrop" role="dialog" aria-modal="true">
            <div className="pd-modal">
              <div className="pd-modalHead">
                <div className="pd-modalTitle">
                  Gallery ({galleryIndex + 1}/{imgs.length || 0})
                </div>
                <button className="pd-x" onClick={closeGallery} aria-label="close">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="pd-modalBody">
                <button className="pd-navBtn left" onClick={prevImage} aria-label="prev">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <img
                  className="pd-modalImg"
                  src={getImageUrl(imgs[galleryIndex])}
                  alt={`Image ${galleryIndex + 1}`}
                />

                <button className="pd-navBtn right" onClick={nextImage} aria-label="next">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}