import React from 'react';

const variants = {
  primary: 'btn-primary', secondary: 'btn-secondary', success: 'btn-success',
  danger: 'btn-danger', warning: 'btn-warning',
};

const sizes = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, loading, type = 'button', onClick, ...props }) {
  const classes = ['btn', variants[variant] || 'btn-primary', sizes[size] || '', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || loading} onClick={onClick} {...props}>
      {loading && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />}
      {children}
    </button>
  );
}
