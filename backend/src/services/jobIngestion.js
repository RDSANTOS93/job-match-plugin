import { getDb } from '../database.js';

/**
 * Normalizes job data from different sources into a common schema.
 */
export function normalizeJob(rawJob, source) {
  return {
    source,
    title: rawJob.title?.trim() || 'Unknown',
    company: rawJob.company?.trim() || null,
    location: rawJob.location?.trim() || null,
    salary_range: rawJob.salary?.trim() || rawJob.salary_range?.trim() || null,
    description: rawJob.description?.trim() || rawJob.snippet?.trim() || null,
    requirements: JSON.stringify(rawJob.requirements || []),
    url: rawJob.url?.trim() || null,
    external_id: rawJob.id || rawJob.external_id || null,
    posted_at: rawJob.posted_at || rawJob.date || null,
  };
}

/**
 * Checks if a job already exists in the database (by URL or title+company).
 */
export function isDuplicate(job) {
  const db = getDb();

  if (job.url) {
    const byUrl = db.prepare('SELECT id FROM jobs WHERE url = ?').get(job.url);
    if (byUrl) return true;
  }

  if (job.title && job.company) {
    const byTitleCompany = db.prepare(
      'SELECT id FROM jobs WHERE title = ? AND company = ?'
    ).get(job.title, job.company);
    if (byTitleCompany) return true;
  }

  return false;
}

/**
 * Stores a normalized job in the database. Returns the job ID.
 */
export function storeJob(normalizedJob) {
  const db = getDb();

  const result = db.prepare(`
    INSERT OR IGNORE INTO jobs (external_id, source, title, company, location, salary_range, description, requirements, url, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    normalizedJob.external_id,
    normalizedJob.source,
    normalizedJob.title,
    normalizedJob.company,
    normalizedJob.location,
    normalizedJob.salary_range,
    normalizedJob.description,
    normalizedJob.requirements,
    normalizedJob.url,
    normalizedJob.posted_at,
  );

  return result.lastInsertRowid;
}

/**
 * Batch ingest jobs from a source.
 * Usage: call this from a cron job or scheduled task.
 *
 * To add new sources, implement a fetcher function that returns
 * an array of raw job objects, then normalize and store them:
 *
 *   // Example: Indeed RSS feed ingestion
 *   import Parser from 'rss-parser';
 *   const parser = new Parser();
 *
 *   export async function fetchIndeedJobs(query, location) {
 *     const feed = await parser.parseURL(
 *       `https://www.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`
 *     );
 *     return feed.items.map(item => ({
 *       title: item.title,
 *       company: item.author,
 *       location: location,
 *       description: item.contentSnippet,
 *       url: item.link,
 *       date: item.pubDate,
 *     }));
 *   }
 *
 *   // In your cron job:
 *   const rawJobs = await fetchIndeedJobs('software engineer', 'London');
 *   ingestBatch(rawJobs, 'indeed');
 */
export function ingestBatch(rawJobs, source) {
  let ingested = 0;
  let skipped = 0;

  for (const raw of rawJobs) {
    const normalized = normalizeJob(raw, source);
    if (isDuplicate(normalized)) {
      skipped++;
      continue;
    }
    storeJob(normalized);
    ingested++;
  }

  return { ingested, skipped, total: rawJobs.length };
}
