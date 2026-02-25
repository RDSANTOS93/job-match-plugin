import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ThumbsUp, ThumbsDown, MapPin, Building2, DollarSign, Briefcase } from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import api from '../api/client';

const factorLabels = {
  skillMatch: { label: 'Skills Match', desc: 'How your skills align with requirements' },
  experienceMatch: { label: 'Experience Fit', desc: 'Your experience level vs. what they need' },
  ambitionAlign: { label: 'Ambition Alignment', desc: 'Does this role move you toward your goals?' },
  preferenceMatch: { label: 'Preference Match', desc: 'Salary, location, remote, company size' },
  growthPotential: { label: 'Growth Potential', desc: 'Room to grow and learn new things' },
};

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, [id]);

  async function loadMatch() {
    try {
      const res = await api.get(`/matches?limit=100`);
      const found = res.data.matches?.find(m => m.id === Number(id));
      if (found) {
        setMatch(found);
        // Mark as seen
        if (found.status === 'new') {
          api.patch(`/matches/${id}`, { status: 'seen' }).catch(() => {});
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleFeedback(rating) {
    try {
      await api.post(`/matches/${id}/feedback`, { rating, reason: feedbackText || undefined });
      setFeedbackText('');
      loadMatch();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Match not found</p>
        <Link to="/matches" className="text-primary-400 text-sm mt-2 inline-block">Back to matches</Link>
      </div>
    );
  }

  const factors = match.match_factors || {};

  return (
    <div className="max-w-2xl">
      <Link to="/matches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to matches
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <ScoreBadge score={match.score} size={72} />
          <div className="flex-1">
            <h1 className="text-xl font-bold">{match.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{match.company || 'Unknown'}</span>
              {match.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{match.location}</span>}
              {match.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{match.salary_range}</span>}
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{match.source}</span>
            </div>
          </div>
        </div>

        {match.url && (
          <a href={match.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
            View Original Listing <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Match Explanation */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-3">Why This Matches</h2>
        <p className="text-gray-300 leading-relaxed">{match.explanation}</p>
      </div>

      {/* Factor Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Score Breakdown</h2>
        <div className="space-y-4">
          {Object.entries(factorLabels).map(([key, meta]) => {
            const value = factors[key] || 0;
            const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium">{meta.label}</span>
                    <span className="text-xs text-gray-500 ml-2">{meta.desc}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444' }}>{value}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold mb-3">Your Feedback</h2>
        <p className="text-sm text-gray-500 mb-4">Help RogerThat learn your preferences — your feedback improves future matches.</p>

        <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={2}
          placeholder="Optional: tell us why you liked or disliked this match..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500 placeholder-gray-600 mb-3" />

        <div className="flex gap-3">
          <button onClick={() => handleFeedback('thumbs_up')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
              match.status === 'interested' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-green-600/20 hover:text-green-400'
            }`}>
            <ThumbsUp className="w-4 h-4" /> Interested
          </button>
          <button onClick={() => handleFeedback('thumbs_down')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
              match.status === 'not_interested' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-red-600/20 hover:text-red-400'
            }`}>
            <ThumbsDown className="w-4 h-4" /> Not For Me
          </button>
        </div>
      </div>
    </div>
  );
}
