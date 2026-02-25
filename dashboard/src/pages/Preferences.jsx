import { useState, useEffect } from 'react';
import { Save, Loader, Plus, X } from 'lucide-react';
import api from '../api/client';

export default function Preferences() {
  const [prefs, setPrefs] = useState({
    industries: [], roles: [], salaryMin: '', salaryMax: '',
    locations: [], remotePreference: '', companySizes: [], dealbreakers: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inputs, setInputs] = useState({ industry: '', role: '', location: '', dealbreaker: '' });

  useEffect(() => {
    api.get('/profile').then(res => {
      if (res.data.preferences && Object.keys(res.data.preferences).length > 0) {
        setPrefs({ ...prefs, ...res.data.preferences });
      }
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/profile/preferences', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Failed to save preferences');
    }
    setSaving(false);
  }

  function addTag(field, inputKey) {
    const value = inputs[inputKey]?.trim();
    if (value && !prefs[field].includes(value)) {
      setPrefs({ ...prefs, [field]: [...prefs[field], value] });
      setInputs({ ...inputs, [inputKey]: '' });
    }
  }

  function removeTag(field, value) {
    setPrefs({ ...prefs, [field]: prefs[field].filter(v => v !== value) });
  }

  function toggleCompanySize(size) {
    const sizes = prefs.companySizes || [];
    setPrefs({
      ...prefs,
      companySizes: sizes.includes(size) ? sizes.filter(s => s !== size) : [...sizes, size],
    });
  }

  const inputClass = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500 placeholder-gray-600";
  const labelClass = "block text-sm font-medium text-gray-400 mb-1";

  function TagInput({ label, field, inputKey, placeholder }) {
    return (
      <div>
        <label className={labelClass}>{label}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(prefs[field] || []).map(tag => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-primary-600/15 text-primary-300 rounded-full text-sm">
              {tag}
              <button onClick={() => removeTag(field, tag)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={inputs[inputKey] || ''} onChange={e => setInputs({ ...inputs, [inputKey]: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(field, inputKey))}
            placeholder={placeholder} className={`${inputClass} flex-1`} />
          <button onClick={() => addTag(field, inputKey)} className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Preferences</h1>
          <p className="text-gray-500 text-sm">Tell us what you're looking for so we can filter matches</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : saved ? 'Saved!' : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </div>

      <div className="space-y-6">
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <TagInput label="Target Industries" field="industries" inputKey="industry" placeholder="e.g. FinTech, Healthcare, AI..." />
          <TagInput label="Target Roles" field="roles" inputKey="role" placeholder="e.g. Senior Engineer, Product Manager..." />
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <h2 className="font-semibold">Salary Range</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Minimum</label>
              <input type="number" value={prefs.salaryMin || ''} onChange={e => setPrefs({ ...prefs, salaryMin: e.target.value })}
                placeholder="50000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Maximum</label>
              <input type="number" value={prefs.salaryMax || ''} onChange={e => setPrefs({ ...prefs, salaryMax: e.target.value })}
                placeholder="120000" className={inputClass} />
            </div>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <TagInput label="Preferred Locations" field="locations" inputKey="location" placeholder="e.g. London, Remote, New York..." />

          <div>
            <label className={labelClass}>Remote Preference</label>
            <div className="grid grid-cols-4 gap-2">
              {['Remote', 'Hybrid', 'On-site', 'No preference'].map(option => (
                <button key={option} onClick={() => setPrefs({ ...prefs, remotePreference: option })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    prefs.remotePreference === option
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div>
            <label className={labelClass}>Company Size</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {['Startup', 'SMB', 'Mid-market', 'Enterprise'].map(size => (
                <button key={size} onClick={() => toggleCompanySize(size)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (prefs.companySizes || []).includes(size)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {size}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-900 border border-red-900/30 rounded-xl p-5">
          <TagInput label="Dealbreakers (auto-reject if present)" field="dealbreakers" inputKey="dealbreaker"
            placeholder="e.g. Travel >25%, Contract only, No equity..." />
        </section>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Preferences Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
