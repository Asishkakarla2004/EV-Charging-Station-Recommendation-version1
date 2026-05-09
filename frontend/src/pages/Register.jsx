import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { API_BASE } from '../lib/api';

const roleOptions = [
  { value: 'user', label: 'EV User', icon: UserCircleIcon },
  { value: 'station_owner', label: 'Station Owner', icon: ShieldCheckIcon },
];

const featureCards = [
  ['Fast Onboarding', 'Create EV user and station owner accounts from the same clean access screen.'],
  ['Monochrome Design', 'A consistent black-and-white experience that shifts fully with the selected theme.'],
  ['Journey Ready', 'Move from account creation into route planning, bookings, and station management quickly.'],
];

const initialForm = {
  name: '',
  email: '',
  phone: '',
  role: 'user',
  password: '',
  confirmPassword: '',
  otp: '',
};

function generateDemoOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function showOtpPopup(otp) {
  window.alert(`Registration OTP: ${otp}`);
}

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const theme = isDark ? darkTheme : lightTheme;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      if (!awaitingVerification) {
        const otp = generateDemoOtp();
        setGeneratedOtp(otp);
        setAwaitingVerification(true);
        setMessage('A demo OTP has been generated. Paste it below to verify and create the account.');
        showOtpPopup(otp);
      } else {
        if (form.otp.trim() !== generatedOtp) {
          setMessage('The OTP you entered is incorrect.');
          return;
        }

        await axios.post(`${API_BASE}/auth/verify-otp`, {
          email: form.email,
          otp: form.otp,
        });

        const response = await axios.post(`${API_BASE}/auth/register`, form);
        setMessage(response.data.message || 'Registration successful. You can sign in now.');
        setGeneratedOtp('');
        setAwaitingVerification(false);
        setTimeout(() => navigate('/'), 900);
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`min-h-screen px-4 py-5 sm:px-8 lg:px-10 ${theme.page}`}>
      <div className={`mx-auto max-w-7xl rounded-[2rem] border p-5 shadow-[0_40px_140px_rgba(0,0,0,0.18)] sm:p-8 ${theme.outerShell}`}>
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className={`rounded-full border px-5 py-3 text-sm font-medium transition ${theme.toggleButton}`}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className={`overflow-hidden rounded-[2rem] border shadow-[0_16px_48px_rgba(0,0,0,0.12)] ${theme.panel}`}>
            <div className={`border-b px-8 py-8 ${theme.panelDivider}`}>
              <p className={`text-xs uppercase tracking-[0.35em] ${theme.eyebrow}`}>
                EV Smart Charging Platform
              </p>
              <h1 className={`mt-4 max-w-xl text-4xl font-bold leading-tight sm:text-5xl ${theme.textPrimary}`}>
                Launch a clean account experience for drivers and station owners.
              </h1>
              <p className={`mt-4 max-w-2xl text-base leading-7 ${theme.textMuted}`}>
                Register once, choose the right role, and step directly into a polished charging platform with route planning and operational dashboards.
              </p>
            </div>
            <div className="grid gap-4 px-8 py-8 md:grid-cols-3">
              {featureCards.map(([title, description]) => (
                <div key={title} className={`rounded-3xl border p-5 ${theme.tile}`}>
                  <p className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</p>
                  <p className={`mt-3 text-sm leading-6 ${theme.textMuted}`}>{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={`rounded-[2rem] border p-8 shadow-[0_16px_48px_rgba(0,0,0,0.12)] ${theme.panel}`}>
            <div className="mb-6 flex flex-wrap gap-3">
              <Link to="/" className={`rounded-full border px-5 py-2 text-sm transition ${theme.tabIdle}`}>
                Login
              </Link>
              <span className={`rounded-full border px-5 py-2 text-sm ${theme.tabActive}`}>
                Register
              </span>
            </div>

            <div className="mb-6">
              <p className={`text-xs uppercase tracking-[0.35em] ${theme.eyebrow}`}>Access Control</p>
              <h2 className={`mt-2 text-2xl font-semibold ${theme.textPrimary}`}>Create your charging identity</h2>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {roleOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, role: value }))}
                  className={`rounded-3xl border p-4 text-left transition ${
                    form.role === value ? theme.roleActive : theme.roleIdle
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <p className="mt-3 text-sm font-semibold">{label}</p>
                </button>
              ))}
            </div>

            {message ? (
              <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${theme.messageBox}`}>
                {message}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field theme={theme} label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
              <Field theme={theme} label="Email ID" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              <Field theme={theme} label="Phone Number" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Field theme={theme} label="Password" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
              <Field theme={theme} label="Confirm Password" type="password" value={form.confirmPassword} onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))} />
              {awaitingVerification ? (
                <Field theme={theme} label="Email Verification OTP" value={form.otp} onChange={(value) => setForm((current) => ({ ...current, otp: value }))} />
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${theme.submit}`}
              >
                {busy ? 'Please wait...' : awaitingVerification ? 'Verify OTP & Create Account' : `Register as ${form.role === 'station_owner' ? 'Station Owner' : 'EV User'}`}
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6">
              <Link to="/" className={`text-sm underline underline-offset-4 ${theme.textMuted}`}>
                Back to login
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ theme, label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className={`mb-2 block text-sm ${theme.textMuted}`}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${theme.input}`}
      />
    </label>
  );
}

const lightTheme = {
  page: 'bg-[#f3f1ec] text-[#111111]',
  outerShell: 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,243,238,0.96))]',
  toggleButton: 'border-black/10 bg-white text-black hover:border-black/20 hover:bg-[#f1f1f1]',
  panel: 'border-black/10 bg-white',
  panelDivider: 'border-black/10',
  tile: 'border-black/10 bg-[#f7f5f1]',
  tabActive: 'border-black bg-black text-white',
  tabIdle: 'border-black/10 bg-[#f7f5f1] text-black hover:bg-[#efede8]',
  roleActive: 'border-black bg-black text-white',
  roleIdle: 'border-black/10 bg-[#f7f5f1] text-black hover:bg-[#efede8]',
  messageBox: 'border-black/10 bg-[#f7f5f1] text-black',
  input: 'border-black/10 bg-[#f7f5f1] text-black placeholder:text-black/35 focus:border-black/35',
  submit: 'border-black bg-black text-white hover:opacity-90',
  eyebrow: 'text-[#9b6a3a]',
  textPrimary: 'text-black',
  textMuted: 'text-black/60',
};

const darkTheme = {
  page: 'bg-[#060606] text-white',
  outerShell: 'border-white/10 bg-[#0f0f0f]',
  toggleButton: 'border-white/15 bg-[#171717] text-white hover:border-white/30 hover:bg-[#202020]',
  panel: 'border-white/10 bg-[#1a1a1a]',
  panelDivider: 'border-white/10',
  tile: 'border-white/12 bg-[#232323]',
  tabActive: 'border-white bg-white text-black',
  tabIdle: 'border-white/10 bg-[#252525] text-white hover:bg-[#2a2a2a]',
  roleActive: 'border-white bg-white text-black',
  roleIdle: 'border-white/10 bg-[#252525] text-white hover:bg-[#2a2a2a]',
  messageBox: 'border-white/10 bg-[#232323] text-white',
  input: 'border-white/10 bg-[#232323] text-white placeholder:text-white/30 focus:border-white/40',
  submit: 'border-white bg-white text-black hover:opacity-90',
  eyebrow: 'text-[#c5a17a]',
  textPrimary: 'text-white',
  textMuted: 'text-white/60',
};

function UserCircleIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19c1.6-3 4-4.5 6.5-4.5S16.9 16 18.5 19" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ShieldCheckIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M12 3l6 2.7v5.8c0 4.2-2.6 7.9-6 9.5-3.4-1.6-6-5.3-6-9.5V5.7L12 3z" />
      <path d="M9.2 12.2l1.8 1.8 3.8-4" />
    </svg>
  );
}

function ArrowRightIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
