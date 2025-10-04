import React from 'react';
import { Form, Row, Col, ButtonGroup, ToggleButton } from 'react-bootstrap';
import './RequirementsStep.css';

const normalizeValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'any';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
};

const toggleOptions = [
  { value: 'any', label: 'Any' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const amenityFields = [
  {
    name: 'parking',
    label: 'Parking',
    helper: 'Reserved spot or garage access',
  },
  {
    name: 'furnished',
    label: 'Furnished',
    helper: 'Move-in ready with furniture',
  },
  {
    name: 'petsAllowed',
    label: 'Pet friendly',
    helper: 'Welcomes cats, dogs & more',
  },
  {
    name: 'smokingAllowed',
    label: 'Smoking policy',
    helper: 'Clarify if smoking is allowed',
  },
  {
    name: 'elevator',
    label: 'Elevator',
    helper: 'Easy access to upper floors',
  },
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
    <div className="requirements-step">
      <section className="requirements-section">
        <header className="section-header">
          <h5 className="section-title">Location &amp; deal</h5>
          <p className="section-description">
            Tell us where you&apos;re looking and how you plan to move forward.
          </p>
        </header>

        <Form.Group className="mb-3">
          <Form.Label className="field-label">Preferred location</Form.Label>
          <Form.Control
            type="text"
            name="location"
            value={prefs.location}
            onChange={onChange}
            isInvalid={!!errors.location}
            placeholder="e.g. Lisbon city center or Bairro Alto"
          />
          <Form.Control.Feedback type="invalid">
            {errors.location}
          </Form.Control.Feedback>
        </Form.Group>

        <div className="segmented-field">
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

      <section className="requirements-section">
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

      <section className="requirements-section">
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
              <Form.Label className="field-label">Preferred floor</Form.Label>
              <Form.Control
                type="number"
                name="floor"
                value={prefs.floor}
                onChange={onChange}
                placeholder="Any"
                inputMode="numeric"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Group>
              <Form.Label className="field-label">Heating</Form.Label>
              <Form.Control
                type="text"
                name="heating"
                value={prefs.heating}
                onChange={onChange}
                placeholder="e.g. Central, AC, Radiators"
              />
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
              <div className="invalid-feedback d-block">
                {errors.leaseDuration}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="requirements-section">
        <header className="section-header">
          <h5 className="section-title">Amenities &amp; policies</h5>
          <p className="section-description">
            Highlight the must-haves that make a place feel like home.
          </p>
        </header>

        <div className="amenities-grid">
          {amenityFields.map((field) => (
            <div key={field.name} className="amenity-item">
              <div className="amenity-header">
                <span className="amenity-title">{field.label}</span>
                {field.helper && (
                  <span className="amenity-helper">{field.helper}</span>
                )}
              </div>
              <ButtonGroup className="tile-button-group" role="group">
                {toggleOptions.map((option) => (
                  <ToggleButton
                    key={`${field.name}-${option.value}`}
                    id={`${field.name}-${option.value}`}
                    type="radio"
                    variant="outline-success"
                    name={field.name}
                    value={option.value}
                    checked={normalizeValue(prefs[field.name]) === option.value}
                    onChange={() => handleToggle(field.name, option.value)}
                    className="tile-button"
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ButtonGroup>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
