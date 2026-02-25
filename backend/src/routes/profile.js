import { Router } from 'express';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // Parse JSON fields
  profile.skills = JSON.parse(profile.skills || '[]');
  profile.experience = JSON.parse(profile.experience || '[]');
  profile.education = JSON.parse(profile.education || '[]');
  profile.preferences = JSON.parse(profile.preferences || '{}');

  res.json(profile);
});

router.put('/', requireAuth, (req, res) => {
  const db = getDb();
  const { name, headline, summary, skills, experience, education, resume_text, linkedin_url } = req.body;

  db.prepare(`
    UPDATE profiles SET
      name = COALESCE(?, name),
      headline = COALESCE(?, headline),
      summary = COALESCE(?, summary),
      skills = COALESCE(?, skills),
      experience = COALESCE(?, experience),
      education = COALESCE(?, education),
      resume_text = COALESCE(?, resume_text),
      linkedin_url = COALESCE(?, linkedin_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(
    name || null,
    headline || null,
    summary || null,
    skills ? JSON.stringify(skills) : null,
    experience ? JSON.stringify(experience) : null,
    education ? JSON.stringify(education) : null,
    resume_text || null,
    linkedin_url || null,
    req.user.id
  );

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
  profile.skills = JSON.parse(profile.skills || '[]');
  profile.experience = JSON.parse(profile.experience || '[]');
  profile.education = JSON.parse(profile.education || '[]');
  profile.preferences = JSON.parse(profile.preferences || '{}');

  res.json(profile);
});

router.post('/import', requireAuth, (req, res) => {
  const { name, headline, experience, skills, education, linkedin_url } = req.body;

  const db = getDb();
  db.prepare(`
    UPDATE profiles SET
      name = COALESCE(?, name),
      headline = COALESCE(?, headline),
      skills = ?,
      experience = ?,
      education = ?,
      linkedin_url = COALESCE(?, linkedin_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(
    name || null,
    headline || null,
    JSON.stringify(skills || []),
    JSON.stringify(experience || []),
    JSON.stringify(education || []),
    linkedin_url || null,
    req.user.id
  );

  res.json({ success: true, message: 'Profile imported from LinkedIn' });
});

router.put('/preferences', requireAuth, (req, res) => {
  const db = getDb();
  const preferences = req.body;

  db.prepare(`
    UPDATE profiles SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
  `).run(JSON.stringify(preferences), req.user.id);

  res.json({ success: true, preferences });
});

router.put('/ambitions', requireAuth, (req, res) => {
  const db = getDb();
  const { ambitions } = req.body;

  db.prepare(`
    UPDATE profiles SET ambitions = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
  `).run(ambitions, req.user.id);

  res.json({ success: true, ambitions });
});

export default router;
