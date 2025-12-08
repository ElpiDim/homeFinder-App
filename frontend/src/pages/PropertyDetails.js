// src/pages/PropertyDetails.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import GoogleMapView from '../components/GoogleMapView';

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

const HEATING_LABELS = {
  none: "None",
  central: "Central heating",
  autonomous: "Autonomous heating",
  gas: "Gas heating",
  ac: "Air conditioning",
  other: "Other",
};

const HEATING_MEDIUM_LABELS = {
  petrol: "Petrol",
  "natural gas": "Natural gas",
  "gas heating system": "Gas heating system",
  current: "Electric current",
  stove: "Stove",
  "thermal accumulator": "Thermal accumulator",
  pellet: "Pellet",
  infrared: "Infrared",
  "fan coil": "Fan coil",
  wood: "Wood",
  teleheating: "Teleheating",
  "geothermal energy": "Geothermal energy",
};

const LEASE_DURATION_LABELS = {
  short: "Short stay (< 12 months)",
  long: "Long term (≥ 12 months)",
};

const CONDITION_LABELS = {
  new: "New",
  renovated: "Renovated",
  good: "Good",
  "needs renovation": "Needs renovation",
};

const ZONE_LABELS = {
  residential: "Residential",
  agricultural: "Agricultural",
  commercial: "Commercial",
  industrial: "Industrial",
  recreational: "Recreational",
  unincorporated: "Unincorporated",
};

const FAMILY_STATUS_LABELS = {
  single: "Single",
  couple: "Couple",
  family: "Family",
};

const ROOMMATE_PREFERENCE_LABELS = {
  any: "Any",
  roommates_only: "Roommates only",
  no_roommates: "No roommates",
};

const humanize = (value) => {
  if (value === undefined || value === null) return "—";
  const str = String(value);
  const withSpaces = str.replace(/_/g, " ");
  const capitalized = withSpaces.replace(/\b\w/g, (char) => char.toUpperCase());
  return capitalized.replace(/-([a-z])/g, (_, char) => `-${char.toUpperCase()}`);
};

const formatEnumValue = (value, dictionary = {}) => {
  if (value === undefined || value === null || value === "") return "—";
  return dictionary[value] || humanize(value);
};

function PropertyDetails() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Gallery state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const pageGradient = useMemo(
    () => ({
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, #4b0082 0%, #6f42c1 33%, #a020f0 66%, #e0b0ff 100%)",
    }),
    []
  );

  // API origin & image helpers
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

  // Fetch property & favorites
  useEffect(() => {
    let mounted = true;

    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/${propertyId}`);
        if (mounted) {
          setProperty(res.data);
          setCurrentImageIndex(0);
        }
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

  // Gallery helpers
  const openGalleryAt = (idx) => {
    setGalleryIndex(idx);
    setShowGallery(true);
  };
  const closeGallery = () => setShowGallery(false);
  const nextImage = () => {
    if (!property?.images?.length) return;
    setGalleryIndex((prev) => (prev + 1) % property.images.length);
  };
  const prevImage = () => {
    if (!property?.images?.length) return;
    setGalleryIndex(
      (prev) => (prev - 1 + property.images.length) % property.images.length
    );
  };

  if (!property) {
    return (
      <div style={pageGradient}>
        <div className="container py-5">Loading…</div>
      </div>
    );
  }

  const isOwner =
    user?.role === "owner" &&
    user?.id === (property?.ownerId?._id || property?.ownerId);

  const imgs = property.images || [];
  const hasCoords =
    property.latitude != null &&
    property.longitude != null &&
    !Number.isNaN(Number(property.latitude)) &&
    !Number.isNaN(Number(property.longitude));

  const mapCenter = hasCoords
    ? { lat: Number(property.latitude), lng: Number(property.longitude) }
    : { lat: 37.9838, lng: 23.7275 }; // Athens fallback

  const money = (value) => {
    const num = Number(value);
    return Number.isFinite(num)
      ? num.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : value ?? "—";
  };
  const boolTick = (v) => (v === true ? "Yes" : v === false ? "No" : "—");

  const formatValue = (value) => {
    if (value === undefined || value === null) return "—";
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? "—" : trimmed;
    }
    return String(value);
  };

  const formatUnit = (value, unit) => {
    const base = formatValue(value);
    return base === "—" ? base : `${base} ${unit}`;
  };

  const formatListText = (values) => {
    if (!values || (Array.isArray(values) && values.length === 0)) return "—";
    if (Array.isArray(values)) {
      const cleaned = values
        .map((item) => formatValue(item))
        .filter((item) => item !== "—");
      return cleaned.length ? cleaned.join(", ") : "—";
    }
    return formatValue(values);
  };

  const tenantReqs = property.tenantRequirements || property.requirements || {};
  const areaForPpsm = Number(property.squareMeters || property.surface || 0);
  const pricePerSqm =
    areaForPpsm > 0 && property.price != null
      ? Math.round(Number(property.price) / areaForPpsm)
      : null;
  const locationParts = property.location
    ? property.location
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  const city = property.city || locationParts[0] || "";
  const area =
    property.area ||
    (locationParts.length > 1 ? locationParts.slice(1).join(", ") : "");

  const propertyCategory = property.propertyCategory || property.propertyType;
  const heatingValue = property.heatingType || property.heating;
  const heatingMediumValue = property.heatingMedium;
  const zoneValue = property.zone || property.propertyZone;
  const monthlyMaintenance =
    property.monthlyCommonExpenses ?? property.monthlyMaintenanceFee;
  const leaseDurationValue =
    property.leaseDuration || tenantReqs.leaseDuration || property.preferredLease;
  const availableFrom =
    property.availableFrom ||
    property.available_from ||
    property.dateAvailable ||
    property.availableDate;
  const videoUrl = property.videoUrl || property.videoURL;
  const contactName = property.contactName || property.contact?.name;
  const contactPhone = property.contactPhone || property.contact?.phone;
  const contactEmail = property.contactEmail || property.contact?.email;
  const hasParkingValue =
    property.hasParking ??
    property.parking ??
    (property.parkingSpaces != null ? property.parkingSpaces > 0 : undefined);

  const allowedOccupations = Array.isArray(tenantReqs.allowedOccupations)
    ? tenantReqs.allowedOccupations
    : tenantReqs.allowedOccupations
    ? String(tenantReqs.allowedOccupations)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const tenantNotes =
    tenantReqs.notes || tenantReqs.tenantRequirementsNotes || tenantReqs.note;

  const minTenantSalaryText =
    tenantReqs.minTenantSalary !== undefined &&
    tenantReqs.minTenantSalary !== null &&
    tenantReqs.minTenantSalary !== ""
      ? `€ ${money(tenantReqs.minTenantSalary)}`
      : "—";

  const factGroups = [
    {
      title: "Location & Listing",
      items: [
        { label: "City", value: formatValue(city) },
        { label: "Area", value: formatValue(area) },
        { label: "Address", value: formatValue(property.address) },
        { label: "Property Category", value: formatEnumValue(propertyCategory) },
        { label: "Listing Type", value: formatEnumValue(property.type) },
        { label: "Status", value: formatEnumValue(property.status) },
        {
          label: "Lease Duration",
          value: formatEnumValue(leaseDurationValue, LEASE_DURATION_LABELS),
        },
        { label: "Available From", value: formatValue(availableFrom) },
        { label: "Zone", value: formatEnumValue(zoneValue, ZONE_LABELS) },
      ],
    },
    {
      title: "Size & Layout",
      items: [
        { label: "Square Meters", value: formatUnit(property.squareMeters, "m²") },
        { label: "Surface", value: formatUnit(property.surface, "m²") },
        { label: "Plot Size", value: formatUnit(property.plotSize, "m²") },
        { label: "Floor", value: formatValue(property.floor) },
        { label: "Levels", value: formatValue(property.levels) },
        { label: "On Top Floor", value: boolTick(property.onTopFloor) },
        { label: "Bedrooms", value: formatValue(property.bedrooms) },
        { label: "Bathrooms", value: formatValue(property.bathrooms) },
        { label: "WC", value: formatValue(property.wc) },
        { label: "Kitchens", value: formatValue(property.kitchens) },
        { label: "Living Rooms", value: formatValue(property.livingRooms) },
      ],
    },
    {
      title: "Condition & Comfort",
      items: [
        { label: "Year Built", value: formatValue(property.yearBuilt) },
        { label: "Condition", value: formatEnumValue(property.condition, CONDITION_LABELS) },
        { label: "Orientation", value: formatEnumValue(property.orientation, ORIENTATION_LABELS) },
        { label: "View", value: formatEnumValue(property.view, VIEW_LABELS) },
        { label: "Heating Type", value: formatEnumValue(heatingValue, HEATING_LABELS) },
        {
          label: "Heating Medium",
          value: formatEnumValue(heatingMediumValue, HEATING_MEDIUM_LABELS),
        },
        { label: "Energy Class", value: formatValue(property.energyClass) },
        { label: "Insulation", value: boolTick(property.insulation) },
      ],
    },
    {
      title: "Amenities",
      items: [
        { label: "Furnished", value: boolTick(property.furnished) },
        { label: "Pets Allowed", value: boolTick(property.petsAllowed) },
        { label: "Smoking Allowed", value: boolTick(property.smokingAllowed) },
        { label: "Has Parking", value: boolTick(hasParkingValue) },
        { label: "Parking Spaces", value: formatValue(property.parkingSpaces) },
        { label: "Has Elevator", value: boolTick(property.hasElevator) },
        { label: "Has Storage", value: boolTick(property.hasStorage) },
      ],
    },
    {
      title: "Financial & Availability",
      items: [
        { label: "Price", value: `€ ${money(property.price)}` },
        {
          label: "Price per m²",
          value: pricePerSqm ? `€ ${money(pricePerSqm)}` : "—",
        },
        {
          label: "Monthly Maintenance Fee",
          value:
            monthlyMaintenance !== undefined &&
            monthlyMaintenance !== null &&
            monthlyMaintenance !== ""
              ? `€ ${money(monthlyMaintenance)}`
              : "—",
        },
      ],
    },
    {
      title: "Media & Links",
      items: [
        {
          label: "Video Tour",
          value:
            videoUrl && typeof videoUrl === "string" && videoUrl.trim() !== "" ? (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                {videoUrl}
              </a>
            ) : (
              "—"
            ),
        },
      ],
    },
  ];

  const tenantRequirementItems = [
    { label: "Minimum Tenant Salary", value: minTenantSalaryText },
    {
      label: "Allowed Occupations",
      value: formatListText(allowedOccupations),
    },
    {
      label: "Preferred Family Status",
      value: formatEnumValue(tenantReqs.familyStatus, FAMILY_STATUS_LABELS),
    },
    { label: "Pets Allowed", value: boolTick(tenantReqs.pets) },
    { label: "Smoking Allowed", value: boolTick(tenantReqs.smoker) },
    { label: "Minimum Tenant Age", value: formatValue(tenantReqs.minTenantAge) },
    { label: "Maximum Tenant Age", value: formatValue(tenantReqs.maxTenantAge) },
    { label: "Max Household Size", value: formatValue(tenantReqs.maxHouseholdSize) },
    { label: "Requires Furnished", value: boolTick(tenantReqs.furnished) },
    { label: "Requires Parking", value: boolTick(tenantReqs.parking) },
    { label: "Requires Elevator", value: boolTick(tenantReqs.hasElevator) },
    {
      label: "Roommate Preference",
      value: formatEnumValue(
        tenantReqs.roommatePreference,
        ROOMMATE_PREFERENCE_LABELS
      ),
    },
    { label: "Additional Notes", value: formatValue(tenantNotes) },
  ];

  const contactItems = [
    { label: "Contact Name", value: formatValue(contactName) },
    {
      label: "Contact Phone",
      value:
        contactPhone && contactPhone !== "—"
          ? (
              <a href={`tel:${contactPhone}`}>{contactPhone}</a>
            )
          : "—",
    },
    {
      label: "Contact Email",
      value:
        contactEmail && contactEmail !== "—"
          ? (
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            )
          : "—",
    },
  ];

  const featuresList = Array.isArray(property.features)
    ? property.features
    : property.features
    ? String(property.features)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const renderFactRows = (items) => (
    <div className="row row-cols-1 row-cols-md-2 g-2 mt-1">
      {items.map((item) => (
        <div key={item.label} className="col">
          <strong>{item.label}:</strong> {item.value}
        </div>
      ))}
    </div>
  );

  return (
    <div style={pageGradient} className="py-5">
      <div
        className="container bg-white shadow-sm rounded-4 p-4"
        style={{ maxWidth: "1000px" }}
      >
        {/* Back */}
        <button
          className="btn btn-outline-secondary rounded-pill px-3 mb-3"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to search
        </button>

        {/* Header */}
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div>
            <h3 className="fw-bold mb-1">{property.title}</h3>
            <div className="d-flex gap-2 flex-wrap">
              <span
                className={`badge rounded-pill ${
                  property.type === "rent" ? "bg-info" : "bg-primary"
                }`}
              >
                {property.type}
              </span>
              <span
                className={`badge rounded-pill ${
                  property.status === "available"
                    ? "bg-success"
                    : property.status === "sold"
                    ? "bg-secondary"
                    : "bg-warning"
                }`}
              >
                {property.status}
              </span>
            </div>
            <div className="text-muted mt-2">
              📍 {property.address || property.location}
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <button
              className={`btn rounded-pill px-4 ${
                isFavorite
                  ? "btn-warning text-dark"
                  : "btn-outline-warning"
              }`}
              onClick={handleFavorite}
            >
              {isFavorite ? "★ Favorited" : "☆ Add to Favorites"}
            </button>
            {!isOwner && user && (
              <button
                className="btn btn-success rounded-pill px-4"
                onClick={() =>
                  navigate(
                    `/chat/${propertyId}/${
                      property.ownerId._id || property.ownerId
                    }`
                  )
                }
              >
                Contact Owner
              </button>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="mt-3 p-3 rounded-3 border bg-light d-flex justify-content-between flex-wrap">
          <div className="fs-4 fw-bold">€ {money(property.price)}</div>
          <div className="text-muted">
            {property.squareMeters
              ? `${property.squareMeters} m²`
              : property.surface
              ? `${property.surface} m²`
              : "—"}
            {pricePerSqm && <> · <strong>€{money(pricePerSqm)}/m²</strong></>}
          </div>
        </div>

        {/* Main image */}
        <div className="position-relative mt-3">
          <img
            src={
              imgs[currentImageIndex]
                ? getImageUrl(imgs[currentImageIndex])
                : "https://placehold.co/800x400?text=No+Image"
            }
            alt={property.title}
            className="img-fluid rounded-3 mb-3"
            style={{ maxHeight: "420px", objectFit: "cover", width: "100%" }}
            onClick={() => imgs.length && openGalleryAt(currentImageIndex)}
          />

          {imgs.length > 1 && (
            <div className="d-flex justify-content-between">
              <button
                className="btn btn-light rounded-pill px-3"
                onClick={() =>
                  setCurrentImageIndex(
                    (prev) => (prev === 0 ? imgs.length - 1 : prev - 1)
                  )
                }
              >
                ◀
              </button>
              <button
                className="btn btn-light rounded-pill px-3"
                onClick={() =>
                  setCurrentImageIndex(
                    (prev) => (prev === imgs.length - 1 ? 0 : prev + 1)
                  )
                }
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {imgs.length > 1 && (
          <div className="d-flex flex-wrap gap-2 mb-4">
            {imgs.map((src, i) => (
              <img
                key={i}
                src={getImageUrl(src)}
                alt={`Thumbnail ${i + 1}`}
                style={{
                  width: 96,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: 8,
                  outline:
                    i === currentImageIndex
                      ? "2px solid #0d6efd"
                      : "1px solid #e5e7eb",
                  cursor: "pointer",
                }}
                onClick={() => openGalleryAt(i)}
              />
            ))}
          </div>
        )}

        {/* Description */}
        {property.description && (
          <>
            <h5 className="fw-bold">Description</h5>
            <p>{property.description}</p>
            <hr />
          </>
        )}

        {/* Map */}
        <div className="mb-4">
          <h5 className="fw-bold">Location on Map</h5>
          <GoogleMapView
            properties={hasCoords ? [property] : []}
            height="300px"
            useClustering={false}
            showSearch={false}
            defaultCenter={mapCenter}
            zoom={hasCoords ? 14 : 11}
          />
          {!hasCoords && (
            <div className="small text-muted mt-2">
              No saved pin for this property.
            </div>
          )}
        </div>

        {/* Facts */}
        <hr />
        <h5 className="fw-bold">Facts</h5>
        {factGroups.map((group, index) => (
          <div
            key={group.title}
            className={index === 0 ? "mt-2" : "mt-4"}
          >
            <div className="text-uppercase text-muted small fw-semibold mb-1">
              {group.title}
            </div>
            {renderFactRows(group.items)}
          </div>
        ))}

        {/* Additional features */}
        <hr />
        <h5 className="fw-bold">Additional Features</h5>
        {featuresList.length ? (
          <div className="d-flex flex-wrap gap-2 mt-1">
            {featuresList.map((feature, idx) => (
              <span
                key={`${feature}-${idx}`}
                className="badge bg-light text-dark border"
              >
                {feature}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-muted">No additional features listed.</div>
        )}

        {/* Tenant requirements - Ορατό μόνο στον Ιδιοκτήτη */}
        {isOwner && (
          <>
            <hr />
            <h5 className="fw-bold">Tenant Requirements</h5>
            {renderFactRows(tenantRequirementItems)}
          </>
        )}

        {/* Contact details */}
        <hr />
        <h5 className="fw-bold">Contact Details</h5>
        {renderFactRows(contactItems)}

        {/* Floor Plan */}
        {property.floorPlanImage && (
          <>
            <hr />
            <h5 className="fw-bold">Floor plan</h5>
            <img
              src={getImageUrl(property.floorPlanImage)}
              alt="Floor plan"
              style={{
                width: "100%",
                maxHeight: 600,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #eee",
                cursor: "pointer",
              }}
              onClick={() =>
                window.open(getImageUrl(property.floorPlanImage), "_blank")
              }
            />
          </>
        )}

        {/* Owner Notes */}
        {isOwner && property.ownerNotes && (
          <div className="alert alert-secondary mt-3">
            <strong>Owner Notes:</strong> {property.ownerNotes}
          </div>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <div className="mt-4 d-flex gap-2">
            <button
              className="btn btn-primary rounded-pill px-4"
              onClick={() => navigate(`/edit-property/${propertyId}`)}
            >
              Edit
            </button>
            <button
              className="btn btn-danger rounded-pill px-4"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4">
              <div className="modal-header">
                <h5 className="modal-title">
                  Gallery ({galleryIndex + 1}/{property.images?.length || 0})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeGallery}
                />
              </div>
              <div className="modal-body text-center">
                <img
                  src={getImageUrl(property.images?.[galleryIndex])}
                  alt={`Image ${galleryIndex + 1}`}
                  style={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              </div>
              {property.images?.length > 1 && (
                <div className="modal-footer d-flex justify-content-between">
                  <button
                    className="btn btn-light rounded-pill px-4"
                    onClick={prevImage}
                  >
                    ◀ Prev
                  </button>
                  <button
                    className="btn btn-light rounded-pill px-4"
                    onClick={nextImage}
                  >
                    Next ▶
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetails;