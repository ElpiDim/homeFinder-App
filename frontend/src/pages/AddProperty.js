nd/src/pages/CreateProperty.jsx
Νέο
+307
-0

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function AddProperty() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    address: "",
    price: "",
    type: "rent",
    status: "available",
    sqm: "",
    bedrooms: "",
    bathrooms: "",
  });

  const [tenantReq, setTenantReq] = useState({
    minTenantSalary: "",
    allowedOccupations: "",
    requiresFamily: false,
    allowsSmokers: false,
    allowsPets: false,
    maxOccupants: "",
  });

  const [images, setImages] = useState([]);
  const [floorPlanImage, setFloorPlanImage] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTenantChange = (e) => {
    const { name, type, value, checked } = e.target;
    setTenantReq((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== "" && value !== null) {
        const apiKey = key === "sqm" ? "squareMeters" : key;
        data.append(apiKey, value);
      }
    });

    images.forEach((file) => data.append("images", file));
    if (floorPlanImage) data.append("floorPlanImage", floorPlanImage);

    Object.entries(tenantReq).forEach(([key, value]) => {
      if (key === "allowedOccupations") {
        value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .forEach((v) => data.append(`tenantRequirements[allowedOccupations]`, v));
      } else if (value !== "" && value !== null) {
        const v = typeof value === "boolean" ? (value ? "true" : "false") : value;
        data.append(`tenantRequirements[${key}]`, v);
      }
    });

    try {
      await api.post("/properties", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to create property");
    }
  };

  return (
    <div className="container py-4">
      <h1 className="mb-4">Create Property</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input
            className="form-control"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            name="description"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Location</label>
            <input
              className="form-control"
              name="location"
              value={form.location}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Address</label>
            <input
              className="form-control"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="row g-3 mt-0">
          <div className="col-md-4">
            <label className="form-label">Price</label>
            <input
              type="number"
              className="form-control"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="rent">Rent</option>
              <option value="sale">Sale</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>

        <div className="row g-3 mt-0">
          <div className="col-md-3">
            <label className="form-label">Sqm</label>
            <input
              type="number"
              className="form-control"
              name="sqm"
              value={form.sqm}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Bedrooms</label>
            <input
              type="number"
              className="form-control"
              name="bedrooms"
              value={form.bedrooms}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Bathrooms</label>
            <input
              type="number"
              className="form-control"
              name="bathrooms"
              value={form.bathrooms}
              onChange={handleChange}
            />
          </div>
        </div>

        <hr className="my-4" />
        <h5>Media</h5>
        <div className="mb-3">
          <label className="form-label">Images</label>
          <input
            type="file"
            multiple
            className="form-control"
            onChange={(e) => setImages(Array.from(e.target.files))}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Floor Plan Image</label>
          <input
            type="file"
            className="form-control"
            onChange={(e) => setFloorPlanImage(e.target.files?.[0] || null)}
          />
        </div>

        <hr className="my-4" />
        <h5>Tenant Requirements</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Min Tenant Salary</label>
            <input
              type="number"
              className="form-control"
              name="minTenantSalary"
              value={tenantReq.minTenantSalary}
              onChange={handleTenantChange}
            />
          </div>
          <div className="col-md-8">
            <label className="form-label">Allowed Occupations (comma separated)</label>
            <input
              className="form-control"
              name="allowedOccupations"
              value={tenantReq.allowedOccupations}
              onChange={handleTenantChange}
            />
          </div>
        </div>
        <div className="form-check mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="requiresFamily"
            name="requiresFamily"
            checked={tenantReq.requiresFamily}
            onChange={handleTenantChange}
          />
          <label className="form-check-label" htmlFor="requiresFamily">
            Requires Family
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="allowsSmokers"
            name="allowsSmokers"
            checked={tenantReq.allowsSmokers}
            onChange={handleTenantChange}
          />
          <label className="form-check-label" htmlFor="allowsSmokers">
            Allows Smokers
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="allowsPets"
            name="allowsPets"
            checked={tenantReq.allowsPets}
            onChange={handleTenantChange}
          />
          <label className="form-check-label" htmlFor="allowsPets">
            Allows Pets
          </label>
        </div>
        <div className="mb-3 mt-3">
          <label className="form-label">Max Occupants</label>
          <input
            type="number"
            className="form-control"
            name="maxOccupants"
            value={tenantReq.maxOccupants}
            onChange={handleTenantChange}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
