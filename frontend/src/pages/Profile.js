// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const Field = ({ label, value }) => (
  <div className="col-md-4">
    <div className="text-uppercase text-muted small fw-semibold mb-1">
      {label}
    </div>
    <div className="fw-semibold">
      {value ?? "Not Specified"}
    </div>
  </div>
);

const yesNo = (v) =>
  v === true ? "Yes" : v === false ? "No" : "Not Specified";

const money = (v) =>
  v || v === 0 ? `€ ${Number(v).toLocaleString()}` : "Not Specified";

const formatDealType = (dealType, intent) => {
  if (dealType === "sale" || intent === "buy") return "Buy";
  if (dealType === "rent" || intent === "rent") return "Rent";
  return "Not Specified";
};

const formatRange = (min, max, unit = "") => {
  if (min === undefined && max === undefined) return "Not Specified";
  const minValue = min ?? 0;
  const maxValue = max ?? "∞";
  return `${minValue}${unit} - ${maxValue}${unit}`;
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("/users/me");
        const fresh = data?.user || data;
        if (!cancelled && fresh) {
          setUser(fresh);
          localStorage.setItem("user", JSON.stringify(fresh));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => (cancelled = true);
  }, [setUser]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (!user) return <div className="p-4">No profile data</div>;

  const p = user.preferences || {};
  const isClient = user.role === "client";
  const intent = p.intent || (p.dealType === "sale" ? "buy" : "rent");

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Detailed User Profile Info</h3>
          <div className="text-muted">
            Manage your personal information and housing preferences
          </div>
        </div>

        <button
          className="btn rounded-pill px-4"
          style={{
            background: "#7b2ff7",
            color: "#fff",
            fontWeight: 600,
          }}
          onClick={() => navigate("/edit-profile")}
        >
          ✎ Edit Profile
        </button>
      </div>

      {/* PERSONAL INFO */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold text-primary mb-4">
            👤 PERSONAL INFORMATION
          </h6>

          <div className="row g-4">
            <Field label="Name" value={user.name} />
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phone} />

            {isClient && (
              <>
                <Field label="Age" value={user.age} />
                <Field label="Household Size" value={user.householdSize} />
                <Field label="Has Family" value={yesNo(user.hasFamily)} />
                <Field label="Has Pets" value={yesNo(user.hasPets)} />
                <Field label="Smoker" value={yesNo(user.smoker)} />
                <Field
                  label="Willing to Have Roommate"
                  value={yesNo(user.isWillingToHaveRoommate)}
                />
                <Field label="Occupation" value={user.occupation} />
                <Field label="Salary" value={money(user.salary)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* HOUSING PREFERENCES */}
      {isClient && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="fw-bold text-primary mb-4">
              🏠 HOUSING PREFERENCES
            </h6>

            <div className="row g-4">
              <Field label="Preferred Location" value={p.location} />

              {intent === "rent" ? (
                <>
                  <Field
                    label="Rent Range"
                    value={
                      p.rentMin !== undefined || p.rentMax !== undefined
                        ? `€${p.rentMin ?? 0} - €${p.rentMax ?? "∞"}`
                        : "Not Specified"
                    }
                  />
                </>
              ) : (
                <>
                  <Field
                    label="Price Range"
                    value={
                      p.priceMin !== undefined || p.priceMax !== undefined
                        ? `€${p.priceMin ?? 0} - €${p.priceMax ?? "∞"}`
                        : "Not Specified"
                    }
                  />
                </>
              )}

              <Field label="Deal Type" value={formatDealType(p.dealType, p.intent)} />
              <Field
                label="Surface Area (sqm)"
                value={formatRange(p.sqmMin, p.sqmMax)}
              />

              <Field label="Bedrooms" value={p.bedrooms} />
              <Field label="Bathrooms" value={p.bathrooms} />
              <Field label="Property Type" value={p.propertyType} />
              <Field label="Orientation" value={p.orientation} />
              <Field label="View" value={p.view} />
              <Field label="Energy Class" value={p.energyClass} />
              <Field label="Furnished" value={yesNo(p.furnished)} />
              <Field label="Parking" value={yesNo(p.parking)} />
              <Field label="Storage" value={yesNo(p.hasStorage)} />
              <Field label="Elevator" value={yesNo(p.elevator)} />
              <Field label="Pets Allowed" value={yesNo(p.petsAllowed)} />
              <Field label="Smoking Allowed" value={yesNo(p.smokingAllowed)} />
              <Field label="Year Built (Min)" value={p.yearBuiltMin} />
              <Field label="Heating Type" value={p.heatingType} />
              <Field label="Minimum Floor" value={p.floorMin} />
              <Field label="Lease Duration" value={p.leaseDuration} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
