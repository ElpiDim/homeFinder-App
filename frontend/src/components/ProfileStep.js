import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import './ProfileStep.css';

export default function ProfileStep({ personal, onChange, errors = {} }) {
  return (
    <div className="profile-step">
      <section className="profile-section">
        <header className="section-header">
          <h5 className="section-title">Basic information</h5>
          <p className="section-description">
            Let’s start with your contact details and a few personal basics.
          </p>
        </header>

        <Row className="g-3">
          <Col xs={12} md={6}>
            <Form.Group controlId="personal-name">
              <Form.Label className="field-label">Full name</Form.Label>
              <Form.Control
                name="name"
                value={personal.name}
                onChange={onChange}
                placeholder="e.g. John Doe"
                isInvalid={!!errors.name}
              />
              <Form.Control.Feedback type="invalid">
                {errors.name}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col xs={12} md={6}>
            <Form.Group controlId="personal-phone">
              <Form.Label className="field-label">Phone number</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={personal.phone}
                onChange={onChange}
                placeholder="e.g. +30 69..."
                isInvalid={!!errors.phone}
              />
              <Form.Control.Feedback type="invalid">
                {errors.phone}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12} sm={6} md={3}>
            <Form.Group controlId="personal-age">
              <Form.Label className="field-label">Age</Form.Label>
              <Form.Control
                type="number"
                name="age"
                value={personal.age}
                onChange={onChange}
                placeholder="e.g. 30"
                isInvalid={!!errors.age}
              />
              <Form.Control.Feedback type="invalid">
                {errors.age}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Form.Group controlId="personal-householdSize">
              <Form.Label className="field-label">Household size</Form.Label>
              <Form.Control
                type="number"
                name="householdSize"
                value={personal.householdSize}
                onChange={onChange}
                placeholder="e.g. 3"
              />
            </Form.Group>
          </Col>

          <Col xs={12} sm={6} md={3} className="align-center-checkbox">
            <Form.Check
              id="personal-hasFamily"
              type="checkbox"
              label="Have family"
              name="hasFamily"
              checked={personal.hasFamily}
              onChange={onChange}
            />
          </Col>

          <Col xs={12} sm={6} md={3} className="align-center-checkbox">
            <Form.Check
              id="personal-hasPets"
              type="checkbox"
              label="Have pets"
              name="hasPets"
              checked={personal.hasPets}
              onChange={onChange}
            />
          </Col>
        </Row>
      </section>

      <section className="profile-section">
        <header className="section-header">
          <h5 className="section-title">Lifestyle &amp; work</h5>
          <p className="section-description">
            Tell us about your habits and occupation to help match ideal properties.
          </p>
        </header>

        <Row className="g-3">
          <Col xs={12} sm={6} md={3} className="align-center-checkbox">
            <Form.Check
              id="personal-smoker"
              type="checkbox"
              label="I’m a smoker"
              name="smoker"
              checked={personal.smoker}
              onChange={onChange}
            />
          </Col>

          <Col xs={12} sm={6} md={5}>
            <Form.Group controlId="personal-occupation">
              <Form.Label className="field-label">Occupation</Form.Label>
              <Form.Control
                name="occupation"
                value={personal.occupation}
                onChange={onChange}
                placeholder="e.g. Software Engineer"
              />
            </Form.Group>
          </Col>

          <Col xs={12} md={4}>
            <Form.Group controlId="personal-salary">
              <Form.Label className="field-label">Annual salary (€)</Form.Label>
              <Form.Control
                type="number"
                name="salary"
                value={personal.salary}
                onChange={onChange}
                placeholder="Optional"
                inputMode="numeric"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12} className="align-center-checkbox">
            <Form.Check
              id="personal-roommate"
              type="checkbox"
              label="I’m open to having a roommate"
              name="isWillingToHaveRoommate"
              checked={personal.isWillingToHaveRoommate}
              onChange={onChange}
            />
          </Col>
        </Row>
      </section>
    </div>
  );
}
