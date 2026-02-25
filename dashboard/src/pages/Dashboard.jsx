import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, TrendingUp, Sparkles, Star, User, SlidersHorizontal } from 'lucide-react';
import MatchCard from '../components/MatchCard';
import api from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, strong: 0, new: 0, thisWeek: 0 });
  const [recentMatches, setRecentMatches] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [statsRes, matchesRes, profileRes] = await Promise.all([
        api.get('/matches/stats').catch(() => ({ data: stats })),
        api.get('/matches?minScore=70&limit=5').catch(() => ({ data: { matches: [] } })),
        api.get('/profile').catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data);
      setRecentMatches(matchesRes.data.matches || []);
      setProfile(profileRes.data);
    } catch (e) {
      // silently fail on initial load
    }
  }

  function getProfileCompleteness() {
    if (!profile) return 0;
    let score = 0;
    if (profile.name) score += 15;
    if (profile.headline) score += 10;
    if (profile.summary) score += 10;
    if (profile.skills?.length > 0) score += 20;
    if (profile.experience?.length > 0) score += 20;
    if (profile.ambitions) score += 15;
    if (Object.keys(profile.preferences || {}).length > 0) score += 10;
    return Math.min(100, score);
  }

  const completeness = getProfileCompleteness();

  const statCards = [
    { label: 'Total Matches', value: stats.total, icon: Briefcase, color: 'text-blue-400' },
    { label: 'Strong (80%+)', value: stats.strong, icon: Star, color: 'text-green-400' },
    { label: 'New This Week', value: stats.thisWeek, icon: Sparkles, color: 'text-primary-400' },
    { label: 'New', value: stats.new, icon: TrendingUp, color: 'text-amber-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(' ')[0]}</h1>
      <p className="text-gray-500 mb-6">Here's your job matching overview</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Profile Completeness */}
      {completeness < 100 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Profile Completeness</h3>
            <span className="text-sm text-primary-400">{completeness}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-primary-600 rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
          </div>
          <div className="flex gap-3">
            <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600/10 text-primary-300 rounded-lg hover:bg-primary-600/20 transition-colors">
              <User className="w-4 h-4" /> Complete Profile
            </Link>
            <Link to="/preferences" className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Set Preferences
            </Link>
          </div>
        </div>
      )}

      {/* Recent Matches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Strong Matches</h2>
          <Link to="/matches" className="text-sm text-primary-400 hover:text-primary-300">View all</Link>
        </div>

        {recentMatches.length > 0 ? (
          <div className="grid gap-4">
            {recentMatches.map(match => (
              <MatchCard key={match.id} match={match} onUpdate={loadData} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Briefcase className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No matches yet</p>
            <p className="text-sm text-gray-600 mt-1">Browse job listings on LinkedIn or Indeed with the RogerThat extension installed to start matching.</p>
          </div>
        )}
      </div>
    </div>
  );
}
