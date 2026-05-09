import { useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { API_BASE } from '../lib/api';

const roleOptions = [
  { value: 'user', label: 'EV User', icon: UserCircleIcon },
  { value: 'station_owner', label: 'Station Owner', icon: ShieldCheckIcon },
  { value: 'admin', label: 'Admin', icon: ControlIcon },
];

const initialRegister = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  otp: '',
  role: 'user',
};

const initialReset = {
  email: '',
  otp: '',
  password: '',
  confirmPassword: '',
};

function generateDemoOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function showOtpPopup(contextLabel, otp) {
  window.alert(`${contextLabel} OTP: ${otp}`);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('user');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [resetForm, setResetForm] = useState(initialReset);
  const [message, setMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const theme = isDark ? darkTheme : lightTheme;
  const heading = useMemo(
    () => (mode === 'register' ? 'Create your charging identity' : 'Sign into the platform'),
    [mode]
  );

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        ...loginForm,
        role,
      });
      const data = response.data;

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'station_owner') {
        navigate('/station-owner');
        return;
      }

      if (data.user.role === 'admin') {
        navigate('/admin');
        return;
      }

      navigate('/dashboard/home');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to log in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      if (!awaitingVerification) {
        if (registerForm.password !== registerForm.confirmPassword) {
          setMessage('Password confirmation does not match password.');
          return;
        }

        const generatedOtp = generateDemoOtp();
        setDevOtp(generatedOtp);
        setAwaitingVerification(true);
        setMessage('A demo OTP has been generated. Paste it below to verify your email and finish registration.');
        showOtpPopup('Registration', generatedOtp);
      } else {
        if (registerForm.otp.trim() !== devOtp) {
          setMessage('The OTP you entered is incorrect.');
          return;
        }

        await axios.post(`${API_BASE}/auth/verify-otp`, {
          email: registerForm.email,
          otp: registerForm.otp,
        });

        const response = await axios.post(`${API_BASE}/auth/register`, registerForm);
        const data = response.data;
        const generatedUsername =
          data.username ||
          registerForm.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') ||
          'evuser';

        setMessage(data.message || `Account created for ${generatedUsername}. You can sign in now.`);
        setAwaitingVerification(false);
        setDevOtp('');
        setMode('login');
        setRegisterForm(initialRegister);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Registration failed. If the app is running on a different local port, restart the backend and try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotStart(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, {
        email: resetForm.email,
      });
      const generatedOtp = generateDemoOtp();
      setDevOtp(generatedOtp);
      setMessage('A demo OTP has been generated. Paste it below with your new password.');
      showOtpPopup('Password reset', generatedOtp);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Unable to send OTP.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      if (resetForm.otp.trim() !== devOtp) {
        setMessage('The OTP you entered is incorrect.');
        return;
      }

      if (resetForm.password !== resetForm.confirmPassword) {
        setMessage('New password and confirm password do not match.');
        return;
      }

      await axios.post(`${API_BASE}/auth/verify-otp`, {
        email: resetForm.email,
        otp: resetForm.otp,
      });
      const response = await axios.post(`${API_BASE}/auth/reset-password`, resetForm);
      setMessage(response.data.message || 'Password reset successfully.');
      setDevOtp('');
      setShowForgotPassword(false);
      setResetForm(initialReset);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Password reset failed.'
      );
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage('');
    setDevOtp('');
    setAwaitingVerification(false);
    if (nextMode === 'login') {
      setShowForgotPassword(false);
    }
  }

  return (
    <div className={`h-screen overflow-hidden px-3 py-3 sm:px-5 lg:px-6 ${theme.page}`}>
      <div className={`mx-auto flex h-full max-w-6xl flex-col rounded-[2rem] border p-4 shadow-[0_40px_140px_rgba(0,0,0,0.18)] sm:p-5 ${theme.outerShell}`}>
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${theme.toggleButton}`}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <div className="mx-auto grid h-full min-h-0 max-w-6xl flex-1 gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <section className={`flex min-h-0 items-center rounded-[2rem] border shadow-[0_16px_48px_rgba(0,0,0,0.12)] ${theme.panel}`}>
            <div className="w-full px-6 py-8 sm:px-7 sm:py-10">
              <p className={`text-xs uppercase tracking-[0.35em] ${theme.eyebrow}`}>
                EV Smart Charging Platform
              </p>
              <h1 className={`mt-4 max-w-xl text-[2.35rem] font-bold leading-[1.02] sm:text-[3.1rem] ${theme.textPrimary}`}>
                From Route to Recharge — All in One Place
              </h1>
              <p className={`mt-3 max-w-2xl text-sm leading-6 sm:text-[15px] sm:leading-7 ${theme.textMuted}`}>
                Plan routes, discover stations along the journey, manage bookings, and monitor revenue from one minimal dashboard system.
              </p>
            </div>
          </section>

          <section className={`min-h-0 overflow-y-auto rounded-[2rem] border p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.12)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${theme.panel}`}>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={`text-xs uppercase tracking-[0.35em] ${theme.eyebrow}`}>Access Control</p>
                <h2 className={`mt-2 text-2xl font-semibold ${theme.textPrimary}`}>{heading}</h2>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                {['login', 'register'].map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => switchMode(entry)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      mode === entry ? theme.tabActive : theme.tabIdle
                    }`}
                  >
                    {entry === 'login' ? 'Login' : 'Register'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {roleOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setRole(value);
                    setRegisterForm((current) => ({ ...current, role: value }));
                  }}
                  className={`min-w-0 rounded-[18px] border px-3 py-2.5 text-left transition ${
                    role === value ? theme.roleActive : theme.roleIdle
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <p className="min-w-0 break-words text-[13px] font-semibold leading-5">{label}</p>
                  </div>
                </button>
              ))}
            </div>

            {message ? (
              <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${theme.messageBox}`}>
                <div className="flex items-start gap-2">
                  <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </div>
              </div>
            ) : null}

            {devOtp ? (
              <div className={`mb-4 rounded-2xl border border-dashed px-4 py-3 text-sm ${theme.devOtp}`}>
                Development OTP preview: <span className={`font-semibold ${theme.textPrimary}`}>{devOtp}</span>
              </div>
            ) : null}

            {mode === 'login' && (
              <div className="space-y-6">
                <form className="space-y-4" onSubmit={handleLogin}>
                  <Field theme={theme} label="Email" value={loginForm.email} onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))} />
                  <Field theme={theme} label="Password" type="password" value={loginForm.password} onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))} />
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword((current) => !current);
                      setMessage('');
                      setDevOtp('');
                    }}
                    className={`text-left text-sm font-semibold underline underline-offset-4 ${theme.textMuted}`}
                  >
                    {showForgotPassword ? 'Hide Forgot Password' : 'Forgot Password'}
                  </button>
                  <Submit theme={theme} busy={busy} label={`Login as ${role === 'station_owner' ? 'Station Owner' : role === 'admin' ? 'Admin' : 'EV User'}`} />
                </form>

                {showForgotPassword ? (
                  <div className={`rounded-[24px] border p-4 ${theme.tile}`}>
                    <div className="space-y-5">
                      <form className="space-y-4" onSubmit={handleForgotStart}>
                        <Field theme={theme} label="Email ID" value={resetForm.email} onChange={(value) => setResetForm((current) => ({ ...current, email: value }))} />
                        <Submit theme={theme} busy={busy} label="Send OTP" />
                      </form>

                      <form className="space-y-4" onSubmit={handleReset}>
                        <Field theme={theme} label="OTP" value={resetForm.otp} onChange={(value) => setResetForm((current) => ({ ...current, otp: value }))} />
                        <Field theme={theme} label="New Password" type="password" value={resetForm.password} onChange={(value) => setResetForm((current) => ({ ...current, password: value }))} />
                        <Field theme={theme} label="Confirm Password" type="password" value={resetForm.confirmPassword} onChange={(value) => setResetForm((current) => ({ ...current, confirmPassword: value }))} />
                        <Submit theme={theme} busy={busy} label="Reset Password" />
                      </form>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {mode === 'register' && (
              <form className="space-y-4" onSubmit={handleRegister}>
                <Field theme={theme} label="Name" value={registerForm.name} onChange={(value) => setRegisterForm((current) => ({ ...current, name: value }))} />
                <Field theme={theme} label="Email ID" value={registerForm.email} onChange={(value) => setRegisterForm((current) => ({ ...current, email: value }))} />
                <Field theme={theme} label="Phone Number" value={registerForm.phone} onChange={(value) => setRegisterForm((current) => ({ ...current, phone: value }))} />
                <Field theme={theme} label="Password" type="password" value={registerForm.password} onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))} />
                <Field theme={theme} label="Confirm Password" type="password" value={registerForm.confirmPassword} onChange={(value) => setRegisterForm((current) => ({ ...current, confirmPassword: value }))} />

                {awaitingVerification ? (
                  <div className={`rounded-[24px] border p-4 ${theme.tile}`}>
                    <p className={`mb-4 text-sm leading-6 ${theme.textMuted}`}>
                      OTP verification is part of registration now. Enter the OTP sent to your email to confirm the address is valid.
                    </p>
                    <Field theme={theme} label="Email Verification OTP" value={registerForm.otp} onChange={(value) => setRegisterForm((current) => ({ ...current, otp: value }))} />
                  </div>
                ) : null}

                <Submit theme={theme} busy={busy} label={awaitingVerification ? 'Verify Email & Finish Registration' : 'Create Account & Send OTP'} />
              </form>
            )}

            <div className="mt-6">
              <Link to="/register" className={`text-sm underline underline-offset-4 ${theme.textMuted}`}>
                Open dedicated registration page
              </Link>
            </div>

            {mode === 'login' ? (
              <div className={`mt-6 rounded-[24px] border border-dashed p-5 ${theme.tile}`}>
                <p className={`text-xs uppercase tracking-[0.25em] ${theme.textSoft}`}>Default Credentials</p>
                <p className={`mt-3 text-sm leading-7 ${theme.textPrimary}`}>
                  User: <span className="font-semibold">rahul.user@example.com / user123</span>
                  <br />
                  Owner: <span className="font-semibold">priya.owner@example.com / owner123</span>
                  <br />
                  Admin: <span className="font-semibold">admin@example.com / admin123</span>
                </p>
              </div>
            ) : null}
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

function Submit({ theme, busy, label }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${theme.submit}`}
    >
      {busy ? 'Please wait...' : label}
      <ArrowRightIcon className="h-4 w-4" />
    </button>
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
  devOtp: 'border-black/15 bg-[#f7f5f1] text-[#5f5a54]',
  input: 'border-black/10 bg-[#f7f5f1] text-black placeholder:text-black/35 focus:border-black/35',
  submit: 'border-black bg-black text-white hover:opacity-90',
  eyebrow: 'text-[#9b6a3a]',
  textPrimary: 'text-black',
  textMuted: 'text-black/60',
  textSoft: 'text-black/45',
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
  devOtp: 'border-white/12 bg-[#232323] text-white/70',
  input: 'border-white/10 bg-[#232323] text-white placeholder:text-white/30 focus:border-white/40',
  submit: 'border-white bg-white text-black hover:opacity-90',
  eyebrow: 'text-[#c5a17a]',
  textPrimary: 'text-white',
  textMuted: 'text-white/60',
  textSoft: 'text-white/45',
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

function ControlIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function AlertCircleIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
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
