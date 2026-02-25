import { ThumbsUp, ThumbsDown, ExternalLink, MapPin, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScoreBadge from './ScoreBadge';
import api from '../api/client';

const factorLabels = {
  skillMatch: 'Skills',
  experienceMatch: 'Experience',
  ambitionAlign: 'Ambition',
  preferenceMatch: 'Preferences',
  growthPotential: 'Growth',
};

export default function MatchCard({ match, onUpdate }) {
  const navigate = useNavigate();

  async function handleFeedback(rating) {
    try {
      await api.post(`/matches/${match.id}/feedback`, { rating });
      onUpdate?.();
    } catch (e) {
      console.error('Feedback error:', e);
    }
  }

  const factors = match.match_factors || {};
  const isNew = match.status === 'new';

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-5 transition-all hover:border-primary-600/50 cursor-pointer ${isNew ? 'border-primary-600/30' : 'border-gray-800'}`}
      onClick={() => navigate(`/matches/${match.id}`)}
    >
      <div className="flex items-start gap-4">
        <ScoreBadge score={match.score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-100 truncate">{match.title}</h3>
            {isNew && <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary-600/20 text-primary-300 rounded-full">New</span>}
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{match.company || 'Unknown'}</span>
            {match.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{match.location}</span>}
          </div>

          <p className="mt-2 text-sm text-gray-400 line-clamp-2">{match.explanation}</p>

          {/* Factor bars */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            {Object.entries(factorLabels).map(([key, label]) => (
              <div key={key}>
                <div className="text-[10px] text-gray-500 mb-1">{label}</div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${factors[key] || 0}%`,
                      backgroundColor: (factors[key] || 0) >= 80 ? '#10b981' : (factors[key] || 0) >= 60 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleFeedback('thumbs_up')}
            className={`p-2 rounded-lg transition-colors ${match.status === 'interested' ? 'bg-green-600/20 text-green-400' : 'text-gray-500 hover:text-green-400 hover:bg-gray-800'}`}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFeedback('thumbs_down')}
            className={`p-2 rounded-lg transition-colors ${match.status === 'not_interested' ? 'bg-red-600/20 text-red-400' : 'text-gray-500 hover:text-red-400 hover:bg-gray-800'}`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>

        {match.url && (
          <a
            href={match.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-300 bg-primary-600/10 rounded-lg hover:bg-primary-600/20 transition-colors"
          >
            View Job <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
