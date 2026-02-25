import { getDb } from '../database.js';

/**
 * Analyzes a user's feedback history to build a preference signal
 * that gets included in matching prompts, making future matches smarter.
 */
export function getUserFeedbackSignal(userId) {
  if (!userId) return null;

  const db = getDb();

  const feedback = db.prepare(`
    SELECT f.rating, f.reason, j.title, j.company, j.location, m.score, m.explanation
    FROM feedback f
    JOIN matches m ON f.match_id = m.id
    JOIN jobs j ON m.job_id = j.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
    LIMIT 30
  `).all(userId);

  if (feedback.length < 3) return null; // Not enough data yet

  const liked = feedback.filter(f => f.rating === 'thumbs_up');
  const disliked = feedback.filter(f => f.rating === 'thumbs_down');

  const parts = [];

  if (liked.length > 0) {
    parts.push('Jobs the candidate LIKED:');
    liked.slice(0, 10).forEach(f => {
      let line = `- "${f.title}" at ${f.company}`;
      if (f.reason) line += ` (reason: ${f.reason})`;
      parts.push(line);
    });
  }

  if (disliked.length > 0) {
    parts.push('\nJobs the candidate DISLIKED:');
    disliked.slice(0, 10).forEach(f => {
      let line = `- "${f.title}" at ${f.company}`;
      if (f.reason) line += ` (reason: ${f.reason})`;
      parts.push(line);
    });
  }

  parts.push('\nUse these patterns to better calibrate scores. If you see a pattern in what they like/dislike (e.g., they prefer startups over enterprise, or dislike roles requiring travel), factor that into your scoring.');

  return parts.join('\n');
}
