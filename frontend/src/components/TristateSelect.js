import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * Tri-state select:
 *   ''   -> no preference (null)
 *   true -> yes
 *   false-> no
 */
export default function TriStateSelect({ label, name, value, onChange, className }) {
  return (
    <Form.Group className={className}>
      <Form.Label>{label}</Form.Label>
      <Form.Select
        name={name}
        value={value === null || value === undefined ? '' : value ? 'true' : 'false'}
        onChange={(e) => {
          const v = e.target.value;
          onChange({
            target: { name, value: v === '' ? null : v === 'true', type: 'custom' },
          });
        }}
      >
        <option value="">Maybe</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </Form.Select>
    </Form.Group>
  );
}
