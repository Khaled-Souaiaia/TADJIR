// سياق التطبيق الرئيسي لإدارة الحالة والمحاسبة ونقاط البيع
// AppContext: Central state management for POS, Sales, Products, Customers, i18n

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Product,
  ProductCategory,
  Customer,
  Supplier,
  Sale,
  CartItem,
  Expense,
  AppSettings,
  User,
  PaymentMethod,
  SaleItem,
  LicenseValidationResult,
} from '../types';
import { db } from '../db/sqlite-service';
import { translations, Language } from '../i18n';
import { sound } from '../utils/audio';
import { validateStoredLicense } from '../utils/license';

interface CartTotals {
  subtotal: number;
  discount: number;
  tvaAmount: number;
  total: number;
  itemsCount: number;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  // المستخدم والصلاحيات
  currentUser: User | null;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
  isAdmin: boolean;

  // اللغات والترجمة
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.ar;

  // البيانات
  products: Product[];
  categories: ProductCategory[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  expenses: Expense[];
  settings: AppSettings;
  refreshData: () => void;

  // نقطة البيع والسلة
  cart: CartItem[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotals: CartTotals;
  completeSale: (
    paidAmount: number,
    paymentMethod: PaymentMethod,
    discountGeneral?: number
  ) => { success: boolean; sale?: Sale; error?: string };

  // إدارة المنتجات
  saveProduct: (product: Product) => void;
  deleteProduct: (productId: string) => boolean;

  // إدارة العملاء والموردين
  saveCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;
  saveSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;

  // المصاريف
  addExpense: (expense: Omit<Expense, 'id' | 'createdByName'>) => void;
  deleteExpense: (expenseId: string) => void;

  // الإعدادات والتسليم للعميل
  updateSettings: (newSettings: AppSettings) => void;
  resetDatabase: () => void;
  prepareForDelivery: (config: Partial<AppSettings>, keepCatalog: boolean) => void;
  soundEnabled: boolean;
  toggleSound: () => void;

  // التنبيهات
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // الترخيص والتفعيل (Lifetime License System)
  licenseResult: LicenseValidationResult | null;
  isActivated: boolean;
  refreshLicense: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // اللغة
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('dzpos_lang') as Language) || 'ar';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('dzpos_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useMemo(() => translations[lang], [lang]);

  // المستخدم النشط
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dzpos_auth_user');
    return saved ? JSON.parse(saved) : db.getUsers()[0]; // الافتراضي admin
  });

  const isAdmin = currentUser?.role === 'admin';

  const login = (user: string, pass: string): boolean => {
    const auth = db.authenticate(user, pass);
    if (auth) {
      setCurrentUser(auth);
      localStorage.setItem('dzpos_auth_user', JSON.stringify(auth));
      showToast(lang === 'ar' ? `مرحبًا ${auth.fullName}` : `Bienvenue ${auth.fullName}`, 'success');
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dzpos_auth_user');
  };

  // البيانات
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());

  const refreshData = () => {
    setProducts(db.getProducts());
    setCategories(db.getCategories());
    setCustomers(db.getCustomers());
    setSuppliers(db.getSuppliers());
    setSales(db.getSales());
    setExpenses(db.getExpenses());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // حالة الترخيص والتفعيل (Lifetime License State)
  const [licenseResult, setLicenseResult] = useState<LicenseValidationResult | null>(null);
  const [isActivated, setIsActivated] = useState<boolean>(false);

  const refreshLicense = async () => {
    try {
      const res = await validateStoredLicense();
      setLicenseResult(res);
      setIsActivated(res.isValid);
    } catch {
      setIsActivated(false);
      setLicenseResult({
        isValid: false,
        status: 'unactivated',
        message: 'تعذر التحقق من حالة الترخيص.',
      });
    }
  };

  useEffect(() => {
    refreshLicense();
  }, []);

  // التنبيهات (Toast)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // سلة المبيعات
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // الصوت
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => sound.isEnabled());
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    sound.setSoundEnabled(next);
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      sound.playAlert();
      showToast(lang === 'ar' ? 'عذرًا، هذا المنتج غير متوفر في المخزون' : 'Article en rupture de stock', 'error');
      return;
    }

    sound.playScanBeep();
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        const newQty = item.quantity + quantity;
        if (newQty > product.stock) {
          showToast(
            lang === 'ar' ? `الكمية المطلوبة تتجاوز المتوفر (${product.stock})` : `Stock insuffisant (${product.stock})`,
            'error'
          );
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          subtotal: newQty * item.product.sellPrice - item.discount,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity,
            discount: 0,
            subtotal: quantity * product.sellPrice,
          },
        ];
      }
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stock;
          const validQty = Math.min(quantity, maxStock);
          return {
            ...item,
            quantity: validQty,
            subtotal: validQty * item.product.sellPrice - item.discount,
          };
        }
        return item;
      })
    );
  };

  const updateCartDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const validDiscount = Math.max(0, Math.min(discount, item.quantity * item.product.sellPrice));
          return {
            ...item,
            discount: validDiscount,
            subtotal: item.quantity * item.product.sellPrice - validDiscount,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  // حساب مجاميع السلة
  const cartTotals: CartTotals = useMemo(() => {
    let subtotal = 0;
    let itemDiscounts = 0;
    let totalItems = 0;

    cart.forEach((item) => {
      subtotal += item.quantity * item.product.sellPrice;
      itemDiscounts += item.discount;
      totalItems += item.quantity;
    });

    const netBeforeTva = Math.max(0, subtotal - itemDiscounts);
    // إذا رغب التاجر في احتساب الضريبة
    const tvaRate = settings.tvaRate || 0;
    // في الجزائر أسعار التجزئة عادة TTC، ولكن ندعم حسابها
    const tvaAmount = Math.round((netBeforeTva * (tvaRate / 100)) * 100) / 100;
    const finalTotal = netBeforeTva;

    return {
      subtotal,
      discount: itemDiscounts,
      tvaAmount,
      total: finalTotal,
      itemsCount: totalItems,
    };
  }, [cart, settings.tvaRate]);

  // إتمام البيع
  const completeSale = (
    paidAmount: number,
    paymentMethod: PaymentMethod,
    discountGeneral: number = 0
  ): { success: boolean; sale?: Sale; error?: string } => {
    if (cart.length === 0) {
      return { success: false, error: 'السلة فارغة' };
    }

    const totalToPay = Math.max(0, cartTotals.total - discountGeneral);

    if (paymentMethod === 'cash' && paidAmount < totalToPay) {
      return {
        success: false,
        error: lang === 'ar' ? 'المبلغ المدفوع أقل من الإجمالي' : 'Montant versé insuffisant',
      };
    }

    const saleItems: SaleItem[] = cart.map((item) => ({
      productId: item.product.id,
      productName: lang === 'ar' ? item.product.nameAr : item.product.nameFr,
      barcode: item.product.barcode,
      quantity: item.quantity,
      unitPrice: item.product.sellPrice,
      buyPrice: item.product.buyPrice,
      discount: item.discount,
      total: item.subtotal,
    }));

    const nextInvoiceNum = `FAC-${new Date().getFullYear()}-${String(sales.length + 1).padStart(4, '0')}`;

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      invoiceNumber: nextInvoiceNum,
      items: saleItems,
      subtotal: cartTotals.subtotal,
      discount: cartTotals.discount + discountGeneral,
      tvaRate: settings.tvaRate,
      tvaAmount: cartTotals.tvaAmount,
      total: totalToPay,
      paidAmount: paymentMethod === 'credit' ? paidAmount : Math.max(paidAmount, totalToPay),
      changeAmount: paymentMethod === 'cash' ? Math.max(0, paidAmount - totalToPay) : 0,
      paymentMethod,
      customerId: selectedCustomer?.id || 'cust_walkin',
      customerName: selectedCustomer ? selectedCustomer.name : (lang === 'ar' ? 'زبون عام (مجهول)' : 'Client Standard'),
      cashierId: currentUser?.id || 'usr_unknown',
      cashierName: currentUser?.fullName || 'Caisse',
      createdAt: new Date().toISOString(),
      status: 'completed',
    };

    db.recordSale(newSale);
    refreshData();
    clearCart();
    sound.playCheckoutSuccess();

    showToast(
      lang === 'ar' ? `تم إتمام الفاتورة ${newSale.invoiceNumber} بنجاح` : `Vente ${newSale.invoiceNumber} enregistrée`,
      'success'
    );

    return { success: true, sale: newSale };
  };

  // إدارة المنتجات
  const saveProduct = (product: Product) => {
    db.saveProduct(product);
    refreshData();
    showToast(lang === 'ar' ? 'تم حفظ بيانات المنتج' : 'Produit enregistré', 'success');
  };

  const deleteProduct = (productId: string): boolean => {
    if (!isAdmin) {
      showToast(t.cashierNoDeletePermission, 'error');
      return false;
    }
    db.deleteProduct(productId);
    refreshData();
    showToast(lang === 'ar' ? 'تم حذف المنتج من المخزون' : 'Produit supprimé', 'info');
    return true;
  };

  // إدارة العملاء والموردين
  const saveCustomer = (customer: Customer) => {
    db.saveCustomer(customer);
    refreshData();
    showToast(lang === 'ar' ? 'تم حفظ بيانات العميل' : 'Client enregistré', 'success');
  };

  const deleteCustomer = (customerId: string) => {
    db.deleteCustomer(customerId);
    refreshData();
    showToast(lang === 'ar' ? 'تم حذف العميل' : 'Client supprimé', 'info');
  };

  const saveSupplier = (supplier: Supplier) => {
    db.saveSupplier(supplier);
    refreshData();
    showToast(lang === 'ar' ? 'تم حفظ بيانات المورد' : 'Fournisseur enregistré', 'success');
  };

  const deleteSupplier = (supplierId: string) => {
    db.deleteSupplier(supplierId);
    refreshData();
    showToast(lang === 'ar' ? 'تم حذف المورد' : 'Fournisseur supprimé', 'info');
  };

  // المصاريف
  const addExpense = (data: Omit<Expense, 'id' | 'createdByName'>) => {
    const expense: Expense = {
      ...data,
      id: `exp_${Date.now()}`,
      createdByName: currentUser?.fullName || 'Admin',
    };
    db.addExpense(expense);
    refreshData();
    showToast(lang === 'ar' ? 'تم تسجيل المصروف' : 'Dépense enregistrée', 'success');
  };

  const deleteExpense = (expenseId: string) => {
    db.deleteExpense(expenseId);
    refreshData();
    showToast(lang === 'ar' ? 'تم حذف المصروف' : 'Dépense supprimée', 'info');
  };

  // الإعدادات وإعادة الضبط
  const updateSettings = (newSettings: AppSettings) => {
    db.updateSettings(newSettings);
    refreshData();
    showToast(lang === 'ar' ? 'تم تحديث الإعدادات بنجاح' : 'Paramètres mis à jour', 'success');
  };

  const resetDatabase = () => {
    db.initDatabase(true);
    refreshData();
    clearCart();
    showToast(lang === 'ar' ? 'تمت إعادة ضبط البيانات الافتراضية بنجاح' : 'Données réinitialisées', 'info');
  };

  const prepareForDelivery = (storeConfig: Partial<AppSettings>, keepCatalog: boolean = true) => {
    db.prepareForClientDelivery(storeConfig, keepCatalog);
    refreshData();
    clearCart();
    showToast(
      lang === 'ar'
        ? 'تمت تهيئة المحل بنجاح وجاهز لتسليم الزبون!'
        : 'Système initialisé pour le client avec succès !',
      'success'
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAdmin,
        lang,
        setLang,
        t,
        products,
        categories,
        customers,
        suppliers,
        sales,
        expenses,
        settings,
        refreshData,
        cart,
        selectedCustomer,
        setSelectedCustomer,
        addToCart,
        updateCartQuantity,
        updateCartDiscount,
        removeFromCart,
        clearCart,
        cartTotals,
        completeSale,
        saveProduct,
        deleteProduct,
        saveCustomer,
        deleteCustomer,
        saveSupplier,
        deleteSupplier,
        addExpense,
        deleteExpense,
        updateSettings,
        resetDatabase,
        prepareForDelivery,
        soundEnabled,
        toggleSound,
        toasts,
        showToast,
        licenseResult,
        isActivated,
        refreshLicense,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
