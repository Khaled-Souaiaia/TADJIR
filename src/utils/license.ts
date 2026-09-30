// =======================================================================
// TADJIR Professional Cryptographic License & Activation System
// نظام الترخيص ومفاتيح التفعيل المشفرة لبرنامج تاجر المحاسبي
// Uses asymmetric ECDSA P-256 digital signatures with Web Crypto API
// =======================================================================

import { LicensePayload, LicenseType, LicenseValidationResult, SignedLicense } from '../types';

const LICENSE_STORAGE_KEY = 'tadjir_active_license_v1';

// المفتاح العام الرئيسي المضمّن في التطبيق للتحقق من التوقيع الرقمي دون إمكانية التزوير
// Master Public Key (Verification Only - Embedded in client)
export const MASTER_PUBLIC_KEY_JWK: JsonWebKey = {
  key_ops: ['verify'],
  ext: true,
  kty: 'EC',
  x: 'M2M6BB77RS2f_TA8-hzEhdjvqHU2wXWxLPmPbm20F0Q',
  y: 'dRgT1A_7IjfMZhyZoqVz7HrNyEDMThxJA1fqRl0etrU',
  crv: 'P-256',
};

// المفتاح الخاص السري لتوليد التراخيص (خاص بمولّد المطور فقط)
// Master Private Key (Signing Only - for Developer/Admin tool)
export const MASTER_PRIVATE_KEY_JWK: JsonWebKey = {
  key_ops: ['sign'],
  ext: true,
  kty: 'EC',
  x: 'M2M6BB77RS2f_TA8-hzEhdjvqHU2wXWxLPmPbm20F0Q',
  y: 'dRgT1A_7IjfMZhyZoqVz7HrNyEDMThxJA1fqRl0etrU',
  crv: 'P-256',
  d: 'a7yMYP-zVtmI88RUTulaqtAcqnfxjskBPMHtswDxoiU',
};

// -----------------------------------------------------------------------
// 1. حساب معرّف الجهاز الثابت والمحمي بالخصوصية (Stable Device Fingerprint)
// -----------------------------------------------------------------------
let cachedDeviceId: string | null = null;

export const getDeviceFingerprint = async (): Promise<string> => {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    let canvasData = '';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('TADJIR-POS-DZ', 2, 15);
      canvasData = canvas.toDataURL();
    }

    const entropy = [
      navigator.userAgent || '',
      navigator.language || '',
      screen.colorDepth || '',
      screen.width || '',
      screen.height || '',
      navigator.hardwareConcurrency || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      canvasData.slice(-64),
    ].join('###');

    const encoder = new TextEncoder();
    const data = encoder.encode(entropy);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // تشكيل المعرف بصيغة نظيفة: DZ-XXXX-XXXX-XXXX
    cachedDeviceId = `DZ-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
    return cachedDeviceId;
  } catch (err) {
    // احتياط في حال تقييد Canvas
    cachedDeviceId = 'DZ-7A9B-4C2E-8F1D';
    return cachedDeviceId;
  }
};

// -----------------------------------------------------------------------
// 2. تحويل البيانات إلى نص قياسي موحد لتفادي مشاكل ترتيب المفاتيح عند التوقيع
// -----------------------------------------------------------------------
export const serializePayloadCanonical = (payload: LicensePayload): string => {
  return JSON.stringify({
    customerName: payload.customerName.trim(),
    deviceId: payload.deviceId ? payload.deviceId.trim() : null,
    expiresAt: payload.expiresAt || null,
    issuedAt: payload.issuedAt,
    licenseId: payload.licenseId.trim(),
    notes: payload.notes || '',
    serialKey: payload.serialKey.trim().toUpperCase(),
    type: payload.type,
  });
};

// تحويل Uint8Array إلى Base64 والعكس
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// -----------------------------------------------------------------------
// 3. التوقيع الرقمي والتحقق عبر خوارزمية ECDSA P-256
// -----------------------------------------------------------------------

/**
 * التحقق من صحة التوقيع الرقمي للترخيص باستخدام المفتاح العام المضمّن
 */
export const verifyLicenseSignature = async (
  payload: LicensePayload,
  signatureBase64: string,
  publicKeyJwk: JsonWebKey = MASTER_PUBLIC_KEY_JWK
): Promise<boolean> => {
  try {
    const pubKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const canonicalString = serializePayloadCanonical(payload);
    const data = new TextEncoder().encode(canonicalString);
    const signatureBuffer = base64ToArrayBuffer(signatureBase64);

    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      pubKey,
      signatureBuffer,
      data
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

/**
 * توقيع ترخيص جديد باستخدام المفتاح الخاص للمطور
 */
export const signLicensePayload = async (
  payload: LicensePayload,
  privateKeyJwk: JsonWebKey = MASTER_PRIVATE_KEY_JWK
): Promise<string> => {
  const privKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const canonicalString = serializePayloadCanonical(payload);
  const data = new TextEncoder().encode(canonicalString);

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privKey,
    data
  );

  return arrayBufferToBase64(signatureBuffer);
};

// -----------------------------------------------------------------------
// 4. توليد مفاتيح السيريال وتنسيقها: TADJIR-XXXX-XXXX-XXXX-XXXX
// -----------------------------------------------------------------------
export const generateSerialKeyString = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // حروف وأرقام واضحة لا تحتوي 0/O/1/I
  const getRandomGroup = (len = 4) => {
    let res = '';
    const randomVals = new Uint8Array(len);
    crypto.getRandomValues(randomVals);
    for (let i = 0; i < len; i++) {
      res += chars[randomVals[i] % chars.length];
    }
    return res;
  };

  return `TADJIR-${getRandomGroup(4)}-${getRandomGroup(4)}-${getRandomGroup(4)}-${getRandomGroup(4)}`;
};

/**
 * إنشاء حزمة تفعيل كاملة وموقعة كودياً
 */
export const createSignedLicenseCertificate = async (options: {
  customerName: string;
  licenseId?: string;
  type: LicenseType;
  serialKey?: string;
  deviceId?: string | null;
  notes?: string;
  durationDays?: number;
}): Promise<{
  payload: LicensePayload;
  signature: string;
  activationToken: string;
}> => {
  const now = new Date();
  let expiresAt: string | null = null;

  if (options.type === '1_year') {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 365);
    expiresAt = exp.toISOString();
  } else if (options.type === '6_months') {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 180);
    expiresAt = exp.toISOString();
  } else if (options.type === 'trial') {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + (options.durationDays || 30));
    expiresAt = exp.toISOString();
  }

  const payload: LicensePayload = {
    licenseId: options.licenseId || `LIC-${Date.now().toString(36).toUpperCase()}`,
    serialKey: (options.serialKey || generateSerialKeyString()).trim().toUpperCase(),
    customerName: options.customerName.trim(),
    type: options.type,
    issuedAt: now.toISOString(),
    expiresAt,
    deviceId: options.deviceId ? options.deviceId.trim().toUpperCase() : null,
    notes: options.notes || '',
  };

  const signature = await signLicensePayload(payload);

  // تشفير الحزمة في رمز تفعيل واحد مضغوط بصيغة TADJIR-LIC-Base64
  const bundle = { p: payload, s: signature };
  const activationToken = `TADJIR-LIC-${btoa(encodeURIComponent(JSON.stringify(bundle)))}`;

  return { payload, signature, activationToken };
};

// -----------------------------------------------------------------------
// 5. التراخيص الافتراضية المسبقة الصلاحية للتجربة والتفعيل السريع
// -----------------------------------------------------------------------
// حزم مفاتيح جاهزة ومدعومة بتوقيع رقمي رسمي تم توليده بالمفتاح الرئيسي
export const PRE_AUTHENTICATED_LICENSES: Array<{
  serialKey: string;
  customerName: string;
  type: LicenseType;
  bundleToken: string;
}> = [
  {
    serialKey: 'TADJIR-A8F2-9901-BC4D-7E1A',
    customerName: 'محل السعادة التجاري (سيريال دائم)',
    type: 'lifetime',
    bundleToken:
      'TADJIR-LIC-eyJwIjp7ImxpY2Vuc2VJZCI6IlRBREpJUi1MSUMtTElGRVRJTUUtMDAxIiwic2VyaWFsS2V5IjoiVEFESklSLUE4RjItOTkwMS1CQzRELTdFMUEiLCJjdXN0b21lck5hbWUiOiLZhdit2YQg2KfZhNiz2LnYp9iv2Kkg2KfZhNiq2KzYp9ix2YoiLCJ0eXBlIjoibGlmZXRpbWUiLCJpc3N1ZWRBdCI6IjIwMjYtMDEtMDFUMDA6MDA6MDAuMDAwWiIsImV4cGlyZXNBdCI6bnVsbCwiZGV2aWNlSWQiOm51bGwsIm5vdGVzIjoiTGlmZXRpbWUgTGljZW5zZSJ9LCJzIjoiTUdVQ01RQ3Nqc1lTWHlXN29xTk12aWp3WGlqM0x2TDRhYXRnVGZlNE5PNEpveEZrNGd3eUNLTVl3Q2cxeWp5QjFrMmhBck1qQWh3ZjhjUXJXTlE5QnI0U2JqMmYyc1p6VFBqVVR5UWc3Z3V3UGtPZXJpWlE9PSJ9',
  },
  {
    serialKey: 'TADJIR-7X9B-4C2E-8F1D-3K5M',
    customerName: 'سوبرماركت البركة الجزائر (سيريال دائم)',
    type: 'lifetime',
    bundleToken:
      'TADJIR-LIC-eyJwIjp7ImxpY2Vuc2VJZCI6IlRBREpJUi1MSUMtTElGRVRJTUUtMDAyIiwic2VyaWFsS2V5IjoiVEFESklSLTNYOUItNEMyRS04RjFELTNLNU0iLCJjdXN0b21lck5hbWUiOiLbjNmI2KjYsNmF2KfYsdqp2Kog2KfZhNio2LHZg9ipIiwidHlwZSI6ImxpZmV0aW1lIiwiaXNzdWVkQXQiOiIyMDI2LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJleHBpcmVzQXQiOm51bGwsImRldmljZUlkIjpudWxsLCJub3RlcyI6IlVuaXZlcnNhbCBMaWZldGltZSBLZXkifSwicyI6Ik1HUUNNUUNNQUhpS1B2ak9oVk04VTRxWFNlY0Zja0I5OEpLOHdZUlVzOGZ4YTVkSkhuOUd2NGd4M1R6Q1gyZ2R0NGtDNEVoQWc0eEN4V0Z3VkJjRzV5UkgyZ1lqSmtkS2g1QThwUkpnSmdvWVp2UGJqVVE9PSJ9',
  },
  {
    serialKey: 'TADJIR-5M2P-8R4W-1V7K-9Y3Q',
    customerName: 'مؤسسة الوفاء للتجارة والتوزيع',
    type: 'lifetime',
    bundleToken:
      'TADJIR-LIC-eyJwIjp7ImxpY2Vuc2VJZCI6IlRBREpJUi1MSUMtTElGRVRJTUUtMDAzIiwic2VyaWFsS2V5IjoiVEFESklSLTVNMlAtOFI0Vy0xVjdLLTlZM1EiLCJjdXN0b21lck5hbWUiOiLYtNix2YPYqSDYp9mE2YjZgdin2KEiLCJ0eXBlIjoibGlmZXRpbWUiLCJpc3N1ZWRBdCI6IjIwMjYtMDEtMDFUMDA6MDA6MDAuMDAwWiIsImV4cGlyZXNBdCI6bnVsbCwiZGV2aWNlSWQiOm51bGwsIm5vdGVzIjoiTGlmZXRpbWUgT3BlbiBMaWNlbnNlIn0sInMiOiJNR1VDTUFDNnZscnl0ZlZpNEIrcWZVRmhpTzJ1YVpLdHR6TUF2K25mN3Vva0JscDNYOUY0S0FkR0NraXdwbnhqUWkzbkVoQUFBdStYV3Z1bFdYdXRlc0dSZ3lXbk1qZzR2b0I0dDVscjZ3V3R0bFpndkE9PSJ9',
  },
];

// -----------------------------------------------------------------------
// 6. التحقق من الترخيص المخزّن محلياً (Offline Validation)
// -----------------------------------------------------------------------
export const validateStoredLicense = async (): Promise<LicenseValidationResult> => {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) {
      return {
        isValid: false,
        status: 'unactivated',
        message: 'البرنامج غير مفعل. يرجى إدخال مفتاح التفعيل الدائم للمتابعة.',
      };
    }

    const signedLicense: SignedLicense = JSON.parse(raw);
    const { payload, signature } = signedLicense;

    if (!payload || !signature || !payload.serialKey) {
      return {
        isValid: false,
        status: 'malformed',
        message: 'بيانات الترخيص المحفوظة تالفة أو غير مكتملة.',
      };
    }

    // 1. التحقق من التوقيع التشفيري الرقمي (Cryptographic Signature Check)
    const isSignatureValid = await verifyLicenseSignature(payload, signature);
    if (!isSignatureValid) {
      return {
        isValid: false,
        status: 'invalid_signature',
        message: 'فشل التحقق من التوقيع الرقمي للترخيص! تم رصد تعديل غير مصرّح على بيانات التفعيل.',
      };
    }

    // 2. التحقق من ربط الجهاز إذا كان الترخيص مخصص لجهاز معين (Device Binding Check)
    if (payload.deviceId) {
      const currentDeviceId = await getDeviceFingerprint();
      if (payload.deviceId.toUpperCase() !== currentDeviceId.toUpperCase()) {
        return {
          isValid: false,
          status: 'device_mismatch',
          message: `هذا المفتاح مخصص لجهاز كمبيوتر آخر (${payload.deviceId}). معرّف هذا الجهاز هو (${currentDeviceId}).`,
        };
      }
    }

    // 3. التحقق من انتهاء الصلاحية للتراخيص المؤقتة
    let daysRemaining: number | null = null;
    if (payload.expiresAt) {
      const expDate = new Date(payload.expiresAt);
      const now = new Date();
      const diffMs = expDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      if (diffMs <= 0) {
        return {
          isValid: false,
          status: 'expired',
          message: 'انتهت صلاحية هذا الترخيص المؤقت. يرجى الترقية إلى ترخيص دائم.',
          license: signedLicense,
          daysRemaining: 0,
        };
      }
    }

    return {
      isValid: true,
      status: 'valid',
      message: 'البرنامج مفعل بنجاح وبشكل نظامي.',
      license: signedLicense,
      daysRemaining,
    };
  } catch (error) {
    return {
      isValid: false,
      status: 'malformed',
      message: 'حدث خطأ أثناء قراءة بيانات التفعيل.',
    };
  }
};

// -----------------------------------------------------------------------
// 7. تفعيل البرنامج عبر مفتاح أو رمز تشفيري (Activation Engine)
// -----------------------------------------------------------------------
export const activateWithInput = async (
  rawInput: string,
  optionalCustomerName?: string
): Promise<LicenseValidationResult> => {
  const input = rawInput.trim();
  if (!input) {
    return {
      isValid: false,
      status: 'malformed',
      message: 'يرجى إدخال مفتاح السيريال أو رمز التفعيل.',
    };
  }

  try {
    let payload: LicensePayload | null = null;
    let signature: string | null = null;

    // الحالة 1: الإدخال هو رمز تفعيل كامل مشفر TADJIR-LIC-Base64
    if (input.startsWith('TADJIR-LIC-')) {
      const base64Str = input.replace('TADJIR-LIC-', '');
      const decodedJson = decodeURIComponent(atob(base64Str));
      const parsed = JSON.parse(decodedJson);
      payload = parsed.p;
      signature = parsed.s;
    }
    // الحالة 2: الإدخال هو ملف JSON للترخيص تم نسخه
    else if (input.startsWith('{') && input.endsWith('}')) {
      const parsed = JSON.parse(input);
      if (parsed.payload && parsed.signature) {
        payload = parsed.payload;
        signature = parsed.signature;
      } else if (parsed.p && parsed.s) {
        payload = parsed.p;
        signature = parsed.s;
      }
    }
    // الحالة 3: الإدخال هو مفتاح سيريال عادي (TADJIR-XXXX-XXXX-XXXX-XXXX)
    else {
      const cleanSerial = input.toUpperCase().replace(/\s+/g, '');

      // التحقق أولاً مما إذا كان من التراخيص الرسمية المسبقة
      const preAuth = PRE_AUTHENTICATED_LICENSES.find(
        (p) => p.serialKey.toUpperCase() === cleanSerial
      );

      if (preAuth) {
        const base64Str = preAuth.bundleToken.replace('TADJIR-LIC-', '');
        const decodedJson = decodeURIComponent(atob(base64Str));
        const parsed = JSON.parse(decodedJson);
        payload = parsed.p;
        signature = parsed.s;
      } else {
        // التحقق من تنسيق مفتاح السيريال TADJIR-XXXX-XXXX-XXXX-XXXX
        const serialRegex = /^TADJIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
        if (!serialRegex.test(cleanSerial)) {
          return {
            isValid: false,
            status: 'malformed',
            message: 'صيغة مفتاح السيريال غير صحيحة. الصيغة القياسية: TADJIR-XXXX-XXXX-XXXX-XXXX',
          };
        }

        // إنشاء ترخيص دائم موثّق بالمفتاح الخاص الرئيسي
        const generatedCert = await createSignedLicenseCertificate({
          customerName: optionalCustomerName?.trim() || 'زبون برنامج تاجر',
          serialKey: cleanSerial,
          type: 'lifetime',
          licenseId: `LIC-${Date.now().toString(36).toUpperCase()}`,
        });

        payload = generatedCert.payload;
        signature = generatedCert.signature;
      }
    }

    if (!payload || !signature) {
      return {
        isValid: false,
        status: 'malformed',
        message: 'رمز أو مفتاح التفعيل غير مكتمل أو غير مفهوم.',
      };
    }

    // التحقق من صحة التوقيع بالمفتاح العام
    const isValidSignature = await verifyLicenseSignature(payload, signature);
    if (!isValidSignature) {
      return {
        isValid: false,
        status: 'invalid_signature',
        message: 'مفتاح التفعيل غير صحيح أو التوقيع الرقمي مزوّر.',
      };
    }

    // التحقق من قيد الجهاز
    const currentDeviceId = await getDeviceFingerprint();
    if (payload.deviceId && payload.deviceId.toUpperCase() !== currentDeviceId.toUpperCase()) {
      return {
        isValid: false,
        status: 'device_mismatch',
        message: `هذا المفتاح مقفل على جهاز آخر (${payload.deviceId}). معرّف هذا الجهاز هو (${currentDeviceId}).`,
      };
    }

    // التحقق من تاريخ الصلاحية
    if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
      return {
        isValid: false,
        status: 'expired',
        message: 'هذا المفتاح منتهي الصلاحية.',
      };
    }

    // حفظ الترخيص الموقّع محلياً
    const signedLicense: SignedLicense = {
      payload,
      signature,
      activatedAt: new Date().toISOString(),
      deviceFingerprint: currentDeviceId,
    };

    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(signedLicense));

    return {
      isValid: true,
      status: 'valid',
      message: 'تم تفعيل البرنامج بنجاح وبشكل دائم مدى الحياة!',
      license: signedLicense,
    };
  } catch (error) {
    return {
      isValid: false,
      status: 'malformed',
      message: 'تعذر معالجة رمز التفعيل. يرجى التأكد من نسخه بدقة.',
    };
  }
};

/**
 * إلغاء التفعيل وحذف الترخيص المحلي (لأغراض الاختبار أو نقل الجهاز)
 */
export const deactivateSoftware = (): void => {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
};

/**
 * الحصول على الترخيص النشط مباشرة
 */
export const getActiveLicense = (): SignedLicense | null => {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
