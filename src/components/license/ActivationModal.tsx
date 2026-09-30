import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  ShieldCheck,
  Key,
  Copy,
  CheckCircle,
  AlertCircle,
  Laptop,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Code2,
  FileCheck,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import {
  getDeviceFingerprint,
  activateWithInput,
  PRE_AUTHENTICATED_LICENSES,
} from '../../utils/license';

interface ActivationModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onOpenDeveloperGenerator?: () => void;
  isClosable?: boolean;
  onClose?: () => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onSuccess,
  onOpenDeveloperGenerator,
  isClosable = false,
  onClose,
}) => {
  const { lang, t, refreshLicense } = useApp();

  const [serialKeyInput, setSerialKeyInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [deviceId, setDeviceId] = useState('جاري القراءة...');
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showQuickKeys, setShowQuickKeys] = useState(false);

  useEffect(() => {
    getDeviceFingerprint().then((id) => setDeviceId(id));
  }, []);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFormatSerial = (val: string) => {
    // تنسيق تلقائي لأحرف السيريال
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setSerialKeyInput(cleaned);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const key = serialKeyInput.trim();
    if (!key) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى إدخال مفتاح التفعيل (Serial Key)'
          : 'Veuillez saisir la clé de série'
      );
      return;
    }

    setIsVerifying(true);
    try {
      const result = await activateWithInput(key, customerNameInput);

      if (result.isValid) {
        setSuccessMessage(
          lang === 'ar'
            ? 'تم تفعيل برنامج تاجر بنجاح وبشكل دائم مدى الحياة!'
            : 'TADJIR a été activé avec succès pour toujours (Licence à vie) !'
        );
        refreshLicense();
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err) {
      setErrorMessage(
        lang === 'ar'
          ? 'حدث خطأ أثناء معالجة التفعيل. تأكد من صحة المفتاح.'
          : 'Erreur lors de la validation de la clé.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="neu-flat rounded-3xl p-6 sm:p-8 w-full max-w-xl bg-white shadow-2xl border border-white my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* الترويسة وشعار تاجر */}
        <div className="text-center pb-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl neu-raised mx-auto flex items-center justify-center text-blue-600 mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {lang === 'ar' ? 'تفعيل برنامج تاجر TADJIR' : 'Activer TADJIR POS'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {lang === 'ar'
              ? 'نظام الترخيص المشفر مدى الحياة - Lifetime Perpetual License'
              : 'Système de licence perpétuelle cryptographique certifié'}
          </p>
        </div>

        {/* صندوق معرّف الجهاز (Device ID) */}
        <div className="mt-5 p-3.5 rounded-2xl neu-inset bg-slate-50 border border-slate-200/60">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-blue-600" />
              {lang === 'ar' ? 'معرّف هذا الجهاز (Device ID):' : "Identifiant de l'appareil :"}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {lang === 'ar' ? 'ثابت ويستخدم لربط الترخيص' : 'Identifiant matériel stable'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono font-bold text-sm bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 tracking-wider">
              {deviceId}
            </code>
            <button
              type="button"
              onClick={handleCopyDeviceId}
              className="neu-raised px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-all"
              title={lang === 'ar' ? 'نسخ المعرف' : 'Copier'}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">{lang === 'ar' ? 'تم النسخ' : 'Copié'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'نسخ' : 'Copier'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* نموذج إدخال السيريال */}
        <form onSubmit={handleActivate} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'مفتاح التفعيل (Serial Key) :' : 'Clé de licence (Serial Key) :'}
            </label>
            <div className="relative">
              <NeuInput
                type="text"
                value={serialKeyInput}
                onChange={(e) => handleFormatSerial(e.target.value)}
                placeholder="TADJIR-XXXX-XXXX-XXXX-XXXX"
                className="font-mono font-bold text-base tracking-widest text-slate-900 uppercase"
                icon={<Key className="w-4 h-4 text-blue-600" />}
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === 'ar'
                ? 'يمكنك إدخال مفتاح السيريال العادي أو لصق رمز التفعيل المشفر الكامل (TADJIR-LIC-...)'
                : 'Entrez la clé de série ou collez le certificat complet TADJIR-LIC-...'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'اسم المحل / العميل (اختياري) :' : 'Nom du client / Magasin (Optionnel) :'}
            </label>
            <NeuInput
              type="text"
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: سوبرماركت البركة' : 'Ex: Supérette El Baraka'}
              className="text-sm"
            />
          </div>

          {/* رسائل الخطأ والنجاح */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* زر التفعيل الرئيسي */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isVerifying}
              icon={
                isVerifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
              className="font-bold text-sm py-3"
            >
              {isVerifying
                ? lang === 'ar'
                  ? 'جاري التحقق من التوقيع الرقمي...'
                  : 'Vérification cryptographique...'
                : lang === 'ar'
                ? 'تفعيل برنامج تاجر الآن'
                : 'Activer TADJIR Maintenant'}
            </NeuButton>

            {isClosable && onClose && (
              <NeuButton
                type="button"
                variant="default"
                size="lg"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </NeuButton>
            )}
          </div>
        </form>

        {/* أدوات المطور والمفاتيح التجريبية السريعة للاختبار */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowQuickKeys(!showQuickKeys)}
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>
              {lang === 'ar'
                ? showQuickKeys
                  ? 'إخفاء مفاتيح التجربة'
                  : 'مفاتيح تجريبية جاهزة'
                : showQuickKeys
                ? 'Masquer les clés démo'
                : 'Clés démo prêtes'}
            </span>
          </button>

          {onOpenDeveloperGenerator && (
            <button
              type="button"
              onClick={onOpenDeveloperGenerator}
              className="neu-raised px-3 py-1.5 rounded-xl font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'ar' ? 'مولّد التراخيص (المطور)' : 'Générateur (Admin)'}</span>
            </button>
          )}
        </div>

        {/* قائمة المفاتيح التجريبية الجاهزة */}
        {showQuickKeys && (
          <div className="mt-3 p-3 rounded-2xl bg-blue-50/60 border border-blue-200/60 space-y-2 animate-in fade-in">
            <div className="text-[11px] font-bold text-blue-900">
              {lang === 'ar'
                ? 'مفاتيح سيريال أصلية دائمة (Lifetime) موقعة تشفيرياً للمعاينة السريعة:'
                : 'Clés de série à vie pré-authentifiées pour test immédiat :'}
            </div>
            {PRE_AUTHENTICATED_LICENSES.map((lic, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-blue-100 text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-blue-700">{lic.serialKey}</div>
                  <div className="text-[10px] text-slate-500">{lic.customerName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSerialKeyInput(lic.serialKey);
                    setCustomerNameInput(lic.customerName);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition-colors"
                >
                  {lang === 'ar' ? 'استخدام' : 'Utiliser'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
