import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import TriStateSelect from './TristateSelect';

export default function RequirementsStep({ prefs, onChange, errors = {} }) {
  const isRent = prefs.dealType !== 'sale';

  return (
    <>
      <h4 className="mb-4 text-center">Step 2: What are you looking for?</h4>

      <Row className="g-3">
        <Col md={12}>
          <Form.Group>
            <Form.Label>I’m interested in</Form.Label>
            <div className="d-flex gap-4">
              <Form.Check
                type="radio"
                id="dealType-rent"
                name="dealType"
                value="rent"
                label="Renting"
                checked={prefs.dealType === 'rent'}
                onChange={onChange}
              />
              <Form.Check
                type="radio"
                id="dealType-sale"
                name="dealType"
                value="sale"
                label="Buying"
                checked={prefs.dealType === 'sale'}
                onChange={onChange}
              />
            </div>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>Location</Form.Label>
            <Form.Control
              name="location"
              value={prefs.location}
              onChange={onChange}
              placeholder="e.g., Athens, Center"
              isInvalid={!!errors.location}
            />
            <Form.Control.Feedback type="invalid">{errors.location}</Form.Control.Feedback>
          </Form.Group>
        </Col>

        {isRent ? (
          <>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Rent Min (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="rentMin"
                  value={prefs.rentMin}
                  onChange={onChange}
                  isInvalid={!!errors.rentMin}
                />
                <Form.Control.Feedback type="invalid">{errors.rentMin}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Rent Max (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="rentMax"
                  value={prefs.rentMax}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
          </>
        ) : (
          <>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Purchase Min (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="priceMin"
                  value={prefs.priceMin}
                  onChange={onChange}
                  isInvalid={!!errors.priceMin}
                />
                <Form.Control.Feedback type="invalid">{errors.priceMin}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Purchase Max (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="priceMax"
                  value={prefs.priceMax}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
          </>
        )}
      </Row>

      <Row className="g-3 mt-1">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Sqm Min</Form.Label>
            <Form.Control
              type="number"
              name="sqmMin"
              value={prefs.sqmMin}
              onChange={onChange}
              isInvalid={!!errors.sqmMin}
            />
            <Form.Control.Feedback type="invalid">{errors.sqmMin}</Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Sqm Max</Form.Label>
            <Form.Control
              type="number"
              name="sqmMax"
              value={prefs.sqmMax}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Bedrooms</Form.Label>
            <Form.Control
              type="number"
              name="bedrooms"
              value={prefs.bedrooms}
              onChange={onChange}
              min={0}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Bathrooms</Form.Label>
            <Form.Control
              type="number"
              name="bathrooms"
              value={prefs.bathrooms}
              onChange={onChange}
              min={0}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col md={3}>
          <TriStateSelect
            label="Parking"
            name="parking"
            value={prefs.parking}
            onChange={onChange}
          />
        </Col>
        <Col md={3}>
          <TriStateSelect
            label="Pets allowed"
            name="petsAllowed"
            value={prefs.petsAllowed}
            onChange={onChange}
          />
        </Col>
        <Col md={3}>
          <TriStateSelect
            label="Smoking allowed"
            name="smokingAllowed"
            value={prefs.smokingAllowed}
            onChange={onChange}
          />
        </Col>
        <Col md={3}>
          <TriStateSelect
            label="Furnished"
            name="furnished"
            value={prefs.furnished}
            onChange={onChange}
          />
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Heating (optional)</Form.Label>
            <Form.Control
              name="heating"
              value={prefs.heating}
              onChange={onChange}
              placeholder="e.g., natural gas, heat pump"
            />
          </Form.Group>
        </Col>
      </Row>
    </>
  );
}