import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Store,
  Globe,
  User as UserIcon,
  LogOut,
  WifiOff,
  Coins,
  ShieldCheck,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';

interface NavbarProps {
  onLockScreen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLockScreen }) => {
  const {
    currentUser,
    logout,
    lang,
    setLang,
    t,
    settings,
    sales,
    soundEnabled,
    toggleSound,
    isAdmin,
  } = useApp();

  // حساب مبيعات اليوم نقدًا
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales
    .filter((s) => s.createdAt.startsWith(today))
    .reduce((sum, s) => sum + s.total, 0);

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'fr' : 'ar');
  };

  return (
    <header className="neu-flat sticky top-0 z-30 px-6 py-3 border-b border-white/60 mb-5 flex items-center justify-between transition-all">
      {/* اسم المتجر والشعار */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl neu-raised flex items-center justify-center text-blue-600 bg-white/40">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
            {lang === 'ar' ? settings.storeNameAr : settings.storeNameFr}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{settings.wilaya}</span>
          </div>
        </div>
      </div>

      {/* العدادات السريعة ومؤشرات الصندوق */}
      <div className="hidden lg:flex items-center gap-4">
        <div className="neu-inset px-4 py-1.5 rounded-xl flex items-center gap-3">
          <Coins className="w-4 h-4 text-amber-600" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-500 leading-none">
              {t.dailyRevenue}
            </span>
            <span className="text-sm font-bold text-slate-800 tabular-nums">
              {todaySales.toLocaleString()} {t.currency}
            </span>
          </div>
        </div>
      </div>

      {/* الإجراءات والمستخدم واللغة */}
      <div className="flex items-center gap-2.5">
        {/* تفعيل / كتم الصوت */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-xl neu-raised transition-colors ${
            soundEnabled ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'
          }`}
          title={soundEnabled ? 'كتم أصوات الكاشير' : 'تفعيل أصوات الكاشير'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* تبديل اللغة */}
        <NeuButton
          size="sm"
          variant="default"
          onClick={toggleLanguage}
          icon={<Globe className="w-3.5 h-3.5 text-blue-600" />}
          className="font-bold text-xs"
          title="Changer de langue / تغيير اللغة"
        >
          {lang === 'ar' ? 'Français' : 'العربية'}
        </NeuButton>

        {/* بطاقة المستخدم */}
        <div className="neu-inset px-3 py-1.5 rounded-xl flex items-center gap-2">
          {currentUser?.role === 'admin' ? (
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          ) : (
            <UserCheck className="w-4 h-4 text-emerald-600" />
          )}
          <div className="flex flex-col text-start">
            <span className="text-xs font-bold text-slate-800 leading-none">
              {currentUser?.fullName}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {currentUser?.role === 'admin' ? t.adminRole : t.cashierRole}
            </span>
          </div>
        </div>

        {/* تسجيل الخروج */}
        <NeuButton
          size="sm"
          variant="default"
          onClick={logout}
          icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />}
          title={t.logout}
        >
          <span className="hidden sm:inline">{t.logout}</span>
        </NeuButton>
      </div>
    </header>
  );
};
