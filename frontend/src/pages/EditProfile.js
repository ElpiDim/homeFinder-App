// src/pages/EditProfile.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "api";
import TriStateSelect from "../components/TristateSelect";

const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) =>
        v !== undefined &&
        v !== null &&
        v !== "" &&
        !(typeof v === "number" && isNaN(v))
    )
  );

const toNumOrUndef = (v) =>
  v === "" || v === null || v === undefined ? undefined : Number(v);

const ensureRange = (min, max) => {
  const vmin = toNumOrUndef(min);
  const vmax = toNumOrUndef(max);
  if (vmin !== undefined && vmax !== undefined && vmin > vmax) {
    return { min: vmax, max: vmin }; // swap
  }
  return { min: vmin, max: vmax };
};

const Label = ({ children }) => (
  <div className="text-uppercase text-muted small fw-semibold mb-1">
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h6 className="fw-bold text-primary mb-4">{children}</h6>
);

const YesNoSelect = ({ label, name, value, onChange }) => (
  <div className="col-md-4">
    <Label>{label}</Label>
    <select
      className="form-select"
      name={name}
      value={value ? "yes" : "no"}
      onChange={(e) => {
        const nextBool = e.target.value === "yes";
        // fake event so we can reuse onChange(setter)
        onChange({ target: { name, value: nextBool, type: "custom" } });
      }}
    >
      <option value="no">No</option>
      <option value="yes">Yes</option>
    </select>
  </div>
);

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === "client";

  // Personal
  const [personal, setPersonal] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    age: user?.age ?? "",
    householdSize: user?.householdSize ?? "",
    hasFamily: !!user?.hasFamily,
    hasPets: !!user?.hasPets,
    smoker: !!user?.smoker,
    occupation: user?.occupation || "",
    salary: user?.salary ?? "",
    isWillingToHaveRoommate: !!user?.isWillingToHaveRoommate,
  });

  // Preferences (Client only)
  const [prefs, setPrefs] = useState({
    dealType:
      user?.preferences?.dealType ||
      (user?.preferences?.intent === "buy" ? "sale" : "rent"),
    location: user?.preferences?.location || "",
    rentMin: user?.preferences?.rentMin ?? "",
    rentMax: user?.preferences?.rentMax ?? "",
    priceMin: user?.preferences?.priceMin ?? "",
    priceMax: user?.preferences?.priceMax ?? "",
    sqmMin: user?.preferences?.sqmMin ?? "",
    sqmMax: user?.preferences?.sqmMax ?? "",
    bedrooms: user?.preferences?.bedrooms ?? "",
    bathrooms: user?.preferences?.bathrooms ?? "",
    furnished: user?.preferences?.furnished ?? null,
    petsAllowed: user?.preferences?.petsAllowed ?? null,
    smokingAllowed: user?.preferences?.smokingAllowed ?? null,
    heatingType: user?.preferences?.heatingType || "",
    yearBuiltMin: user?.preferences?.yearBuiltMin ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "custom") setter((s) => ({ ...s, [name]: value }));
    else if (type === "checkbox") setter((s) => ({ ...s, [name]: checked }));
    else setter((s) => ({ ...s, [name]: value }));
  };

  const validateClient = () => {
    const e = {};
    const pairs = [
      ["rentMin", "rentMax"],
      ["priceMin", "priceMax"],
      ["sqmMin", "sqmMax"],
    ];
    pairs.forEach(([mi, ma]) => {
      const { min, max } = ensureRange(prefs[mi], prefs[ma]);
      if (min !== undefined && max !== undefined && min > max) {
        e[mi] = "Min should be ≤ Max";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("You need to be logged in.");
    if (isClient && !validateClient()) return;

    setSaving(true);
    try {
      let payload;

      if (isClient) {
        const intent = prefs.dealType === "sale" ? "buy" : "rent";
        const rent = ensureRange(prefs.rentMin, prefs.rentMax);
        const price = ensureRange(prefs.priceMin, prefs.priceMax);
        const sqm = ensureRange(prefs.sqmMin, prefs.sqmMax);

        const personalClean = clean({
          name: personal.name,
          phone: personal.phone,
          age: toNumOrUndef(personal.age),
          householdSize: toNumOrUndef(personal.householdSize),
          hasFamily: personal.hasFamily,
          hasPets: personal.hasPets,
          smoker: personal.smoker,
          occupation: personal.occupation,
          salary: toNumOrUndef(personal.salary),
          isWillingToHaveRoommate: personal.isWillingToHaveRoommate,
        });

        const prefsClean = clean({
          dealType: prefs.dealType,
          intent,
          location: prefs.location,
          ...(intent === "rent"
            ? { rentMin: rent.min, rentMax: rent.max }
            : { priceMin: price.min, priceMax: price.max }),
          sqmMin: sqm.min,
          sqmMax: sqm.max,
          bedrooms: toNumOrUndef(prefs.bedrooms),
          bathrooms: toNumOrUndef(prefs.bathrooms),
          furnished: prefs.furnished === null ? undefined : !!prefs.furnished,
          petsAllowed: prefs.petsAllowed === null ? undefined : !!prefs.petsAllowed,
          smokingAllowed:
            prefs.smokingAllowed === null ? undefined : !!prefs.smokingAllowed,
          heatingType: prefs.heatingType || undefined,
          yearBuiltMin: toNumOrUndef(prefs.yearBuiltMin),
        });

        payload = clean({ ...personalClean, preferences: prefsClean });
      } else {
        payload = clean({
          name: personal.name,
          phone: personal.phone,
        });
      }

      const { data } = await api.patch("/users/me", payload);
      const updated = data?.user || data;
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      navigate("/profile", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      alert(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container-fluid py-4">
        <div className="card border-0 shadow-sm">
          <div className="card-body">Loading…</div>
        </div>
      </div>
    );
  }

  const isRent = prefs.dealType !== "sale";

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Edit Profile</h3>
          <div className="text-muted">
            Update your personal information and housing preferences
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-light border rounded-pill px-4"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn rounded-pill px-4"
            style={{
              background: "#7b2ff7",
              color: "#fff",
              fontWeight: 600,
            }}
            onClick={() => {
              // trigger form submit programmatically
              const form = document.getElementById("editProfileForm");
              form?.requestSubmit?.();
            }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

        <form id="editProfileForm" onSubmit={handleSubmit}>
          {/* PERSONAL INFORMATION */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <SectionTitle>👤 PERSONAL INFORMATION</SectionTitle>

              <div className="row g-4">
                <div className="col-md-4">
                  <Label>Name</Label>
                  <input
                    className="form-control"
                    name="name"
                    value={personal.name}
                    onChange={onChange(setPersonal)}
                  />
                </div>

                <div className="col-md-4">
                  <Label>Email</Label>
                  <input
                    className="form-control"
                    value={user.email || ""}
                    disabled
                    readOnly
                  />
                </div>

                <div className="col-md-4">
                  <Label>Phone</Label>
                  <input
                    className="form-control"
                    name="phone"
                    value={personal.phone}
                    onChange={onChange(setPersonal)}
                  />
                </div>

                {isClient && (
                  <>
                    <div className="col-md-4">
                      <Label>Age</Label>
                      <input
                        type="number"
                        className="form-control"
                        name="age"
                        value={personal.age}
                        onChange={onChange(setPersonal)}
                      />
                    </div>

                    <div className="col-md-4">
                      <Label>Household Size</Label>
                      <input
                        type="number"
                        className="form-control"
                        name="householdSize"
                        value={personal.householdSize}
                        onChange={onChange(setPersonal)}
                        placeholder="e.g. 1"
                      />
                    </div>

                    <YesNoSelect
                      label="Has Family"
                      name="hasFamily"
                      value={personal.hasFamily}
                      onChange={onChange(setPersonal)}
                    />
                    <YesNoSelect
                      label="Has Pets"
                      name="hasPets"
                      value={personal.hasPets}
                      onChange={onChange(setPersonal)}
                    />
                    <YesNoSelect
                      label="Smoker"
                      name="smoker"
                      value={personal.smoker}
                      onChange={onChange(setPersonal)}
                    />
                    <YesNoSelect
                      label="Willing to Have Roommate"
                      name="isWillingToHaveRoommate"
                      value={personal.isWillingToHaveRoommate}
                      onChange={onChange(setPersonal)}
                    />

                    <div className="col-md-4">
                      <Label>Occupation</Label>
                      <input
                        className="form-control"
                        name="occupation"
                        value={personal.occupation}
                        onChange={onChange(setPersonal)}
                      />
                    </div>

                    <div className="col-md-4">
                      <Label>Annual Salary (€)</Label>
                      <input
                        type="number"
                        className="form-control"
                        name="salary"
                        value={personal.salary}
                        onChange={onChange(setPersonal)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* HOUSING PREFERENCES */}
          {isClient && (
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <SectionTitle>🏠 HOUSING PREFERENCES</SectionTitle>

                <div className="row g-4">
                  <div className="col-md-4">
                    <Label>Preferred Location</Label>
                    <input
                      className="form-control"
                      name="location"
                      value={prefs.location}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  {isRent ? (
                    <>
                      <div className="col-md-4">
                        <Label>Rent Min (€)</Label>
                        <input
                          type="number"
                          className={`form-control ${errors.rentMin ? "is-invalid" : ""}`}
                          name="rentMin"
                          value={prefs.rentMin}
                          onChange={onChange(setPrefs)}
                        />
                        {errors.rentMin && (
                          <div className="invalid-feedback">{errors.rentMin}</div>
                        )}
                      </div>

                      <div className="col-md-4">
                        <Label>Rent Max (€)</Label>
                        <input
                          type="number"
                          className="form-control"
                          name="rentMax"
                          value={prefs.rentMax}
                          onChange={onChange(setPrefs)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-md-4">
                        <Label>Purchase Min (€)</Label>
                        <input
                          type="number"
                          className={`form-control ${errors.priceMin ? "is-invalid" : ""}`}
                          name="priceMin"
                          value={prefs.priceMin}
                          onChange={onChange(setPrefs)}
                        />
                        {errors.priceMin && (
                          <div className="invalid-feedback">{errors.priceMin}</div>
                        )}
                      </div>

                      <div className="col-md-4">
                        <Label>Purchase Max (€)</Label>
                        <input
                          type="number"
                          className="form-control"
                          name="priceMax"
                          value={prefs.priceMax}
                          onChange={onChange(setPrefs)}
                        />
                      </div>

                      <div className="col-md-4">
                        <Label>—</Label>
                        <div className="form-control bg-light text-muted">Buying</div>
                      </div>
                    </>
                  )}

                  <div className="col-md-4">
                    <Label>Sqm Min</Label>
                    <input
                      type="number"
                      className={`form-control ${errors.sqmMin ? "is-invalid" : ""}`}
                      name="sqmMin"
                      value={prefs.sqmMin}
                      onChange={onChange(setPrefs)}
                    />
                    {errors.sqmMin && (
                      <div className="invalid-feedback">{errors.sqmMin}</div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <Label>Sqm Max</Label>
                    <input
                      type="number"
                      className="form-control"
                      name="sqmMax"
                      value={prefs.sqmMax}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  <div className="col-md-4">
                    <Label>Bedrooms</Label>
                    <input
                      type="number"
                      className="form-control"
                      name="bedrooms"
                      value={prefs.bedrooms}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  <div className="col-md-4">
                    <Label>Bathrooms</Label>
                    <input
                      type="number"
                      className="form-control"
                      name="bathrooms"
                      value={prefs.bathrooms}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  {/* Tri-state dropdowns (as in screenshot "Not Specified") */}
                  <div className="col-md-4">
                    <TriStateSelect
                      label="Furnished"
                      name="furnished"
                      value={prefs.furnished}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  <div className="col-md-4">
                    <TriStateSelect
                      label="Pets Allowed"
                      name="petsAllowed"
                      value={prefs.petsAllowed}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  <div className="col-md-4">
                    <TriStateSelect
                      label="Smoking Allowed"
                      name="smokingAllowed"
                      value={prefs.smokingAllowed}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  <div className="col-md-4">
                    <Label>Year Built (Min)</Label>
                    <input
                      type="number"
                      className="form-control"
                      name="yearBuiltMin"
                      value={prefs.yearBuiltMin}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  <div className="col-md-4">
                    <Label>Heating Type</Label>
                    <select
                      className="form-select"
                      name="heatingType"
                      value={prefs.heatingType}
                      onChange={onChange(setPrefs)}
                    >
                      <option value="">Not Specified</option>
                      <option value="autonomous">Autonomous</option>
                      <option value="central">Central</option>
                      <option value="ac">AC</option>
                      <option value="none">None</option>
                    </select>
                  </div>

                  {/* Deal Type hidden UI but preserved logic */}
                  <div className="col-md-4">
                    <Label>Deal Type</Label>
                    <select
                      className="form-select"
                      name="dealType"
                      value={prefs.dealType}
                      onChange={onChange(setPrefs)}
                    >
                      <option value="rent">Renting</option>
                      <option value="sale">Buying</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
          )}
        </form>
    </div>
  );
}
