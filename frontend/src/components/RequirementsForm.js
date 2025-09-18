import React from 'react';
import { Form } from 'react-bootstrap';
import { propertyRequirements } from '../config/propertyRequirements';

const RequirementsForm = ({
  values,
  setValues,
  importanceValues,
  setImportanceValues,
  isFilter = false,
}) => {
  const hasImportance =
    typeof setImportanceValues === 'function' && importanceValues !== undefined;

  const handleChange = (name, value) => {
    setValues((prev) => {
      const newValues = { ...(typeof prev === 'object' && prev !== null ? prev : {}) };
      if (value === '' || value === null || value === undefined) {
        delete newValues[name];
      } else {
        newValues[name] = value;
      }
      return newValues;
    });

    if (hasImportance) {
      setImportanceValues((prev) => {
        const next = { ...(typeof prev === 'object' && prev !== null ? prev : {}) };
        if (value === '' || value === null || value === undefined) {
          delete next[name];
        } else if (!next[name]) {
          next[name] = 'low';
        }
        return next;
      });
    }
  };

  const handleImportanceChange = (name, value) => {
    if (!hasImportance) return;
    const normalized = value === 'high' ? 'high' : 'low';
    setImportanceValues((prev) => ({
      ...(typeof prev === 'object' && prev !== null ? prev : {}),
      [name]: normalized,
    }));
  };

  const renderImportanceSelect = (name) => {
    if (!hasImportance) return null;
    const currentImportance = importanceValues?.[name] || 'low';
    return (
      <>
        <Form.Label className="mt-2">Importance</Form.Label>
        <Form.Select
          value={currentImportance}
          onChange={(e) => handleImportanceChange(name, e.target.value)}
        >
          <option value="low">Less important</option>
          <option value="high">Very important</option>
        </Form.Select>
      </>
    );
  };

  return (
    <>
      {propertyRequirements.map((req) => {
        const { name, label, type, options } = req;
        const value = values?.[name] ?? '';

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
                {renderImportanceSelect(name)}
              </Form.Group>
            );
          case 'boolean':
            return (
              <Form.Group key={name} className="mb-3">
                <Form.Check
                  type="switch"
                  id={name}
                  label={label}
                  checked={!!value}
                  onChange={(e) => handleChange(name, e.target.checked)}
                />
                {renderImportanceSelect(name)}
              </Form.Group>
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
                {renderImportanceSelect(name)}
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
