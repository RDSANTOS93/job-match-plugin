import { useState, useEffect } from 'react';
import { Briefcase, Filter } from 'lucide-react';
import MatchCard from '../components/MatchCard';
import api from '../api/client';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => { loadMatches(); }, [status, minScore]);

  async function loadMatches() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (status !== 'all') params.set('status', status);
      if (minScore > 0) params.set('minScore', minScore.toString());
      const res = await api.get(`/matches?${params}`);
      let sorted = res.data.matches || [];
      if (sortBy === 'score') sorted.sort((a, b) => b.score - a.score);
      setMatches(sorted);
    } catch {
      setMatches([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    setMatches(prev => {
      const sorted = [...prev];
      if (sortBy === 'score') sorted.sort((a, b) => b.score - a.score);
      else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return sorted;
    });
  }, [sortBy]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Your Matches</h1>
      <p className="text-gray-500 text-sm mb-6">Jobs scored against your profile and ambitions</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <Filter className="w-4 h-4 text-gray-500" />

        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-primary-500">
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="interested">Interested</option>
          <option value="not_interested">Not Interested</option>
        </select>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Min score:</span>
          <input type="range" min="0" max="90" step="10" value={minScore} onChange={e => setMinScore(Number(e.target.value))}
            className="w-24 accent-primary-500" />
          <span className="text-primary-300 w-8">{minScore}%</span>
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-primary-500 ml-auto">
          <option value="date">Sort by Date</option>
          <option value="score">Sort by Score</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : matches.length > 0 ? (
        <div className="grid gap-4">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} onUpdate={loadMatches} />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No matches found</p>
          <p className="text-sm text-gray-600 mt-2">
            {status !== 'all' || minScore > 0
              ? 'Try adjusting your filters'
              : 'Install the RogerThat extension and browse job listings to start matching'}
          </p>
        </div>
      )}
    </div>
  );
}
