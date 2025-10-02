// src/pages/PropertyDetails.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import GoogleMapView from '../components/GoogleMapView';

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
        "linear-gradient(135deg, #006400 0%, #228b22 33%, #32cd32 66%, #90ee90 100%)",
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

  const money = (n) =>
    typeof n === "number" && !Number.isNaN(n)
      ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : n ?? "—";
  const boolTick = (v) => (v ? "Yes" : "No");

  const reqs = property.requirements || {};
  const areaForPpsm = Number(property.squareMeters || property.surface || 0);
  const pricePerSqm =
    areaForPpsm > 0 && property.price != null
      ? Math.round(Number(property.price) / areaForPpsm)
      : null;

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
                    `/messages/property/${propertyId}/user/${
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
        <div className="row row-cols-1 row-cols-md-2 g-2 mt-1">
          <div className="col"><strong>Type:</strong> {property.type}</div>
          <div className="col"><strong>Status:</strong> {property.status}</div>
          <div className="col"><strong>Square Meters:</strong> {property.squareMeters ?? "—"} m²</div>
          <div className="col"><strong>Bedrooms:</strong> {reqs.bedrooms ?? "—"}</div>
          <div className="col"><strong>Bathrooms:</strong> {reqs.bathrooms ?? "—"}</div>
          <div className="col"><strong>Parking:</strong> {reqs.parking != null ? boolTick(reqs.parking) : "—"}</div>
          <div className="col"><strong>Furnished:</strong> {reqs.furnished != null ? boolTick(reqs.furnished) : "—"}</div>
          <div className="col"><strong>Pets Allowed:</strong> {reqs.petsAllowed != null ? boolTick(reqs.petsAllowed) : "—"}</div>
          <div className="col"><strong>Smoking Allowed:</strong> {reqs.smokingAllowed != null ? boolTick(reqs.smokingAllowed) : "—"}</div>
          <div className="col"><strong>Heating:</strong> {reqs.heating || "—"}</div>
        </div>

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
