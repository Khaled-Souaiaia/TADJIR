import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { LicenseType, LicensePayload } from '../../types';
import {
  Code2,
  Key,
  Shield,
  Copy,
  Download,
  CheckCircle,
  AlertTriangle,
  Play,
  X,
  Sparkles,
  Lock,
  Cpu,
  Calendar,
  FileText,
  User,
  Check,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import {
  createSignedLicenseCertificate,
  generateSerialKeyString,
  getDeviceFingerprint,
  activateWithInput,
  verifyLicenseSignature,
} from '../../utils/license';

interface DeveloperLicenseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperLicenseGeneratorModal: React.FC<DeveloperLicenseGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { lang, showToast, refreshLicense } = useApp();

  const [customerName, setCustomerName] = useState('مؤسسة النور للتجارة');
  const [licenseType, setLicenseType] = useState<LicenseType>('lifetime');
  const [licenseId, setLicenseId] = useState(() => `LIC-${Date.now().toString(36).toUpperCase()}`);
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [notes, setNotes] = useState('فاتورة شراء رقم 104 - ترخيص دائم مدى الحياة');
  const [currentDeviceId, setCurrentDeviceId] = useState('');

  // النتائج المولدة
  const [generatedSerial, setGeneratedSerial] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [generatedPayload, setGeneratedPayload] = useState<LicensePayload | null>(null);
  const [copiedField, setCopiedField] = useState<'serial' | 'token' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // حالة اختبارات النظام التلقائية
  const [testResults, setTestResults] = useState<Array<{ name: string; pass: boolean; note: string }>>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    getDeviceFingerprint().then((id) => setCurrentDeviceId(id));
  }, []);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerName.trim()) {
      showToast(lang === 'ar' ? 'يرجى كتابة اسم العميل' : 'Nom client requis', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const serial = generateSerialKeyString();
      const result = await createSignedLicenseCertificate({
        customerName: customerName.trim(),
        licenseId: licenseId.trim(),
        type: licenseType,
        serialKey: serial,
        deviceId: targetDeviceId.trim() || null,
        notes: notes.trim(),
      });

      setGeneratedSerial(result.payload.serialKey);
      setGeneratedToken(result.activationToken);
      setGeneratedPayload(result.payload);
      showToast(lang === 'ar' ? 'تم توليد الترخيص وتوقيعه بنجاح!' : 'Licence signée avec succès !', 'success');
    } catch (err) {
      showToast(lang === 'ar' ? 'فشل توليد التوقيع التشفيري' : 'Erreur de signature', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, type: 'serial' | 'token') => {
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    showToast(lang === 'ar' ? 'تم النسخ إلى الحافظة' : 'Copié dans le presse-papier', 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadFile = () => {
    if (!generatedPayload || !generatedToken) return;

    const exportData = {
      p: generatedPayload,
      s: generatedToken.replace('TADJIR-LIC-', ''),
      exportedAt: new Date().toISOString(),
      software: 'TADJIR POS Algeria',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TADJIR-License-${generatedPayload.serialKey}.tadjir-lic`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(lang === 'ar' ? 'تم تنزيل ملف الترخيص (.tadjir-lic)' : 'Fichier de licence téléchargé', 'success');
  };

  const handleApplyToThisComputer = async () => {
    if (!generatedToken) return;
    const res = await activateWithInput(generatedToken, customerName);
    if (res.isValid) {
      refreshLicense();
      showToast(lang === 'ar' ? 'تم تفعيل هذا الجهاز بالترخيص الجديد!' : 'Ce PC est maintenant activé !', 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  // تشغيل مصفوفة الاختبارات المعيارية
  const handleRunVerificationSuite = async () => {
    setIsRunningTests(true);
    const results: Array<{ name: string; pass: boolean; note: string }> = [];

    // 1. اختبار ترخيص دائم سليم
    try {
      const validCert = await createSignedLicenseCertificate({
        customerName: 'محل الفحص التجاري',
        type: 'lifetime',
        serialKey: 'TADJIR-TEST-0001-VALID-LIFE',
      });
      const validSig = await verifyLicenseSignature(validCert.payload, validCert.signature);
      results.push({
        name: 'توليد والتحقق من ترخيص Lifetime سليم',
        pass: validSig,
        note: validSig ? 'توقيع ECDSA P-256 صحيح 100%' : 'فشل التوقيع',
      });
    } catch {
      results.push({ name: 'توليد ترخيص Lifetime', pass: false, note: 'خطأ برمجي' });
    }

    // 2. اختبار السيريال الخاطئ أو الفارغ
    try {
      const emptyRes = await activateWithInput('');
      const invalidRes = await activateWithInput('TADJIR-FAKE-KEY-1234');
      results.push({
        name: 'رفض السيريال الفارغ أو التالف',
        pass: !emptyRes.isValid && !invalidRes.isValid,
        note: 'تم الرفض بنجاح دون أخطاء',
      });
    } catch {
      results.push({ name: 'رفض السيريال التالف', pass: false, note: 'استثناء غير معالج' });
    }

    // 3. اختبار كشف التعديل والتزوير (Anti-Tamper)
    try {
      const tamperCert = await createSignedLicenseCertificate({
        customerName: 'عميل شرعي',
        type: 'lifetime',
      });
      // تزوير البيانات بتغيير اسم العميل بعد التوقيع
      const tamperedPayload = { ...tamperCert.payload, customerName: 'مقرصن غير مصرح' };
      const isTamperedValid = await verifyLicenseSignature(tamperedPayload, tamperCert.signature);
      results.push({
        name: 'كشف التلاعب بالبيانات (Anti-Tamper Protection)',
        pass: isTamperedValid === false,
        note: isTamperedValid === false ? 'تم كشف التعديل وإبطال التوقيع فوراً' : 'فشل كشف التلاعب',
      });
    } catch {
      results.push({ name: 'كشف التلاعب', pass: false, note: 'خطأ فحص' });
    }

    // 4. اختبار ربط الجهاز (Device ID Mismatch)
    try {
      const otherDeviceCert = await createSignedLicenseCertificate({
        customerName: 'جهاز آخر',
        type: 'lifetime',
        deviceId: 'DZ-9999-9999-9999', // جهاز مختلف عن هذا الكمبيوتر
      });
      const mismatchRes = await activateWithInput(otherDeviceCert.activationToken);
      results.push({
        name: 'قيد الجهاز ومنع التشغيل على أجهزة أخرى (Device Lock)',
        pass: mismatchRes.status === 'device_mismatch',
        note: mismatchRes.status === 'device_mismatch' ? 'تم منع التفعيل على جهاز مختلف بنجاح' : 'لم يتم التحقق من المعرف',
      });
    } catch {
      results.push({ name: 'قيد الجهاز', pass: false, note: 'خطأ فحص الجهاز' });
    }

    // 5. اختبار الترخيص المؤقت المنتهي الصلاحية
    try {
      const expiredPayload: LicensePayload = {
        licenseId: 'LIC-EXPIRED-TEST',
        serialKey: 'TADJIR-EXPI-RED0-TEST-0000',
        customerName: 'فحص انتهاء الصلاحية',
        type: 'trial',
        issuedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() - 10 * 86400000).toISOString(), // منتهي منذ 10 أيام
        deviceId: null,
      };
      const expCert = await createSignedLicenseCertificate({
        customerName: expiredPayload.customerName,
        type: 'trial',
        durationDays: -5,
      });
      const expRes = await activateWithInput(expCert.activationToken);
      results.push({
        name: 'كشف انتهاء صلاحية التراخيص المؤقتة',
        pass: expRes.status === 'expired',
        note: expRes.status === 'expired' ? 'تم رصد انتهاء الصلاحية وحجب الترخيص' : 'لم يتم رصد الانتهاء',
      });
    } catch {
      results.push({ name: 'فحص الانتهاء', pass: false, note: 'خطأ فحص' });
    }

    setTestResults(results);
    setIsRunningTests(false);
    showToast('اكتمل فحص سيناريوهات الترخيص بنجاح', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="neu-flat rounded-3xl p-6 sm:p-8 w-full max-w-4xl bg-white shadow-2xl border border-white my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-blue-700">
            <div className="w-10 h-10 rounded-2xl neu-raised flex items-center justify-center text-blue-600">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {lang === 'ar' ? 'مولّد التراخيص والمفاتيح (خاص بالمطور)' : 'Générateur de Licences Admin'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'ar'
                  ? 'توليد مفاتيح دائمـة مدى الحياة وموقعة بتشفير ECDSA P-256'
                  : 'Génération de licences cryptographiquement signées'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
          {/* الجانب الأيسر: إعدادات الترخيص المراد توليده */}
          <form onSubmit={handleGenerate} className="lg:col-span-6 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'ar' ? 'اسم العميل / المتجر :' : 'Nom du client :'}
              </label>
              <NeuInput
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: متجر الوفاق للتجارة"
                required
                icon={<User className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نوع الترخيص :' : 'Type de licence :'}
                </label>
                <select
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value as LicenseType)}
                  className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="lifetime">{lang === 'ar' ? 'دائم مدى الحياة (Lifetime)' : 'À Vie (Lifetime)'}</option>
                  <option value="1_year">{lang === 'ar' ? 'سنوي (1 سنة)' : 'Annuel (1 An)'}</option>
                  <option value="6_months">{lang === 'ar' ? 'نصف سنوي (6 أشهر)' : '6 Mois'}</option>
                  <option value="trial">{lang === 'ar' ? 'تجريبي (Trial 30 يوم)' : 'Essai (30 jours)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'معرّف الترخيص (ID) :' : 'ID Licence :'}
                </label>
                <NeuInput
                  type="text"
                  value={licenseId}
                  onChange={(e) => setLicenseId(e.target.value)}
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'قيد معرّف الجهاز (اختياري) :' : 'Lier au Device ID (Optionnel) :'}
                </label>
                <button
                  type="button"
                  onClick={() => setTargetDeviceId(currentDeviceId)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  {lang === 'ar' ? 'استخدام هذا الجهاز' : 'Cet appareil'}
                </button>
              </div>
              <NeuInput
                type="text"
                value={targetDeviceId}
                onChange={(e) => setTargetDeviceId(e.target.value)}
                placeholder="اتركه فارغاً لترخيص عام يعمل على أي جهاز"
                className="font-mono text-xs uppercase"
                icon={<Cpu className="w-4 h-4" />}
              />
              <span className="text-[10px] text-slate-400">
                {lang === 'ar'
                  ? 'إذا تُرك فارغاً: يمكن للعميل التفعيل وإعادة التثبيت بحرية'
                  : 'Laissez vide pour une licence multi-machines'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'ar' ? 'ملاحظات داخلية / رقم الفاتورة :' : 'Notes internes :'}
              </label>
              <NeuInput
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات تسليم الترخيص"
                icon={<FileText className="w-4 h-4" />}
              />
            </div>

            <div className="pt-2">
              <NeuButton
                type="submit"
                variant="primary"
                fullWidth
                disabled={isGenerating}
                icon={<Sparkles className="w-4 h-4" />}
                className="py-2.5 font-bold"
              >
                {lang === 'ar' ? 'توليد وتوقيع الترخيص المشفر' : 'Générer la licence signée'}
              </NeuButton>
            </div>
          </form>

          {/* الجانب الأيمن: المفتاح المولّد وشهادة التفعيل */}
          <div className="lg:col-span-6 flex flex-col justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <Shield className="w-4 h-4" />
                  {lang === 'ar' ? 'الترخيص المولّد الجاهز للتسليم :' : 'Licence générée :'}
                </span>
                {generatedPayload && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    {generatedPayload.type}
                  </span>
                )}
              </div>

              {generatedSerial ? (
                <>
                  {/* صندوق السيريال النظيف */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500 mb-1">
                      {lang === 'ar' ? 'مفتاح السيريال (Serial Key) :' : 'Clé de série :'}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-sm font-black text-blue-700 tracking-wider">
                        {generatedSerial}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(generatedSerial, 'serial')}
                        className="px-2.5 py-1 rounded-lg neu-raised text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1"
                      >
                        {copiedField === 'serial' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'serial' ? 'تم' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>

                  {/* صندوق الرمز المشفر الكامل */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500 mb-1">
                      {lang === 'ar' ? 'رمز التفعيل المشفر الكامل (Activation Token) :' : 'Token complet :'}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={generatedToken}
                        className="flex-1 font-mono text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 truncate select-all text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(generatedToken, 'token')}
                        className="px-2.5 py-1 rounded-lg neu-raised text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'token' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'token' ? 'تم' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>

                  {/* أزرار الحفظ والتطبيق */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadFile}
                      className="neu-raised px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'حفظ ملف (.tadjir-lic)' : 'Exporter Fichier'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyToThisComputer}
                      className="neu-raised px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'تفعيل هذا الكمبيوتر' : 'Activer ce PC'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-2xl">
                  <Key className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>{lang === 'ar' ? 'املأ بيانات العميل واضغط "توليد وتوقيع الترخيص"' : 'Cliquez sur Générer pour créer la licence'}</p>
                </div>
              )}
            </div>

            {/* زر تشغيل مصفوفة الاختبارات التلقائية */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleRunVerificationSuite}
                disabled={isRunningTests}
                className="w-full text-xs font-bold text-slate-600 hover:text-blue-600 py-1.5 neu-raised rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {isRunningTests
                    ? 'جاري فحص جميع حالات الأمان...'
                    : 'تشغيل الفحص الآلي لحالات الأمان والترخيص (Audit Suite)'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* نتائج مصفوفة الاختبارات التلقائية */}
        {testResults.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 animate-in fade-in">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>نتائج التدقيق الأمني واختبارات سيناريوهات التفعيل (Security Audit):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {testResults.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    t.pass
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.pass ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-[11px]">{t.name}</div>
                      <div className="text-[10px] opacity-75">{t.note}</div>
                    </div>
                  </div>
                  <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-white">
                    {t.pass ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
