import Anthropic from '@anthropic-ai/sdk';
import { getUserFeedbackSignal } from './feedbackLoop.js';

const client = new Anthropic();

/**
 * Score an array of jobs against a user profile using Claude.
 * This is the core matching engine — the main value of the product.
 */
export async function scoreJobs(userProfile, jobs) {
  const feedbackSignal = getUserFeedbackSignal(userProfile.user_id);

  const profileSummary = buildProfileSummary(userProfile);
  const jobDescriptions = jobs.map((job, i) => buildJobEntry(job, i)).join('\n---\n');

  const systemPrompt = `You are RogerThat, an expert career advisor and job matching engine. Your role is to assess how well job opportunities align with a candidate's profile, considering not just their current skills and experience, but critically their career AMBITIONS — where they want to grow.

You evaluate matches across 5 dimensions, each scored 0-100:
1. **Skill Match**: How well do the candidate's current skills match the job requirements?
2. **Experience Match**: Is the candidate's experience level appropriate for this role?
3. **Ambition Alignment**: Does this role move the candidate TOWARD their stated career goals?
4. **Preference Match**: Does the role satisfy their stated preferences (salary, location, remote, etc.)?
5. **Growth Potential**: Does this role offer meaningful growth opportunities for the candidate?

The overall score is NOT a simple average — weight ambition alignment and growth potential higher, because the best job isn't always the easiest fit, it's the one that takes you where you want to go.

Be honest and specific in explanations. Don't be generically positive. If a job is a poor fit, say why clearly.`;

  const userPrompt = `## Candidate Profile
${profileSummary}

${feedbackSignal ? `## Learned Preferences (from past feedback)\n${feedbackSignal}\n` : ''}

## Jobs to Evaluate
${jobDescriptions}

## Instructions
For each job (numbered above), provide a match assessment. Respond with ONLY valid JSON in this exact format:
{
  "scores": [
    {
      "index": 0,
      "score": 82,
      "explanation": "2-3 sentence explanation of WHY this is/isn't a good match, referencing specific skills and ambitions",
      "factors": {
        "skillMatch": 85,
        "experienceMatch": 78,
        "ambitionAlign": 90,
        "preferenceMatch": 75,
        "growthPotential": 82
      }
    }
  ]
}

Be specific: reference actual skills, experience entries, and ambitions from the profile. If info is missing, score conservatively and note what's unknown.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].text;
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Map scores back to jobs
    return parsed.scores.map(score => ({
      jobId: jobs[score.index]?.url || score.index,
      dbId: jobs[score.index]?.dbId,
      score: Math.min(100, Math.max(0, score.score)),
      explanation: score.explanation,
      factors: score.factors,
    }));
  } catch (err) {
    console.error('LLM matching error:', err);
    // Return fallback scores so the extension doesn't break
    return jobs.map((job, i) => ({
      jobId: job.url || i,
      dbId: job.dbId,
      score: 50,
      explanation: 'Unable to analyze this match at the moment. Please try again later.',
      factors: { skillMatch: 50, experienceMatch: 50, ambitionAlign: 50, preferenceMatch: 50, growthPotential: 50 },
    }));
  }
}

function buildProfileSummary(profile) {
  const parts = [];

  if (profile.name) parts.push(`**Name:** ${profile.name}`);
  if (profile.headline) parts.push(`**Headline:** ${profile.headline}`);
  if (profile.summary) parts.push(`**Summary:** ${profile.summary}`);

  if (profile.skills && profile.skills.length > 0) {
    parts.push(`**Skills:** ${profile.skills.join(', ')}`);
  }

  if (profile.experience && profile.experience.length > 0) {
    parts.push('**Experience:**');
    profile.experience.forEach(exp => {
      parts.push(`- ${exp.title || 'Role'} at ${exp.company || 'Company'} (${exp.duration || 'N/A'})`);
      if (exp.description) parts.push(`  ${exp.description.slice(0, 200)}`);
    });
  }

  if (profile.education && profile.education.length > 0) {
    parts.push('**Education:**');
    profile.education.forEach(edu => {
      parts.push(`- ${edu.degree || ''} at ${edu.school || 'Institution'} ${edu.year ? `(${edu.year})` : ''}`);
    });
  }

  if (profile.ambitions) {
    parts.push(`**Career Ambitions:** ${profile.ambitions}`);
  }

  const prefs = profile.preferences || {};
  if (Object.keys(prefs).length > 0) {
    parts.push('**Job Preferences:**');
    if (prefs.industries?.length) parts.push(`- Industries: ${prefs.industries.join(', ')}`);
    if (prefs.roles?.length) parts.push(`- Target roles: ${prefs.roles.join(', ')}`);
    if (prefs.salaryMin || prefs.salaryMax) parts.push(`- Salary: ${prefs.salaryMin || '?'}–${prefs.salaryMax || '?'}`);
    if (prefs.locations?.length) parts.push(`- Locations: ${prefs.locations.join(', ')}`);
    if (prefs.remotePreference) parts.push(`- Remote preference: ${prefs.remotePreference}`);
    if (prefs.companySizes?.length) parts.push(`- Company size: ${prefs.companySizes.join(', ')}`);
    if (prefs.dealbreakers?.length) parts.push(`- Dealbreakers: ${prefs.dealbreakers.join(', ')}`);
  }

  return parts.join('\n');
}

function buildJobEntry(job, index) {
  return `### Job ${index}
**Title:** ${job.title || 'Unknown'}
**Company:** ${job.company || 'Unknown'}
**Location:** ${job.location || 'Not specified'}
${job.salary ? `**Salary:** ${job.salary}` : ''}
${job.snippet || job.description ? `**Description:** ${(job.snippet || job.description || '').slice(0, 500)}` : ''}
**URL:** ${job.url || 'N/A'}`;
}
