const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../../config/db');
const { auth } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.use(auth);

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const { customer_id, booking_id, document_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (customer_id) { where.push('d.customer_id = ?'); params.push(customer_id); }
    if (booking_id) { where.push('d.booking_id = ?'); params.push(booking_id); }
    if (document_type) { where.push('d.document_type = ?'); params.push(document_type); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM documents d ${whereClause}`, params);
    const [documents] = await pool.query(
      `SELECT d.*, c.name AS customer_name, u.name AS uploaded_by_name
       FROM documents d
       LEFT JOIN customers c ON d.customer_id = c.id
       LEFT JOIN users u ON d.uploaded_by = u.id
       ${whereClause}
       ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: documents,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const [documents] = await pool.query(
      `SELECT d.*, c.name AS customer_name FROM documents d
       LEFT JOIN customers c ON d.customer_id = c.id WHERE d.id = ?`, [req.params.id]
    );
    if (documents.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json(documents[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /api/documents - Upload document
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const { customer_id, booking_id, document_type, title, notes } = req.body;

    const [result] = await pool.query(
      `INSERT INTO documents (customer_id, booking_id, document_type, title, file_path, file_name, file_size, mime_type, notes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id || null, booking_id || null, document_type || 'other',
       title || req.file.originalname, req.file.path, req.file.originalname,
       req.file.size, req.file.mimetype, notes || null, req.user.id]
    );

    const [document] = await pool.query('SELECT * FROM documents WHERE id = ?', [result.insertId]);
    res.status(201).json(document[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/documents/download/:id
router.get('/download/:id', async (req, res) => {
  try {
    const [documents] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (documents.length === 0) return res.status(404).json({ error: 'Document not found' });

    const doc = documents[0];
    const filePath = path.resolve(doc.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(filePath, doc.file_name || 'document');
  } catch (err) {
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const [documents] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (documents.length === 0) return res.status(404).json({ error: 'Document not found' });

    // Delete file from disk
    const filePath = path.resolve(documents[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
