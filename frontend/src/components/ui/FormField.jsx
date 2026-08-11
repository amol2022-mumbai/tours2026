import React from 'react';

export default function FormField({ label, name, type = 'text', value, onChange, required, placeholder, options, disabled, error, children, ...props }) {
  const id = `field-${name}`;

  const renderInput = () => {
    if (children) return children;

    if (type === 'select' && options) {
      return (
        <select id={id} name={name} className="form-control" value={value} onChange={onChange} required={required} disabled={disabled} {...props}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return <textarea id={id} name={name} className="form-control" value={value} onChange={onChange} required={required} placeholder={placeholder} disabled={disabled} {...props} />;
    }

    return (
      <input id={id} name={name} type={type} className="form-control" value={value} onChange={onChange} required={required} placeholder={placeholder} disabled={disabled} {...props} />
    );
  };

  return (
    <div className="form-group">
      {label && <label htmlFor={id}>{label}{required && ' *'}</label>}
      {renderInput()}
      {error && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  );
}
