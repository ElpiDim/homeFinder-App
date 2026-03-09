import React from 'react';
import { Form, Row, Col, ButtonGroup, ToggleButton } from 'react-bootstrap';
import './RequirementsStep.css';
import './OnboardingStepLayout.css';

const normalizeValue = (value) => {
  if (value === undefined || value === null || value === '') return 'any';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const amenityFields = [
  { name: 'parking', label: 'Parking', helper: 'Reserved spot or garage access' },
  { name: 'furnished', label: 'Furnished', helper: 'Move-in ready with furniture' },
  { name: 'hasStorage', label: 'Storage', helper: 'Extra storage room or basement space' },
  { name: 'petsAllowed', label: 'Pet friendly', helper: 'Welcomes cats, dogs & more' },
  { name: 'smokingAllowed', label: 'Smoking policy', helper: 'Clarify if smoking is allowed' },
  { name: 'elevator', label: 'Elevator', helper: 'Easy access to upper floors' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio_flat', label: 'Studio Flat' },
  { value: 'maisonette', label: 'Maisonette' },
  { value: 'detached_house', label: 'Detached House' },
  { value: 'villa', label: 'Villa' },
  { value: 'loft', label: 'Loft' },
  { value: 'bungalow', label: 'Bungalow' },
];

const ORIENTATION_OPTIONS = [
  { value: '', label: 'Any orientation' },
  { value: 'north', label: 'North' },
  { value: 'north-east', label: 'North-East' },
  { value: 'east', label: 'East' },
  { value: 'south-east', label: 'South-East' },
  { value: 'south', label: 'South' },
  { value: 'south-west', label: 'South-West' },
  { value: 'west', label: 'West' },
  { value: 'north-west', label: 'North-West' },
];

const VIEW_OPTIONS = [
  { value: '', label: 'Any view' },
  { value: 'sea', label: 'Sea' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'park', label: 'Park' },
  { value: 'city', label: 'City' },
  { value: 'none', label: 'No specific view' },
];

const ENERGY_CLASS_OPTIONS = [
  { value: '', label: 'Any class' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B+', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' },
];


export default function RequirementsStep({ prefs, onChange, errors }) {
  const handleToggle = (name, value) => {
    const nextValue = value === 'any' ? '' : value;
    onChange({
      target: {
        name,
        value: nextValue,
        type: 'custom',
      },
    });
  };

  return (
    <div className="onboarding-step">
      {/* LOCATION & DEAL SECTION */}
      <section className="onboarding-section">
        <header className="section-header">
          <h5 className="section-title">Location &amp; deal</h5>
          <p className="section-description">
            Tell us where you&apos;re looking and how you plan to move forward.
          </p>
        </header>

        {/* Preferred location */}
        <Form.Group className="mb-3">
          <Form.Label className="field-label">Preferred location</Form.Label>
          <Form.Control
            type="text"
            name="location"
            value={prefs.location}
            onChange={onChange}
            isInvalid={!!errors.location}
            placeholder="e.g. Athens"
          />
          <Form.Control.Feedback type="invalid">{errors.location}</Form.Control.Feedback>
        </Form.Group>

        {/* Deal type toggle */}
        <div className="segmented-field mt-4">
          <span className="field-label">Deal type</span>
          <ButtonGroup className="tile-button-group" role="group">
            {[
              { value: 'rent', label: 'Rent' },
              { value: 'sale', label: 'Buy' },
            ].map((option) => (
              <ToggleButton
                key={option.value}
                id={`dealType-${option.value}`}
                type="radio"
                variant="outline-success"
                name="dealType"
                value={option.value}
                checked={normalizeValue(prefs.dealType) === option.value}
                onChange={() => handleToggle('dealType', option.value)}
                className="tile-button"
              >
                {option.label}
              </ToggleButton>
            ))}
          </ButtonGroup>
        </div>
      </section>

      {/* BUDGET & SIZE SECTION */}
      <section className="onboarding-section">
        <header className="section-header">
          <h5 className="section-title">Budget &amp; size</h5>
          <p className="section-description">
            Set comfortable ranges so we can surface the best-matched homes.
          </p>
        </header>

        {prefs.dealType === 'rent' ? (
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="field-label">Min rent (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="rentMin"
                  value={prefs.rentMin}
                  onChange={onChange}
                  isInvalid={!!errors.rentMin}
                  placeholder="Optional"
                  min={0}
                  inputMode="numeric"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.rentMin}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="field-label">Max rent (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="rentMax"
                  value={prefs.rentMax}
                  onChange={onChange}
                  placeholder="Optional"
                  min={0}
                  inputMode="numeric"
                />
              </Form.Group>
            </Col>
          </Row>
        ) : (
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="field-label">Min price (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="priceMin"
                  value={prefs.priceMin}
                  onChange={onChange}
                  isInvalid={!!errors.priceMin}
                  placeholder="Optional"
                  min={0}
                  inputMode="numeric"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.priceMin}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="field-label">Max price (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="priceMax"
                  value={prefs.priceMax}
                  onChange={onChange}
                  placeholder="Optional"
                  min={0}
                  inputMode="numeric"
                />
              </Form.Group>
            </Col>
          </Row>
        )}

        <Row className="g-3 mt-1">
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label className="field-label">Min area (m²)</Form.Label>
              <Form.Control
                type="number"
                name="sqmMin"
                value={prefs.sqmMin}
                onChange={onChange}
                isInvalid={!!errors.sqmMin}
                placeholder="Optional"
                min={0}
                inputMode="numeric"
              />
              <Form.Control.Feedback type="invalid">
                {errors.sqmMin}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label className="field-label">Max area (m²)</Form.Label>
              <Form.Control
                type="number"
                name="sqmMax"
                value={prefs.sqmMax}
                onChange={onChange}
                placeholder="Optional"
                min={0}
                inputMode="numeric"
              />
            </Form.Group>
          </Col>
        </Row>
      </section>

      {/* LIVING DETAILS SECTION */}
      <section className="onboarding-section">
        <header className="section-header">
          <h5 className="section-title">Living details</h5>
          <p className="section-description">
            Share a few essentials about the space you have in mind.
          </p>
        </header>

        <Row className="g-3">
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Bedrooms</Form.Label>
              <Form.Control
                type="number"
                name="bedrooms"
                value={prefs.bedrooms}
                onChange={onChange}
                placeholder="Any"
                min={0}
                inputMode="numeric"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Bathrooms</Form.Label>
              <Form.Control
                type="number"
                name="bathrooms"
                value={prefs.bathrooms}
                onChange={onChange}
                placeholder="Any"
                min={0}
                inputMode="numeric"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Property type</Form.Label>
              <Form.Select name="propertyType" value={prefs.propertyType} onChange={onChange}>
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Minimum floor</Form.Label>
              <Form.Control
                type="number"
                name="floorMin"
                value={prefs.floorMin}
                onChange={onChange}
                placeholder="Any"
                inputMode="numeric"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Heating type</Form.Label>
              <Form.Select
                name="heatingType"
                value={prefs.heatingType}
                onChange={onChange}
              >
                <option value="">Any</option>
                <option value="autonomous">Autonomous</option>
                <option value="central">Central</option>
                <option value="ac">AC</option>
                <option value="none">No heating</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Orientation</Form.Label>
              <Form.Select name="orientation" value={prefs.orientation} onChange={onChange}>
                {ORIENTATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">View</Form.Label>
              <Form.Select name="view" value={prefs.view} onChange={onChange}>
                {VIEW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Energy class</Form.Label>
              <Form.Select name="energyClass" value={prefs.energyClass} onChange={onChange}>
                {ENERGY_CLASS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {prefs.dealType === 'rent' && (
          <div className="segmented-field mt-3">
            <span className="field-label">Lease duration</span>
            <ButtonGroup className="tile-button-group" role="group">
              {[
                { value: 'short', label: 'Short stay (< 12 months)' },
                { value: 'long', label: 'Long term (≥ 12 months)' },
              ].map((option) => (
                <ToggleButton
                  key={option.value}
                  id={`leaseDuration-${option.value}`}
                  type="radio"
                  variant="outline-success"
                  name="leaseDuration"
                  value={option.value}
                  checked={normalizeValue(prefs.leaseDuration) === option.value}
                  onChange={() => handleToggle('leaseDuration', option.value)}
                  className="tile-button"
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ButtonGroup>
            {errors.leaseDuration && (
              <div className="invalid-feedback d-block">{errors.leaseDuration}</div>
            )}
          </div>
        )}
      </section>

{/* AMENITIES SECTION */}
<section className="onboarding-section">
  <header className="section-header">
    <h5 className="section-title">Amenities &amp; policies</h5>
    <p className="section-description">
      Choose which features and rules matter most to you.
    </p>
  </header>

  <div className="amenities-grid">
    {amenityFields.map((field) => (
      <div key={field.name} className="amenity-card">
        <Form.Group controlId={field.name}>
          <Form.Label className="field-label">
            {field.label}
          </Form.Label>
          {field.helper && (
            <Form.Text className="text-muted d-block mb-2 small">
              {field.helper}
            </Form.Text>
          )}
          <Form.Select
            name={field.name}
            value={normalizeValue(prefs[field.name])}
            onChange={(e) => handleToggle(field.name, e.target.value)}
          >
            <option value="any">I don't mind</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Form.Select>
        </Form.Group>
      </div>
    ))}
  </div>
</section>


    </div>
  );
}
