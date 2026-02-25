import { Router } from 'express';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { scoreJobs } from '../services/matching.js';

const router = Router();

router.post('/score', requireAuth, async (req, res) => {
  try {
    const { jobs } = req.body;
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'jobs array is required' });
    }

    const db = getDb();

    // Get user profile
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Profile not found. Complete your profile first.' });

    profile.skills = JSON.parse(profile.skills || '[]');
    profile.experience = JSON.parse(profile.experience || '[]');
    profile.education = JSON.parse(profile.education || '[]');
    profile.preferences = JSON.parse(profile.preferences || '{}');

    // Store jobs in DB and get IDs
    const insertJob = db.prepare(`
      INSERT OR IGNORE INTO jobs (source, title, company, location, salary_range, description, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const getJobByUrl = db.prepare('SELECT id FROM jobs WHERE url = ?');

    const jobsWithIds = jobs.map(job => {
      if (job.url) {
        insertJob.run(job.source || 'unknown', job.title, job.company, job.location, job.salary || null, job.snippet || job.description || null, job.url);
        const row = getJobByUrl.get(job.url);
        return { ...job, dbId: row?.id };
      }
      return job;
    });

    // Score jobs via LLM
    const scores = await scoreJobs(profile, jobsWithIds);

    // Store matches
    const insertMatch = db.prepare(`
      INSERT OR REPLACE INTO matches (user_id, job_id, score, explanation, match_factors, status)
      VALUES (?, ?, ?, ?, ?, 'new')
    `);

    scores.forEach(score => {
      if (score.dbId) {
        insertMatch.run(req.user.id, score.dbId, score.score, score.explanation, JSON.stringify(score.factors || {}));
      }
    });

    res.json({ scores });
  } catch (err) {
    console.error('Scoring error:', err);
    res.status(500).json({ error: 'Failed to score jobs' });
  }
});

router.get('/recent', requireAuth, (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 20;
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY ingested_at DESC LIMIT ?').all(limit);
  res.json({ jobs });
});

export default router;
