import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';

export const BarcodeScannerListener: React.FC = () => {
  const { products, addToCart, showToast, lang } = useApp();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // إذا كان المستخدم يكتب في حقل إدخال نصي عادي (وليس حقل باركود)، نتجنب الاعتراض إذا لم تكن ضغطات سريعة جداً
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // الباركود يرسل الأحرف بسرعة فائقة (أقل من 60ms بين الضغطات)
      if (timeDiff > 120 && bufferRef.current.length > 0) {
        // تم تجاوز المهلة، نعيد تعيين المخزن
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= 4) {
          const product = products.find((p) => p.barcode === barcode);
          if (product) {
            addToCart(product, 1);
            showToast(
              lang === 'ar'
                ? `تم مسح: ${product.nameAr}`
                : `Article scanné : ${product.nameFr}`,
              'success'
            );
            // منع إرسال الفورم إذا وُجد
            e.preventDefault();
          } else {
            // إذا لم يكن في حقل إدخال عادي، نبلغ بعدم وجود المنتج
            if (!isInput) {
              showToast(
                lang === 'ar'
                  ? `باركود غير مسجل: ${barcode}`
                  : `Code-barres introuvable : ${barcode}`,
                'error'
              );
            }
          }
        }
      } else if (e.key.length === 1) {
        // أحرف وأرقام عادية
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [products, addToCart, showToast, lang]);

  return null;
};
