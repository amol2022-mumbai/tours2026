import React, { useEffect } from 'react';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyle = size === 'lg' ? { maxWidth: '900px' } : size === 'sm' ? { maxWidth: '400px' } : {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={sizeStyle} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
