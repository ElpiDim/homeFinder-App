import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import TriStateSelect from './TristateSelect';

export default function RequirementsStep({ prefs, onChange, errors = {} }) {
  const isRent = prefs.dealType !== 'sale';

  return (
    <>
      <h4 className="mb-4 text-center fw-semibold">Step 2: What are you looking for?</h4>

      <Row className="gy-3 gx-2">
        <Col xs={12}>
          <Form.Group>
            <Form.Label className="fw-semibold">I’m interested in</Form.Label>
            <div className="d-flex flex-wrap gap-3">
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

        <Col xs={12} sm={6}>
          <Form.Group>
            <Form.Label className="fw-semibold">Location</Form.Label>
            <Form.Control
              name="location"
              value={prefs.location}
              onChange={onChange}
              placeholder="e.g., Athens, Center"
              isInvalid={!!errors.location}
            />
            <Form.Control.Feedback type="invalid">
              {errors.location}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        {isRent ? (
          <>
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Rent Min (€)</Form.Label>
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
            <Col xs={12} sm={6} md={3}>
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
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label>Lease Duration</Form.Label>
                <Form.Select
                  name="leaseDuration"
                  value={prefs.leaseDuration || ''}
                  onChange={onChange}
                  isInvalid={!!errors.leaseDuration}
                >
                  <option value="">Select...</option>
                  <option value="short">Short-term</option>
                  <option value="long">Long-term</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.leaseDuration}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </>
        ) : (
          <>
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Purchase Min (€)</Form.Label>
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
            <Col xs={12} sm={6} md={3}>
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

      <Row className="gy-3 gx-2 mt-1">
        <Col xs={12} sm={6} md={3}>
          <Form.Group>
            <Form.Label>Sqm Min</Form.Label>
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
        <Col xs={12} sm={6} md={3}>
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
        <Col xs={12} sm={6} md={3}>
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
        <Col xs={12} sm={6} md={3}>
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

      <Row className="gy-3 gx-2 mt-1">
        <Col xs={12} sm={6} md={3}>
          <Form.Group>
            <Form.Label>Floor</Form.Label>
            <Form.Control
              type="number"
              name="floor"
              value={prefs.floor || ''}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Form.Group>
            <Form.Label>Elevator</Form.Label>
            <Form.Select
              name="elevator"
              value={
                prefs.elevator === null || prefs.elevator === undefined
                  ? ''
                  : prefs.elevator
                  ? 'yes'
                  : 'no'
              }
              onChange={(e) =>
                onChange({
                  target: {
                    name: 'elevator',
                    value:
                      e.target.value === ''
                        ? null
                        : e.target.value === 'yes',
                    type: 'custom',
                  },
                })
              }
            >
              <option value="">Doesn't matter</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <TriStateSelect
            label="Parking"
            name="parking"
            value={prefs.parking}
            onChange={onChange}
          />
        </Col>
        <Col xs={12} sm={6} md={3}>
          <TriStateSelect
            label="Furnished"
            name="furnished"
            value={prefs.furnished}
            onChange={onChange}
          />
        </Col>
      </Row>

      <Row className="gy-3 gx-2 mt-1">
        <Col xs={12} sm={6} md={3}>
          <TriStateSelect
            label="Pets allowed"
            name="petsAllowed"
            value={prefs.petsAllowed}
            onChange={onChange}
          />
        </Col>
        <Col xs={12} sm={6} md={3}>
          <TriStateSelect
            label="Smoking allowed"
            name="smokingAllowed"
            value={prefs.smokingAllowed}
            onChange={onChange}
          />
        </Col>
        <Col xs={12} sm={6} md={3}>
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
        <Col xs={12} sm={6} md={3}>
          <Form.Group>
            <Form.Label>Energy Class (optional)</Form.Label>
            <Form.Control
              name="energyClass"
              value={prefs.energyClass || ''}
              onChange={onChange}
              placeholder="e.g., A+, B, C"
            />
          </Form.Group>
        </Col>
      </Row>
    </>
  );
}
