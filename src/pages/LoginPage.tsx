import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Store, Lock, User as UserIcon, Shield, CheckCircle, ArrowRight, Globe } from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { NeuInput } from '../components/common/NeuInput';

export const LoginPage: React.FC = () => {
  const { login, lang, setLang, t, settings } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const success = login(username, password);
    if (!success) {
      setErrorMsg(t.invalidCredentials);
    }
  };

  const handleQuickDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    login(user, pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* عناصر خلفية جمالية بتدرج ناعم */}
      <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 end-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* زر تبديل اللغة في الزاوية العلوية */}
      <div className="absolute top-6 end-6 z-20">
        <button
          onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
          className="neu-raised px-4 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:text-blue-600 transition-colors"
        >
          <Globe className="w-4 h-4 text-blue-600" />
          <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
        </button>
      </div>

      {/* بطاقة تسجيل الدخول Neumorphic Glass Box */}
      <div className="w-full max-w-md relative z-10">
        <div className="neu-flat rounded-3xl p-8 backdrop-blur-xl border border-white/70 shadow-2xl">
          {/* الشعار والعنوان */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl neu-raised mx-auto flex items-center justify-center text-blue-600 mb-3 shadow-md">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.appName}
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {t.appTagline}
            </p>
          </div>

          {/* نموذج الدخول */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <NeuInput
              label={t.username}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              icon={<UserIcon className="w-4 h-4" />}
              autoFocus
            />

            <NeuInput
              label={t.password}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
            />

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-bold text-center">
                {errorMsg}
              </div>
            )}

            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-2"
            >
              {t.loginButton}
            </NeuButton>
          </form>

          {/* حسابات تجريبية سريعة */}
          <div className="mt-6 pt-5 border-t border-slate-200/70">
            <div className="text-[11px] font-bold text-slate-400 mb-2.5 text-center">
              {t.loginDemoHint}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin', 'password')}
                className="neu-raised p-2.5 rounded-xl text-start group hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-xs">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  pass: password
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('cashier', 'cashier123')}
                className="neu-raised p-2.5 rounded-xl text-start group hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-xs">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Cashier</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  pass: cashier123
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* معلومات أسفل البطاقة */}
        <div className="text-center mt-4 text-xs text-slate-400">
          <span>نظام التشغيل المحلي المستقل بدون إنترنت (Offline Local SQLite)</span>
        </div>
      </div>
    </div>
  );
};
