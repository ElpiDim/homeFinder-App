import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';

export default function ProfileStep({ personal, onChange, errors = {} }) {
  return (
    <>
      <h4 className="mb-4 text-center">Step 1: Tell us about you</h4>

      <Row className="g-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Name</Form.Label>
            <Form.Control
              name="name"
              value={personal.name}
              onChange={onChange}
              isInvalid={!!errors.name}
            />
            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Phone</Form.Label>
            <Form.Control
              name="phone"
              value={personal.phone}
              onChange={onChange}
              isInvalid={!!errors.phone}
            />
            <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Age</Form.Label>
            <Form.Control
              type="number"
              name="age"
              value={personal.age}
              onChange={onChange}
              isInvalid={!!errors.age}
            />
            <Form.Control.Feedback type="invalid">{errors.age}</Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Household Size</Form.Label>
            <Form.Control
              type="number"
              name="householdSize"
              value={personal.householdSize}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
        <Col md={3} className="d-flex align-items-end">
          <Form.Check
            label="Has family"
            name="hasFamily"
            checked={personal.hasFamily}
            onChange={onChange}
          />
        </Col>
        <Col md={3} className="d-flex align-items-end">
          <Form.Check
            label="Has pets"
            name="hasPets"
            checked={personal.hasPets}
            onChange={onChange}
          />
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col md={3} className="d-flex align-items-end">
          <Form.Check
            label="Smoker"
            name="smoker"
            checked={personal.smoker}
            onChange={onChange}
          />
        </Col>
        <Col md={5}>
          <Form.Group>
            <Form.Label>Occupation</Form.Label>
            <Form.Control
              name="occupation"
              value={personal.occupation}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Salary (€)</Form.Label>
            <Form.Control
              type="number"
              name="salary"
              value={personal.salary}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col md={12} className="d-flex align-items-end">
          <Form.Check
            label="I’m willing to have a roommate"
            name="isWillingToHaveRoommate"
            checked={personal.isWillingToHaveRoommate}
            onChange={onChange}
          />
        </Col>
      </Row>
    </>
  );
}