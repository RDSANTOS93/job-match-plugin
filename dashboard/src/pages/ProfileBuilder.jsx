import { useState, useEffect } from 'react';
import { Plus, X, Save, Loader, Download } from 'lucide-react';
import api from '../api/client';

export default function ProfileBuilder() {
  const [profile, setProfile] = useState({
    name: '', headline: '', summary: '', skills: [], experience: [], education: [], ambitions: '', linkedin_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api.get('/profile').then(res => {
      setProfile({ ...profile, ...res.data });
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/profile', profile);
      if (profile.ambitions) await api.put('/profile/ambitions', { ambitions: profile.ambitions });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Failed to save profile');
    }
    setSaving(false);
  }

  async function handleLinkedInImport() {
    if (!profile.linkedin_url) return;
    setImporting(true);
    try {
      await api.post('/profile/import', { linkedin_url: profile.linkedin_url });
      const res = await api.get('/profile');
      setProfile({ ...profile, ...res.data });
    } catch (e) {
      alert('Import failed. Use the browser extension on your LinkedIn profile for best results.');
    }
    setImporting(false);
  }

  function addSkill() {
    const skill = skillInput.trim();
    if (skill && !profile.skills.includes(skill)) {
      setProfile({ ...profile, skills: [...profile.skills, skill] });
      setSkillInput('');
    }
  }

  function removeSkill(skill) {
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
  }

  function addExperience() {
    setProfile({ ...profile, experience: [...profile.experience, { title: '', company: '', duration: '', description: '' }] });
  }

  function updateExperience(i, field, value) {
    const exp = [...profile.experience];
    exp[i] = { ...exp[i], [field]: value };
    setProfile({ ...profile, experience: exp });
  }

  function removeExperience(i) {
    setProfile({ ...profile, experience: profile.experience.filter((_, idx) => idx !== i) });
  }

  function addEducation() {
    setProfile({ ...profile, education: [...profile.education, { school: '', degree: '', field: '', year: '' }] });
  }

  function updateEducation(i, field, value) {
    const edu = [...profile.education];
    edu[i] = { ...edu[i], [field]: value };
    setProfile({ ...profile, education: edu });
  }

  function removeEducation(i) {
    setProfile({ ...profile, education: profile.education.filter((_, idx) => idx !== i) });
  }

  const inputClass = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500 placeholder-gray-600";
  const labelClass = "block text-sm font-medium text-gray-400 mb-1";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-gray-500 text-sm">Build your profile so RogerThat can find your best matches</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : saved ? 'Saved!' : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </div>

      <div className="space-y-8">
        {/* LinkedIn Import */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Download className="w-4 h-4 text-primary-400" /> Import from LinkedIn</h2>
          <p className="text-sm text-gray-500 mb-3">Paste your LinkedIn profile URL, or use the browser extension for better results.</p>
          <div className="flex gap-2">
            <input type="url" value={profile.linkedin_url || ''} onChange={e => setProfile({ ...profile, linkedin_url: e.target.value })}
              placeholder="https://www.linkedin.com/in/yourname" className={`${inputClass} flex-1`} />
            <button onClick={handleLinkedInImport} disabled={importing || !profile.linkedin_url}
              className="px-4 py-2 bg-primary-600/20 text-primary-300 rounded-lg hover:bg-primary-600/30 transition-colors disabled:opacity-50 whitespace-nowrap">
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </section>

        {/* Basic Info */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Basic Info</h2>
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })}
              placeholder="Jane Smith" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Headline</label>
            <input type="text" value={profile.headline || ''} onChange={e => setProfile({ ...profile, headline: e.target.value })}
              placeholder="Senior Software Engineer | AI Enthusiast" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Summary</label>
            <textarea value={profile.summary || ''} onChange={e => setProfile({ ...profile, summary: e.target.value })} rows={3}
              placeholder="Brief overview of your professional background..." className={inputClass} />
          </div>
        </section>

        {/* Skills */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.skills?.map(skill => (
              <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-primary-600/15 text-primary-300 rounded-full text-sm">
                {skill}
                <button onClick={() => removeSkill(skill)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="Type a skill and press Enter" className={`${inputClass} flex-1`} />
            <button onClick={addSkill} className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"><Plus className="w-4 h-4" /></button>
          </div>
        </section>

        {/* Experience */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Experience</h2>
            <button onClick={addExperience} className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="space-y-4">
            {profile.experience?.map((exp, i) => (
              <div key={i} className="relative bg-gray-800/50 rounded-lg p-4 space-y-3">
                <button onClick={() => removeExperience(i)} className="absolute top-3 right-3 text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Job Title</label>
                    <input type="text" value={exp.title || ''} onChange={e => updateExperience(i, 'title', e.target.value)} placeholder="Software Engineer" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Company</label>
                    <input type="text" value={exp.company || ''} onChange={e => updateExperience(i, 'company', e.target.value)} placeholder="Acme Corp" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Duration</label>
                  <input type="text" value={exp.duration || ''} onChange={e => updateExperience(i, 'duration', e.target.value)} placeholder="Jan 2022 - Present" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea value={exp.description || ''} onChange={e => updateExperience(i, 'description', e.target.value)} rows={2}
                    placeholder="Key responsibilities and achievements..." className={inputClass} />
                </div>
              </div>
            ))}
            {(!profile.experience || profile.experience.length === 0) && (
              <p className="text-sm text-gray-600 text-center py-4">No experience added yet</p>
            )}
          </div>
        </section>

        {/* Education */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Education</h2>
            <button onClick={addEducation} className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="space-y-4">
            {profile.education?.map((edu, i) => (
              <div key={i} className="relative bg-gray-800/50 rounded-lg p-4 space-y-3">
                <button onClick={() => removeEducation(i)} className="absolute top-3 right-3 text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>School</label>
                    <input type="text" value={edu.school || ''} onChange={e => updateEducation(i, 'school', e.target.value)} placeholder="University of..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Degree</label>
                    <input type="text" value={edu.degree || ''} onChange={e => updateEducation(i, 'degree', e.target.value)} placeholder="BSc Computer Science" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Field</label>
                    <input type="text" value={edu.field || ''} onChange={e => updateEducation(i, 'field', e.target.value)} placeholder="Computer Science" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Year</label>
                    <input type="text" value={edu.year || ''} onChange={e => updateEducation(i, 'year', e.target.value)} placeholder="2020" className={inputClass} />
                  </div>
                </div>
              </div>
            ))}
            {(!profile.education || profile.education.length === 0) && (
              <p className="text-sm text-gray-600 text-center py-4">No education added yet</p>
            )}
          </div>
        </section>

        {/* Career Ambitions */}
        <section className="bg-gray-900 border border-primary-800/30 rounded-xl p-5">
          <h2 className="font-semibold mb-1">Career Ambitions</h2>
          <p className="text-sm text-gray-500 mb-3">This is what makes RogerThat different — we match based on where you're heading, not just where you've been.</p>
          <textarea value={profile.ambitions || ''} onChange={e => setProfile({ ...profile, ambitions: e.target.value })} rows={5}
            placeholder="Where do you see yourself in 2-3 years? What kind of role are you growing toward? What matters most to you in your next position? Are you looking to shift industries or specializations?"
            className={inputClass} />
        </section>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Profile Saved!' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
