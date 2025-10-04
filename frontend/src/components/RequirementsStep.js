import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

export default function RequirementsStep({ prefs, onChange, errors }) {
  return (
    <>
      {/* Location */}
      <Form.Group className="mb-3">
        <Form.Label>Preferred Location</Form.Label>
        <Form.Control
          type="text"
          name="location"
          value={prefs.location}
          onChange={onChange}
          isInvalid={!!errors.location}
        />
        <Form.Control.Feedback type="invalid">
          {errors.location}
        </Form.Control.Feedback>
      </Form.Group>

      {/* Deal Type */}
      <Form.Group className="mb-3">
        <Form.Label>Deal Type</Form.Label>
        <Form.Select
          name="dealType"
          value={prefs.dealType}
          onChange={onChange}
        >
          <option value="rent">Rent</option>
          <option value="sale">Buy</option>
        </Form.Select>
      </Form.Group>

      {/* Rent or Price */}
      {prefs.dealType === 'rent' ? (
        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Min Rent (€)</Form.Label>
              <Form.Control
                type="number"
                name="rentMin"
                value={prefs.rentMin}
                onChange={onChange}
                isInvalid={!!errors.rentMin}
              />
              <Form.Control.Feedback type="invalid">
                {errors.rentMin}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Max Rent (€)</Form.Label>
              <Form.Control
                type="number"
                name="rentMax"
                value={prefs.rentMax}
                onChange={onChange}
              />
            </Form.Group>
          </Col>
        </Row>
      ) : (
        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Min Price (€)</Form.Label>
              <Form.Control
                type="number"
                name="priceMin"
                value={prefs.priceMin}
                onChange={onChange}
                isInvalid={!!errors.priceMin}
              />
              <Form.Control.Feedback type="invalid">
                {errors.priceMin}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Max Price (€)</Form.Label>
              <Form.Control
                type="number"
                name="priceMax"
                value={prefs.priceMax}
                onChange={onChange}
              />
            </Form.Group>
          </Col>
        </Row>
      )}

      {/* Sqm range */}
      <Row>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Min Sqm</Form.Label>
            <Form.Control
              type="number"
              name="sqmMin"
              value={prefs.sqmMin}
              onChange={onChange}
              isInvalid={!!errors.sqmMin}
            />
            <Form.Control.Feedback type="invalid">
              {errors.sqmMin}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Max Sqm</Form.Label>
            <Form.Control
              type="number"
              name="sqmMax"
              value={prefs.sqmMax}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
      </Row>

      {/* Bedrooms & Bathrooms */}
      <Row>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Bedrooms</Form.Label>
            <Form.Control
              type="number"
              name="bedrooms"
              value={prefs.bedrooms}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Bathrooms</Form.Label>
            <Form.Control
              type="number"
              name="bathrooms"
              value={prefs.bathrooms}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
      </Row>

      {/* Lease duration (only for rent) */}
      {prefs.dealType === 'rent' && (
        <Form.Group className="mb-3">
          <Form.Label>Lease Duration</Form.Label>
          <Form.Select
            name="leaseDuration"
            value={prefs.leaseDuration}
            onChange={onChange}
            isInvalid={!!errors.leaseDuration}
          >
            <option value="">Select...</option>
            <option value="short">Short-term (&lt; 12 months)</option>
            <option value="long">Long-term (&ge; 12 months)</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.leaseDuration}
          </Form.Control.Feedback>
        </Form.Group>
      )}

      {/* Floor */}
      <Form.Group className="mb-3">
        <Form.Label>Floor</Form.Label>
        <Form.Control
          type="number"
          name="floor"
          value={prefs.floor}
          onChange={onChange}
        />
      </Form.Group>

      {/* Elevator */}
      <Form.Group className="mb-3">
        <Form.Label>Elevator</Form.Label>
        <Form.Select
          name="elevator"
          value={prefs.elevator ?? ''}
          onChange={onChange}
        >
          <option value="">I don't mind</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Form.Select>
      </Form.Group>

      {/* Parking */}
      <Form.Group className="mb-3">
        <Form.Label>Parking</Form.Label>
        <Form.Select
          name="parking"
          value={prefs.parking ?? ''}
          onChange={onChange}
        >
          <option value="">I don't mind</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Form.Select>
      </Form.Group>

      {/* Furnished */}
      <Form.Group className="mb-3">
        <Form.Label>Furnished</Form.Label>
        <Form.Select
          name="furnished"
          value={prefs.furnished ?? ''}
          onChange={onChange}
        >
          <option value="">I don't mind</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Form.Select>
      </Form.Group>

      {/* Pets allowed */}
      <Form.Group className="mb-3">
        <Form.Label>Pets Allowed</Form.Label>
        <Form.Select
          name="petsAllowed"
          value={prefs.petsAllowed ?? ''}
          onChange={onChange}
        >
          <option value="">I don't mindr</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Form.Select>
      </Form.Group>

      {/* Smoking allowed */}
      <Form.Group className="mb-3">
        <Form.Label>Smoking Allowed</Form.Label>
        <Form.Select
          name="smokingAllowed"
          value={prefs.smokingAllowed ?? ''}
          onChange={onChange}
        >
          <option value="">I don't mind</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Form.Select>
      </Form.Group>

      {/* Heating */}
      <Form.Group className="mb-3">
        <Form.Label>Heating</Form.Label>
        <Form.Control
          type="text"
          name="heating"
          value={prefs.heating}
          onChange={onChange}
        />
      </Form.Group>
    </>
  );
}
