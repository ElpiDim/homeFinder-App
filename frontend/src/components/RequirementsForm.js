import React from 'react';
import { Form } from 'react-bootstrap';
import { propertyRequirements } from '../config/propertyRequirements';

const RequirementsForm = ({ values, setValues, isFilter = false }) => {
  const handleChange = (name, value) => {
    const newValues = { ...values };
    if (value === '' || value === null || value === undefined) {
      delete newValues[name];
    } else {
      newValues[name] = value;
    }
    setValues(newValues);
  };

  return (
    <>
      {propertyRequirements.map((req) => {
        const { name, label, type, options } = req;
        const value = values[name] || '';

        switch (type) {
          case 'number':
            return (
              <Form.Group key={name} className="mb-3">
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type="number"
                  value={value}
                  onChange={(e) => handleChange(name, e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={isFilter ? `Any ${label}` : ''}
                />
              </Form.Group>
            );
          case 'boolean':
            return (
              <Form.Check
                key={name}
                type="switch"
                id={name}
                label={label}
                checked={!!value}
                onChange={(e) => handleChange(name, e.target.checked)}
                className="mb-3"
              />
            );
          case 'select':
            return (
              <Form.Group key={name} className="mb-3">
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  as="select"
                  value={value}
                  onChange={(e) => handleChange(name, e.target.value)}
                >
                  <option value="">{isFilter ? 'Any' : 'Select...'}</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default RequirementsForm;
