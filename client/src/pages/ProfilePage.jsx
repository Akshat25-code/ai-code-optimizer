import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import profileService from '../services/profileService';
import authService from '../services/authService';
import { API_BASE } from '../config';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TabButton = ({ id, active, onClick, children, icon }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group border`}
    style={{
      background: active ? 'var(--surface-2)' : 'transparent',
      borderColor: active ? 'var(--card-border)' : 'transparent',
      color: active ? 'var(--accent-cyan)' : 'var(--muted)',
    }}
  >
    {active && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-cyan)] shadow-[0_0_10px_var(--accent-cyan)]" />
    )}
    {active && (
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--glow-cyan)] to-transparent opacity-10" />
    )}
    <span className="text-lg relative z-10 transition-transform duration-300 group-hover:scale-110">{icon}</span>
    <span className="relative z-10">{children}</span>
  </button>
);

const InputField = ({ label, type = 'text', ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold uppercase tracking-wider text-muted ml-1">{label}</label>
    <input 
      type={type}
      className="w-full bg-[#0a0a0c] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]/50 transition-all font-medium"
      {...props}
    />
  </div>
);

const SelectField = ({ label, children, ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold uppercase tracking-wider text-muted ml-1">{label}</label>
    <select 
      className="w-full bg-[#0a0a0c] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]/50 transition-all cursor-pointer font-medium appearance-none"
      {...props}
    >
      {children}
    </select>
  </div>
);

const TextAreaField = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold uppercase tracking-wider text-muted ml-1">{label}</label>
    <textarea 
      className="w-full bg-[#0a0a0c] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]/50 transition-all resize-none font-medium custom-scrollbar font-sans"
      {...props}
    />
  </div>
);

const ActionButton = ({ children, onClick, disabled, primary = false, danger = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed
      ${primary 
        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]' 
        : danger 
          ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' 
          : 'bg-[var(--surface-2)] text-gray-300 border border-[var(--card-border)] hover:bg-[var(--surface-3)] hover:text-white'
      }
    `}
  >
    {primary && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />}
    <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
  </button>
);

const OverviewTab = ({ profile, onAvatarChange, onSaved }) => {
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setName(profile?.name || '');
    setEmail(profile?.email || '');
  }, [profile]);

  const save = async () => {
    setSaving(true); setMsg('');
    const res = await profileService.updateMe({ name, email });
    setSaving(false);
    setMsg(res.ok ? 'Account details updated successfully.' : (res.data?.detail || 'Failed to save account details'));
    if (res.ok && onSaved) onSaved();
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const res = await profileService.uploadAvatar(f);
    if (res.ok) {
      onAvatarChange(res.data.profile_picture);
      if (onSaved) onSaved();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="glass-frame p-6">
        <h3 className="text-lg font-bold text-[var(--fg-color)] mb-6 flex items-center gap-2"><span className="text-emerald-400">👤</span> Avatar & Identity</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <img src={profile?.profile_picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile?.email || 'user'}`} alt="avatar" className="w-24 h-24 rounded-full border-2 border-[var(--accent-cyan)] relative z-10 object-cover bg-[#050508]" />
            <label className="absolute -bottom-2 -right-2 bg-[var(--surface-3)] border border-[var(--card-border)] text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--accent-cyan)] transition-colors z-20 shadow-lg">
              <span className="text-sm">📷</span>
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
          </div>
          <div className="flex-1 space-y-4 w-full">
             <InputField label="Display Name" value={name} onChange={e=>setName(e.target.value)} placeholder="Alexander" />
             <InputField label="Email Address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="alex@example.com" />
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-[var(--card-border)] flex items-center justify-between">
          <span className={`text-sm font-medium ${msg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</span>
          <ActionButton onClick={save} disabled={saving} primary>{saving ? 'Syncing...' : 'Save Changes'}</ActionButton>
        </div>
      </div>
    </motion.div>
  );
};

const ProfileInfoTab = ({ profile, onUpdated }) => {
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.location?.city || '');
  const [country, setCountry] = useState(profile?.location?.country || '');
  const [jobTitle, setJobTitle] = useState(profile?.professional?.job_title || '');
  const [company, setCompany] = useState(profile?.professional?.company || '');
  const [experienceLevel, setExperienceLevel] = useState(profile?.professional?.experience_level || 'Intermediate');
  const [savingSection, setSavingSection] = useState(null);

  useEffect(() => {
    setBio(profile?.bio || '');
    setCity(profile?.location?.city || '');
    setCountry(profile?.location?.country || '');
    setJobTitle(profile?.professional?.job_title || '');
    setCompany(profile?.professional?.company || '');
    setExperienceLevel(profile?.professional?.experience_level || 'Intermediate');
  }, [profile]);

  const saveSection = async (section, data) => {
    setSavingSection(section);
    const res = await profileService.updateProfileSection(section, data);
    setSavingSection(null);
    if (res.ok && onUpdated) onUpdated();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="glass-frame p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg-color)] flex items-center gap-2"><span className="text-blue-400">📝</span> Biography</h3>
        </div>
        <TextAreaField label="Tell the world about yourself" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Full-stack developer with a passion for clean architecture..." rows={4} maxLength={500} />
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs font-mono text-muted">{bio.length}/500 chars</div>
          <ActionButton onClick={() => saveSection('profile', {bio})} disabled={savingSection === 'profile'} primary>
            {savingSection === 'profile' ? 'Saving...' : 'Update Bio'}
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-frame p-6">
          <h3 className="text-lg font-bold text-[var(--fg-color)] mb-4 flex items-center gap-2"><span className="text-orange-400">💼</span> Professional</h3>
          <div className="space-y-4">
            <InputField label="Job Title" value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="Senior Software Engineer" />
            <InputField label="Company" value={company} onChange={e=>setCompany(e.target.value)} placeholder="Tech Innovations Inc." />
            <SelectField label="Experience Level" value={experienceLevel} onChange={e=>setExperienceLevel(e.target.value)}>
              <option value="Beginner">Beginner (&lt; 2 years)</option>
              <option value="Intermediate">Intermediate (2-5 years)</option>
              <option value="Advanced">Advanced (5-10 years)</option>
              <option value="Expert">Expert (10+ years)</option>
            </SelectField>
          </div>
          <div className="mt-6 flex justify-end">
            <ActionButton onClick={() => saveSection('professional', {job_title: jobTitle, company, experience_level: experienceLevel})} disabled={savingSection === 'professional'} primary>
              {savingSection === 'professional' ? 'Saving...' : 'Update Role'}
            </ActionButton>
          </div>
        </div>

        <div className="glass-frame p-6">
          <h3 className="text-lg font-bold text-[var(--fg-color)] mb-4 flex items-center gap-2"><span className="text-purple-400">📍</span> Location</h3>
          <div className="space-y-4 flex-1">
            <InputField label="City" value={city} onChange={e=>setCity(e.target.value)} placeholder="San Francisco" />
            <InputField label="Country" value={country} onChange={e=>setCountry(e.target.value)} placeholder="United States" />
          </div>
          <div className="mt-6 flex justify-end">
            <ActionButton onClick={() => saveSection('location', {city, country})} disabled={savingSection === 'location'} primary>
              {savingSection === 'location' ? 'Saving...' : 'Update Location'}
            </ActionButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SocialLinksTab = ({ profile, onUpdated }) => {
  const [github, setGithub] = useState(profile?.social_links?.github || '');
  const [linkedin, setLinkedin] = useState(profile?.social_links?.linkedin || '');
  const [twitter, setTwitter] = useState(profile?.social_links?.twitter || '');
  const [website, setWebsite] = useState(profile?.social_links?.website || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGithub(profile?.social_links?.github || '');
    setLinkedin(profile?.social_links?.linkedin || '');
    setTwitter(profile?.social_links?.twitter || '');
    setWebsite(profile?.social_links?.website || '');
  }, [profile]);

  const saveSection = async () => {
    setSaving(true);
    const res = await profileService.updateProfileSection('social-links', {github, linkedin, twitter, website});
    setSaving(false);
    if (res.ok && onUpdated) onUpdated();
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-frame p-6 max-w-2xl">
       <h3 className="text-xl font-bold text-[var(--fg-color)] mb-6 flex items-center gap-2"><span className="text-pink-400">🔗</span> Digital Presence</h3>
       <div className="space-y-5">
         <InputField label="GitHub Profile URL" value={github} onChange={e=>setGithub(e.target.value)} placeholder="https://github.com/username" />
         <InputField label="LinkedIn Profile URL" value={linkedin} onChange={e=>setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/username" />
         <InputField label="Twitter / X handle" value={twitter} onChange={e=>setTwitter(e.target.value)} placeholder="@username" />
         <InputField label="Personal Website" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourdomain.com" />
       </div>
       <div className="mt-8 pt-6 border-t border-[var(--card-border)] flex justify-end">
         <ActionButton onClick={saveSection} disabled={saving} primary>{saving ? 'Syncing...' : 'Update Presence'}</ActionButton>
       </div>
    </motion.div>
  );
};


const PreferencesTab = ({ profile, onUpdated }) => {
  const { setTheme: applyThemeCtx } = useTheme();
  const [theme, setTheme] = useState(profile?.preferences?.theme || 'system');
  const [language, setLanguage] = useState(profile?.preferences?.language || 'auto');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    setTheme(profile?.preferences?.theme || 'system');
    setLanguage(profile?.preferences?.language || 'auto');
  }, [profile]);

  const save = async () => {
    setSaving(true);
    const res = await profileService.updatePreferences({ theme, language });
    setSaving(false);
    if (res.ok) onUpdated(res.data.preferences);
    applyThemeCtx(theme);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-frame p-6 max-w-xl">
      <h3 className="text-xl font-bold text-[var(--fg-color)] mb-6 flex items-center gap-2"><span className="text-yellow-400">🎨</span> App Preferences</h3>
      <div className="space-y-6">
        <SelectField label="Interface Theme" value={theme} onChange={e=>setTheme(e.target.value)}>
          <option value="system">💻 System Default</option>
          <option value="dark">🌙 Cyber Dark</option>
          <option value="light">☀️ Luminous Light</option>
        </SelectField>
        <SelectField label="Default Optimization Target Language" value={language} onChange={e=>setLanguage(e.target.value)}>
          <option value="auto">Auto Detect</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="typescript">TypeScript</option>
          <option value="java">Java</option>
          <option value="c++">C++</option>
          <option value="go">Go</option>
        </SelectField>
      </div>
      <div className="mt-8 pt-6 border-t border-[var(--card-border)] flex justify-end">
        <ActionButton onClick={save} disabled={saving} primary>Apply Preferences</ActionButton>
      </div>
    </motion.div>
  );
};

const SecurityTab = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const change = async () => {
    setSaving(true); setMsg('');
    const res = await profileService.changePassword(current, next);
    setSaving(false);
    setMsg(res.ok ? 'Password updated securely.' : (res.data?.detail || 'Authentication failed'));
    if (res.ok) { setCurrent(''); setNext(''); }
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-frame p-6 max-w-xl">
      <h3 className="text-xl font-bold text-[var(--fg-color)] mb-6 flex items-center gap-2"><span className="text-red-400">🛡️</span> Security Configuration</h3>
      <div className="space-y-5">
        <InputField label="Current Password" type="password" value={current} onChange={e=>setCurrent(e.target.value)} placeholder="••••••••" />
        <InputField label="New Password" type="password" value={next} onChange={e=>setNext(e.target.value)} placeholder="••••••••" />
      </div>
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--card-border)]">
        <span className={`text-sm font-medium ${msg.includes('securely') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</span>
        <ActionButton onClick={change} disabled={saving || !current || !next} primary>Update Password</ActionButton>
      </div>
    </motion.div>
  );
};

const AnalyticsTab = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      // Simulate network delay for effect
      await new Promise(r => setTimeout(r, 600));
      const res = await profileService.getAnalytics();
      setLoading(false);
      if (res.ok) setAnalytics(res.data);
    };
    loadAnalytics();
  }, []);

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent flex rounded-full animate-spin shadow-[0_0_15px_var(--accent-cyan)]" />
      <div className="text-muted font-mono animate-pulse uppercase tracking-widest text-xs">CompILING telemetry...</div>
    </div>
  );

  if (!analytics) return <div className="text-muted text-center py-12">Telemetry offline.</div>;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(5, 5, 8, 0.9)',
        titleColor: '#fff',
        bodyColor: '#a1a1aa', // text-muted
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      y: { display: false, beginAtZero: true },
      x: { 
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { family: 'JetBrains Mono', size: 10 } }
      }
    },
    interaction: { intersect: false, mode: 'index' },
  };

  const dummyLineData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        fill: true,
        data: [12, 19, 15, 25, 22, 30, 28].map(x => x * (analytics.recent_sessions || 1) / 30),
        borderColor: '#00f5d4', // accent-cyan
        backgroundColor: 'rgba(0, 245, 212, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      }
    ]
  };

  const langs = Object.entries(analytics.languages_used || {});
  const dummyBarData = {
    labels: langs.slice(0,5).map(l => l[0]) || ['JS', 'PY', 'TS'],
    datasets: [
      {
        data: langs.slice(0,5).map(l => l[1]) || [10, 5, 2],
        backgroundColor: [
          'rgba(0, 245, 212, 0.8)',
          'rgba(52, 211, 153, 0.8)',
          'rgba(56, 189, 248, 0.8)',
          'rgba(167, 139, 250, 0.8)',
          'rgba(244, 114, 182, 0.8)',
        ],
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="glass-frame p-5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-teal-500/20 transition-colors" />
           <div className="text-3xl font-black font-mono text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] mb-1">{analytics.total_sessions}</div>
           <div className="text-xs uppercase tracking-widest text-muted font-bold">Total Operations</div>
         </div>
         <div className="glass-frame p-5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-colors" />
           <div className="text-3xl font-black font-mono text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] mb-1">{analytics.recent_sessions}</div>
           <div className="text-xs uppercase tracking-widest text-muted font-bold">Recent (30D)</div>
         </div>
         <div className="glass-frame p-5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-colors" />
           <div className="text-3xl font-black font-mono text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] mb-1">{analytics.total_optimizations}</div>
           <div className="text-xs uppercase tracking-widest text-muted font-bold">Optimizations</div>
         </div>
         <div className="glass-frame p-5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-colors" />
           <div className="text-3xl font-black font-mono text-purple-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] mb-1">{analytics.account_age_days}</div>
           <div className="text-xs uppercase tracking-widest text-muted font-bold">Days Active</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-frame p-6">
           <h4 className="text-sm font-bold text-[var(--fg-color)] uppercase tracking-wider mb-6 flex items-center gap-2"><span className="text-[var(--accent-cyan)]">📈</span> Activity Matrix</h4>
           <div className="w-full h-64">
             <Line options={chartOptions} data={dummyLineData} />
           </div>
        </div>
        <div className="glass-frame p-6">
           <h4 className="text-sm font-bold text-[var(--fg-color)] uppercase tracking-wider mb-6 flex items-center gap-2"><span className="text-blue-400">⌨️</span> Syntax Distribution</h4>
           {langs.length > 0 ? (
             <div className="w-full h-64 flex items-end">
               <Bar options={{...chartOptions, scales:{y:{display:false}, x:{grid:{display:false}, ticks:{color:'rgba(255,255,255,0.5)', font:{size:10, family:'Inter'}}}}}} data={dummyBarData} />
             </div>
           ) : (
             <div className="h-full flex items-center justify-center text-muted text-sm border border-dashed border-[var(--card-border)] rounded-xl">Insufficient Data</div>
           )}
        </div>
      </div>
    </motion.div>
  );
};

const ConnectedAccountsTab = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const refresh = async () => {
    setLoading(true);
    const res = await profileService.listConnected();
    setLoading(false);
    if (res.ok) setAccounts(res.data.accounts || []);
  };
  
  useEffect(() => { refresh(); }, []);
  
  const unlink = async (p) => {
    const res = await profileService.unlinkProvider(p);
    if (res.ok) refresh();
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-frame p-6 max-w-2xl">
      <h3 className="text-xl font-bold text-[var(--fg-color)] mb-2 flex items-center gap-2"><span className="text-indigo-400">🔌</span> Integration Hub</h3>
      <p className="text-sm text-muted mb-8">Connect external services for faster authentication and repository access.</p>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-[#0a0a0c] rounded-xl border border-[var(--card-border)]" />
          <div className="h-16 bg-[#0a0a0c] rounded-xl border border-[var(--card-border)]" />
        </div>
      ) : (
        <div className="space-y-4">
          {['google', 'github'].map(provider => {
            const isConnected = accounts.some(a => a.provider === provider);
            const pName = provider.charAt(0).toUpperCase() + provider.slice(1);
            
            return (
              <div key={provider} className={`flex items-center justify-between p-4 rounded-xl border ${isConnected ? 'bg-[var(--surface-2)] border-[var(--accent-cyan)]/30' : 'bg-[#0a0a0c] border-[var(--card-border)]'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-inner ${provider === 'github' ? 'bg-[#24292e] text-white' : 'bg-white text-gray-800'}`}>
                    {provider === 'github' ? 'GH' : 'G'}
                  </div>
                  <div>
                    <div className="font-bold text-[var(--fg-color)]">{pName}</div>
                    <div className="text-xs text-muted">{isConnected ? 'Connected & Authorized' : 'Not Connected'}</div>
                  </div>
                </div>
                {isConnected ? (
                  <ActionButton onClick={() => unlink(provider)} danger>Revoke Access</ActionButton>
                ) : (
                  <ActionButton onClick={async () => {
                    const res = await authService.loginWithProvider(provider);
                    if (res.success) refresh();
                  }}>Connect</ActionButton>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

const PrivacyTab = () => {
  const [isExporting, setIsExporting] = useState(false);

  const downloadJSON = async () => {
    const res = await profileService.exportProfile();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'profile_export.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      const res = await profileService.exportProfilePDF();
      if (res.ok && res.status === 200) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; 
        a.download = `ai_code_optimizer_export_${new Date().toISOString().split('T')[0]}.pdf`; 
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert(`Failed to export PDF. Status: ${res.status}`);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const del = async () => {
    if (!window.confirm('CRITICAL ACTION: Are you absolutely sure you want to delete your account? All data will be wiped permanently.')) return;
    const res = await profileService.deleteAccount();
    if (res.ok) {
        localStorage.clear();
        window.location.href = '/';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-2xl">
      <div className="glass-frame p-6">
        <h3 className="text-xl font-bold text-[var(--fg-color)] mb-2 flex items-center gap-2"><span className="text-blue-400">💾</span> Data Portability</h3>
        <p className="text-sm text-muted mb-6">Download a complete copy of your personal data, optimization history, and analytics.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0a0a0c] p-5 rounded-xl border border-[var(--card-border)] hover:border-[var(--accent-cyan)] transition-colors group cursor-pointer" onClick={downloadJSON}>
            <div className="text-2xl mb-3 group-hover:scale-110 transition-transform origin-left">{'{ }'}</div>
            <h4 className="font-bold text-[var(--fg-color)] mb-1">Developer Export</h4>
            <p className="text-xs text-muted mb-4">Raw JSON format suitable for programmatic analysis or migration.</p>
            <span className="text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-wider">Download JSON →</span>
          </div>

          <div className="bg-[#0a0a0c] p-5 rounded-xl border border-[var(--card-border)] hover:border-emerald-500 transition-colors group cursor-pointer" onClick={!isExporting ? downloadPDF : undefined}>
            <div className="text-2xl mb-3 group-hover:scale-110 transition-transform origin-left">📄</div>
            <h4 className="font-bold text-[var(--fg-color)] mb-1">Printable Report</h4>
            <p className="text-xs text-muted mb-4">A structured PDF document containing your profile summary.</p>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">{isExporting ? 'Generating...' : 'Download PDF →'}</span>
          </div>
        </div>
      </div>

      <div className="glass-frame p-6 border-red-500/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">⚠️ Danger Zone</h3>
        <p className="text-sm text-gray-400 mb-6">Deleting your account is permanent. All associated data will be removed from our servers immediately.</p>
        <ActionButton onClick={del} danger>PERMANENTLY DELETE ACCOUNT</ActionButton>
      </div>
    </motion.div>
  );
};


const ProfilePage = () => {
  const { user, loading, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('overview');
  const [sessionCount, setSessionCount] = useState(0);

  const loadSessionCount = async () => {
    try {
      const sessionsRes = await fetch(`${API_BASE}/opt-sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessionCount(sessionsData.length);
      }
    } catch (error) {
      console.error('Failed to load sessions count:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const res = await profileService.getMe();
      if (res.ok) setProfile(res.data);
      await loadSessionCount();
    };
    init();
  }, []);

  const tabs = useMemo(() => ([
    { id: 'overview', label: 'Identity', icon: '👤' },
    { id: 'profile', label: 'Biography', icon: '📝' },
    { id: 'links', label: 'Social', icon: '🔗' },
    { id: 'preferences', label: 'Platform', icon: '🎨' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'accounts', label: 'Integrations', icon: '🔌' },
    { id: 'analytics', label: 'Telemetry', icon: '📊' },
    { id: 'data', label: 'Privacy', icon: '💾' },
  ]), []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-color)]">
      <div className="absolute inset-0 bg-cyber-grid opacity-10" />
      <div className="w-16 h-16 border-4 border-[var(--accent-cyan)] border-t-transparent flex rounded-full animate-spin shadow-[0_0_20px_var(--accent-cyan)] relative z-10" />
    </div>
  );
  
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center relative bg-[var(--bg-color)]">
      <div className="glass-frame p-12 text-center max-w-md w-full mx-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <div className="text-5xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] inline-block rounded-full bg-[var(--surface-2)] border border-[var(--card-border)] p-4">🔒</div>
        <h2 className="text-2xl font-bold text-[var(--fg-color)] mb-3 tracking-tight">Access Restricted</h2>
        <p className="text-muted leading-relaxed font-medium">Please authenticate to access your personal dashboard and telemetry data.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative min-h-[calc(100vh-80px)]">
      {/* Subtle Background Glows */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-[var(--accent-cyan)] opacity-[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500 opacity-[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
        
        {/* Left Sidebar Layout */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6">
          
          {/* User Profile Mini-Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-frame p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--glow-cyan)] to-transparent opacity-5" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-[var(--accent-cyan)] rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
                <img src={user?.profile_picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.email || 'user'}`} alt="avatar" className="w-16 h-16 rounded-full border-2 border-[#15151a] relative z-10 object-cover bg-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-[var(--fg-color)] truncate tracking-tight">{user?.name || 'Authorized User'}</h1>
                <div className="text-xs text-[var(--accent-cyan)] font-mono truncate mt-0.5">ID: {user?.id?.substring(0,8) || 'xxxx-xxxx'}</div>
              </div>
            </div>
            
            <div className="mt-6 pt-5 border-t border-[var(--card-border)] grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-sm font-medium text-[var(--fg-color)]">Online</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Completion</div>
                <div className="text-sm font-bold font-mono text-[var(--fg-color)]">{profile?.profile_completion || 0}%</div>
                <div className="w-full h-1 bg-[var(--surface-3)] mt-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${profile?.profile_completion || 0}%` }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation Sidebar */}
          <motion.nav initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 custom-scrollbar hide-scrollbar-on-mobile">
            {tabs.map(t => (
              <TabButton key={t.id} id={t.id} icon={t.icon} active={tab===t.id} onClick={setTab}>{t.label}</TabButton>
            ))}
          </motion.nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'overview' && <OverviewTab profile={profile} onAvatarChange={(url)=>{setProfile(p=>({...p, profile_picture: url})); refresh()}} />}
              {tab === 'profile' && <ProfileInfoTab profile={profile} onUpdated={async () => { const res = await profileService.getMe(); if (res.ok) setProfile(res.data); }} />}
              {tab === 'links' && <SocialLinksTab profile={profile} onUpdated={async () => { const res = await profileService.getMe(); if (res.ok) setProfile(res.data); }} />}
              {tab === 'preferences' && <PreferencesTab profile={profile} onUpdated={(prefs)=>setProfile(p=>({...p, preferences: prefs}))} />}
              {tab === 'security' && <SecurityTab />}
              {tab === 'accounts' && <ConnectedAccountsTab />}
              {tab === 'analytics' && <AnalyticsTab />}
              {tab === 'data' && <PrivacyTab />}
            </motion.div>
          </AnimatePresence>
        </div>
        
      </div>
    </div>
  );
};

export default ProfilePage;
