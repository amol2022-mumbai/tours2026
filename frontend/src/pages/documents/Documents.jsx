import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ document_type: '', customer_id: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileRef = useRef(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.document_type) params.document_type = filters.document_type;
      if (filters.customer_id) params.customer_id = filters.customer_id;
      const res = await api.get('/api/documents', { params });
      setDocuments(res.data.data || res.data);
      setPagination((p) => ({ ...p, total: res.data.total || res.data.pagination?.total || 0 }));
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [pagination.page, filters]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (uploadTitle) formData.append('title', uploadTitle);
      await api.post('/api/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadTitle('');
      if (fileRef.current) fileRef.current.value = '';
      fetchDocuments();
    } catch (err) {
      console.error('Failed to upload document:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/documents/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Documents</h2>
      </div>

      <div className="upload-section card">
        <h4>Upload Document</h4>
        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Document title" />
            </div>
            <div className="form-group">
              <label>File</label>
              <input type="file" ref={fileRef} required />
            </div>
            <div className="form-group form-group-btn">
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Document type..."
          value={filters.document_type}
          onChange={(e) => { setFilters((f) => ({ ...f, document_type: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}
        />
        <input
          type="text"
          placeholder="Customer ID..."
          value={filters.customer_id}
          onChange={(e) => { setFilters((f) => ({ ...f, customer_id: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}
        />
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="empty-state">No documents found.</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>File Name</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.title || '-'}</td>
                  <td>{d.file_name || d.filename || '-'}</td>
                  <td><span className="badge">{d.document_type || '-'}</span></td>
                  <td>{d.customer?.name || d.customer_name || '-'}</td>
                  <td>{d.uploaded_by?.name || d.uploaded_by_name || '-'}</td>
                  <td>{d.created_at ? d.created_at.slice(0, 10) : '-'}</td>
                  <td className="actions">
                    <a href={`/api/documents/download/${d.id}`} className="btn btn-sm btn-outline" download>Download</a>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(d)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Prev</button>
              <span>Page {pagination.page} of {totalPages}</span>
              <button disabled={pagination.page >= totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</button>
            </div>
          )}
        </>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="btn-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <p>Are you sure you want to delete <strong>{deleteConfirm.title || deleteConfirm.file_name}</strong>?</p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
