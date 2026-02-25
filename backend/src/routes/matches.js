import { Router } from 'express';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, minScore, limit = 20, offset = 0 } = req.query;

  let sql = `
    SELECT m.*, j.title, j.company, j.location, j.salary_range, j.url, j.source
    FROM matches m
    JOIN jobs j ON m.job_id = j.id
    WHERE m.user_id = ?
  `;
  const params = [req.user.id];

  if (status && status !== 'all') {
    sql += ' AND m.status = ?';
    params.push(status);
  }
  if (minScore) {
    sql += ' AND m.score >= ?';
    params.push(parseInt(minScore));
  }

  sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const matches = db.prepare(sql).all(...params);

  matches.forEach(m => {
    m.match_factors = JSON.parse(m.match_factors || '{}');
  });

  res.json({ matches });
});

router.get('/stats', requireAuth, (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM matches WHERE user_id = ?').get(req.user.id).count;
  const strong = db.prepare('SELECT COUNT(*) as count FROM matches WHERE user_id = ? AND score >= 80').get(req.user.id).count;
  const newCount = db.prepare("SELECT COUNT(*) as count FROM matches WHERE user_id = ? AND status = 'new'").get(req.user.id).count;
  const thisWeek = db.prepare(
    "SELECT COUNT(*) as count FROM matches WHERE user_id = ? AND created_at >= datetime('now', '-7 days')"
  ).get(req.user.id).count;

  res.json({ total, strong, new: newCount, thisWeek });
});

router.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['new', 'seen', 'interested', 'not_interested'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  db.prepare('UPDATE matches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  res.json({ success: true });
});

router.post('/:id/feedback', requireAuth, (req, res) => {
  const db = getDb();
  const { rating, reason } = req.body;

  if (!['thumbs_up', 'thumbs_down'].includes(rating)) {
    return res.status(400).json({ error: 'Rating must be thumbs_up or thumbs_down' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  db.prepare('INSERT INTO feedback (user_id, match_id, rating, reason) VALUES (?, ?, ?, ?)').run(
    req.user.id, req.params.id, rating, reason || null
  );

  // Update match status based on feedback
  const newStatus = rating === 'thumbs_up' ? 'interested' : 'not_interested';
  db.prepare('UPDATE matches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);

  res.json({ success: true });
});

export default router;
