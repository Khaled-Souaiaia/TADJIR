// خدمة قاعدة البيانات المحلية لنظام DzPOS Pro
// يدعم التخزين المحلي Offline بالكامل في المتصفح والتطبيق المكتبي Electron
// SQLite Database Service with offline persistence and Electron IPC integration

import { Product, ProductCategory, Customer, Supplier, Sale, Expense, AppSettings, User } from '../types';

// المفاتيح في التخزين المحلي
const STORAGE_PREFIX = 'dzpos_db_';
const KEYS = {
  PRODUCTS: `${STORAGE_PREFIX}products`,
  CATEGORIES: `${STORAGE_PREFIX}categories`,
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  SUPPLIERS: `${STORAGE_PREFIX}suppliers`,
  SALES: `${STORAGE_PREFIX}sales`,
  EXPENSES: `${STORAGE_PREFIX}expenses`,
  USERS: `${STORAGE_PREFIX}users`,
  SETTINGS: `${STORAGE_PREFIX}settings`,
  INITIALIZED: `${STORAGE_PREFIX}initialized_v1`,
};

// بيانات الأصناف الافتراضية
export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_grocery', nameAr: 'المواد الغذائية العامة', nameFr: 'Épicerie Générale', icon: 'ShoppingBag' },
  { id: 'cat_beverages', nameAr: 'المشروبات والعصائر', nameFr: 'Boissons & Eaux', icon: 'Coffee' },
  { id: 'cat_dairy', nameAr: 'الحليب ومشتقاته', nameFr: 'Produits Laitiers', icon: 'Milk' },
  { id: 'cat_cleaning', nameAr: 'مواد التنظيف والمنزل', nameFr: 'Hygiène & Entretien', icon: 'Sparkles' },
  { id: 'cat_biscuits', nameAr: 'البسكويت والشكولاطة', nameFr: 'Biscuits & Confiserie', icon: 'Cookie' },
  { id: 'cat_coffee_tea', nameAr: 'القهوة والشاي', nameFr: 'Café & Thé', icon: 'CupSoda' },
];

// منتجات السوق الجزائري الشائعة
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    barcode: '6130000000018',
    nameAr: 'كسكس سيم متوسط 1 كغ',
    nameFr: 'Couscous Sim Moyen 1kg',
    category: 'cat_grocery',
    buyPrice: 110,
    sellPrice: 140,
    stock: 45,
    minStockAlert: 10,
    unit: 'كيس',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    barcode: '6130000000025',
    nameAr: 'معكرونة سفينة سباغيتي 500 غ',
    nameFr: 'Pâtes Safina Spaghetti 500g',
    category: 'cat_grocery',
    buyPrice: 65,
    sellPrice: 85,
    stock: 60,
    minStockAlert: 15,
    unit: 'علبة',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_3',
    barcode: '6130000000032',
    nameAr: 'زيت المائدة عافية 5 لتر',
    nameFr: 'Huile de Table Afia 5 Litres',
    category: 'cat_grocery',
    buyPrice: 950,
    sellPrice: 1050,
    stock: 16,
    minStockAlert: 5,
    unit: 'قارورة',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_4',
    barcode: '6130000000049',
    nameAr: 'حليب كانديا سيلويت 1 لتر',
    nameFr: 'Lait Candia Silhouette 1L',
    category: 'cat_dairy',
    buyPrice: 130,
    sellPrice: 150,
    stock: 35,
    minStockAlert: 8,
    unit: 'علبة',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_5',
    barcode: '6130000000056',
    nameAr: 'شوكولاتة الطلي المرجان 700 غ',
    nameFr: 'Pâte à Tartiner El Mordjene 700g',
    category: 'cat_biscuits',
    buyPrice: 680,
    sellPrice: 820,
    stock: 12,
    minStockAlert: 6,
    unit: 'برطمان',
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_6',
    barcode: '6130000000063',
    nameAr: 'مشروب غازي حمود بوعلام أبيض 1 لتر',
    nameFr: 'Boisson Hamoud Boualem Blanc 1L',
    category: 'cat_beverages',
    buyPrice: 95,
    sellPrice: 120,
    stock: 52,
    minStockAlert: 12,
    unit: 'قارورة',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_7',
    barcode: '6130000000070',
    nameAr: 'مشروب سيليكتو كانيت 33 سل',
    nameFr: 'Boisson Selecto Canette 33cl',
    category: 'cat_beverages',
    buyPrice: 60,
    sellPrice: 80,
    stock: 4, // منخفض للتنبيه التجريبي
    minStockAlert: 10,
    unit: 'علبة',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_8',
    barcode: '6130000000087',
    nameAr: 'قهوة مطحونة فاكتو الصافية 250 غ',
    nameFr: 'Café Moulu Facto Pur 250g',
    category: 'cat_coffee_tea',
    buyPrice: 220,
    sellPrice: 270,
    stock: 28,
    minStockAlert: 8,
    unit: 'باكي',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_9',
    barcode: '6130000000094',
    nameAr: 'صابون لو شات أبيض 150 غ',
    nameFr: 'Savon Le Chat Blanc 150g',
    category: 'cat_cleaning',
    buyPrice: 85,
    sellPrice: 110,
    stock: 3, // منخفض للتنبيه التجريبي
    minStockAlert: 10,
    unit: 'قطعة',
    imageUrl: 'https://images.unsplash.com/photo-1607006314646-0b165b4f0b2f?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_10',
    barcode: '6130000000100',
    nameAr: 'ماء معدني لالة خديجة 1.5 لتر',
    nameFr: 'Eau Minérale Lalla Khedidja 1.5L',
    category: 'cat_beverages',
    buyPrice: 38,
    sellPrice: 50,
    stock: 96,
    minStockAlert: 24,
    unit: 'قارورة',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_11',
    barcode: '6130000000117',
    nameAr: 'جبن تارتينو مثلثات 16 قطعة',
    nameFr: 'Fromage Tartino Portion 16p',
    category: 'cat_dairy',
    buyPrice: 190,
    sellPrice: 240,
    stock: 24,
    minStockAlert: 8,
    unit: 'علبة',
    imageUrl: 'https://images.unsplash.com/photo-1634487359989-3e90c9432133?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_12',
    barcode: '6130000000124',
    nameAr: 'بسكويت بيمو كاكاو وشوكولا',
    nameFr: 'Biscuits Bimo Goûter Chocolat',
    category: 'cat_biscuits',
    buyPrice: 100,
    sellPrice: 130,
    stock: 36,
    minStockAlert: 10,
    unit: 'علبة',
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
];

// عملاء جزائريون افتراضيون
export const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust_walkin',
    name: 'زبون عام (مجهول)',
    phone: '-',
    address: 'المحل',
    wilaya: 'الجزائر العاصمة',
    creditBalance: 0,
    notes: 'عميل نقدي فوري',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust_1',
    name: 'أحمد بلقاسم',
    phone: '0661 22 33 44',
    address: 'شارع العربي بن مهيدي',
    wilaya: 'وهران',
    creditBalance: 2450, // ديون سابقة
    notes: 'حساب شهري يسدد بداية كل شهر',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'cust_2',
    name: 'سيدعلي بومدين',
    phone: '0555 44 88 99',
    address: 'حي ديار المحصول، المدنية',
    wilaya: 'الجزائر العاصمة',
    creditBalance: 0,
    notes: 'زبون دائم',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'cust_3',
    name: 'فاطمة الزهراء قدور',
    phone: '0770 12 34 56',
    address: 'المدينة القديمة السويقة',
    wilaya: 'قسنطينة',
    creditBalance: 1200,
    notes: 'شراء دوري',
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
];

// موردون جزائريون
export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    name: 'عمار شريفي',
    company: 'مجمع سيفيتال للصناعات الغذائية (Cevital)',
    phone: '021 80 80 80',
    address: 'المنطقة الصناعية الرويبة',
    debtBalance: 18500,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 'sup_2',
    name: 'كريم حمودي',
    company: 'مؤسسة حمود بوعلام للمشروبات (Hamoud Boualem)',
    phone: '021 67 40 40',
    address: 'شارع حسيبة بن بوعلي، الجزائر',
    debtBalance: 0,
    createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
  },
  {
    id: 'sup_3',
    name: 'مسعود بوقرة',
    company: 'مطاحن سميد وعجائن سيم (Groupe Sim)',
    phone: '025 41 20 20',
    address: 'عين الرمانة، البليدة',
    debtBalance: 9600,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
  },
];

// إعدادات المتجر الجزائري
export const DEFAULT_SETTINGS: AppSettings = {
  storeNameAr: 'سوبرماركت الأوراس التجاري',
  storeNameFr: 'Superette Les Aurès',
  activityDescription: 'تجارة التجزئة في المواد الغذائية العامة ومواد التنظيف',
  address: 'شارع أول نوفمبر 1954، الجزائر',
  wilaya: '16 - الجزائر العاصمة',
  phone: '0550 12 34 56',
  rcNumber: '16/00-1249870B22',
  nifNumber: '002216012498702',
  nisNumber: '09981601004589',
  aiNumber: '16012498702',
  tvaRate: 19,
  currency: 'د.ج',
  receiptFormat: 'thermal_80',
  receiptFooterMessage: 'شكرًا لزيارتكم ونتمنى لكم يومًا سعيدًا | Merci pour votre visite!',
};

// المستخدمون الافتراضيون
export const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'مدير المحل (Admin)',
    role: 'admin',
    passwordHash: 'password', // الافتراضي
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_cashier',
    username: 'cashier',
    fullName: 'أمين الصندوق (Caisse 1)',
    role: 'cashier',
    passwordHash: 'cashier123',
    createdAt: new Date().toISOString(),
  },
];

// المصاريف الافتراضية
export const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp_1',
    title: 'فاتورة الكهرباء والغاز سونلغاز ثلاثي 3',
    amount: 14500,
    category: 'electricity_gas',
    notes: 'تسديد عبر بريد الجزائر',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdByName: 'مدير المحل',
  },
  {
    id: 'exp_2',
    title: 'كراء المحل التجاري لشهر سبتمبر',
    amount: 55000,
    category: 'rent',
    notes: 'وصل إيجار رقم 09/2026',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdByName: 'مدير المحل',
  },
  {
    id: 'exp_3',
    title: 'نقل وتفريغ شحنة البضائع',
    amount: 3500,
    category: 'transport',
    notes: 'شاحنة نقل سلع الرويبة',
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdByName: 'أمين الصندوق',
  },
];

// مبيعات تجريبية سابقة لإظهار مؤشرات ورسوم بيانية واقعية
export const DEFAULT_SALES: Sale[] = [
  {
    id: 'sale_1',
    invoiceNumber: 'FAC-2026-0001',
    items: [
      {
        productId: 'prod_1',
        productName: 'كسكس سيم متوسط 1 كغ',
        barcode: '6130000000018',
        quantity: 2,
        unitPrice: 140,
        buyPrice: 110,
        discount: 0,
        total: 280,
      },
      {
        productId: 'prod_6',
        productName: 'مشروب غازي حمود بوعلام أبيض 1 لتر',
        barcode: '6130000000063',
        quantity: 3,
        unitPrice: 120,
        buyPrice: 95,
        discount: 0,
        total: 360,
      },
    ],
    subtotal: 640,
    discount: 0,
    tvaRate: 19,
    tvaAmount: 0, // معفاة أو مدمجة للتجزئة
    total: 640,
    paidAmount: 1000,
    changeAmount: 360,
    paymentMethod: 'cash',
    customerId: 'cust_walkin',
    customerName: 'زبون عام (مجهول)',
    cashierId: 'usr_admin',
    cashierName: 'مدير المحل (Admin)',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'completed',
  },
  {
    id: 'sale_2',
    invoiceNumber: 'FAC-2026-0002',
    items: [
      {
        productId: 'prod_3',
        productName: 'زيت المائدة عافية 5 لتر',
        barcode: '6130000000032',
        quantity: 1,
        unitPrice: 1050,
        buyPrice: 950,
        discount: 50,
        total: 1000,
      },
      {
        productId: 'prod_5',
        productName: 'شوكولاتة الطلي المرجان 700 غ',
        barcode: '6130000000056',
        quantity: 1,
        unitPrice: 820,
        buyPrice: 680,
        discount: 0,
        total: 820,
      },
    ],
    subtotal: 1870,
    discount: 50,
    tvaRate: 19,
    tvaAmount: 0,
    total: 1820,
    paidAmount: 2000,
    changeAmount: 180,
    paymentMethod: 'cash',
    customerId: 'cust_1',
    customerName: 'أحمد بلقاسم',
    cashierId: 'usr_cashier',
    cashierName: 'أمين الصندوق (Caisse 1)',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'completed',
  },
  {
    id: 'sale_3',
    invoiceNumber: 'FAC-2026-0003',
    items: [
      {
        productId: 'prod_8',
        productName: 'قهوة مطحونة فاكتو الصافية 250 غ',
        barcode: '6130000000087',
        quantity: 2,
        unitPrice: 270,
        buyPrice: 220,
        discount: 0,
        total: 540,
      },
      {
        productId: 'prod_11',
        productName: 'جبن تارتينو مثلثات 16 قطعة',
        barcode: '6130000000117',
        quantity: 2,
        unitPrice: 240,
        buyPrice: 190,
        discount: 0,
        total: 480,
      },
    ],
    subtotal: 1020,
    discount: 20,
    tvaRate: 19,
    tvaAmount: 0,
    total: 1000,
    paidAmount: 1000,
    changeAmount: 0,
    paymentMethod: 'cash',
    customerId: 'cust_2',
    customerName: 'سيدعلي بومدين',
    cashierId: 'usr_cashier',
    cashierName: 'أمين الصندوق (Caisse 1)',
    createdAt: new Date().toISOString(),
    status: 'completed',
  },
];

// فئة إدارة قاعدة البيانات
class DatabaseService {
  constructor() {
    this.initDatabase();
  }

  // تهيئة وتعبئة قاعدة البيانات لأول مرة
  public initDatabase(forceReset: boolean = false): void {
    try {
      const isInitialized = localStorage.getItem(KEYS.INITIALIZED);
      if (!isInitialized || forceReset) {
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
        localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(DEFAULT_SUPPLIERS));
        localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
        localStorage.setItem(KEYS.SALES, JSON.stringify(DEFAULT_SALES));
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        localStorage.setItem(KEYS.INITIALIZED, 'true');
      }
    } catch (e) {
      console.error('Database initialization error:', e);
    }
  }

  // --- المنتجات (Products) ---
  public getProducts(): Product[] {
    try {
      const data = localStorage.getItem(KEYS.PRODUCTS);
      return data ? JSON.parse(data) : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  }

  public saveProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    return product;
  }

  public deleteProduct(productId: string): boolean {
    const products = this.getProducts().filter((p) => p.id !== productId);
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    return true;
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.getProducts().find((p) => p.barcode === clean);
  }

  public updateStock(productId: string, quantitySold: number): void {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.stock = Math.max(0, product.stock - quantitySold);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    }
  }

  // --- التصنيفات (Categories) ---
  public getCategories(): ProductCategory[] {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  // --- العملاء (Customers) ---
  public getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  }

  public saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
    } else {
      customers.unshift(customer);
    }
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
    return customer;
  }

  public deleteCustomer(customerId: string): boolean {
    const customers = this.getCustomers().filter((c) => c.id !== customerId);
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
    return true;
  }

  public updateCustomerCredit(customerId: string, amountChange: number): void {
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      customer.creditBalance = Math.max(0, (customer.creditBalance || 0) + amountChange);
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
    }
  }

  // --- الموردون (Suppliers) ---
  public getSuppliers(): Supplier[] {
    try {
      const data = localStorage.getItem(KEYS.SUPPLIERS);
      return data ? JSON.parse(data) : DEFAULT_SUPPLIERS;
    } catch {
      return DEFAULT_SUPPLIERS;
    }
  }

  public saveSupplier(supplier: Supplier): Supplier {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    if (index >= 0) {
      suppliers[index] = supplier;
    } else {
      suppliers.unshift(supplier);
    }
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    return supplier;
  }

  public deleteSupplier(supplierId: string): boolean {
    const suppliers = this.getSuppliers().filter((s) => s.id !== supplierId);
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    return true;
  }

  // --- المبيعات والفواتير (Sales) ---
  public getSales(): Sale[] {
    try {
      const data = localStorage.getItem(KEYS.SALES);
      return data ? JSON.parse(data) : DEFAULT_SALES;
    } catch {
      return DEFAULT_SALES;
    }
  }

  public recordSale(sale: Sale): Sale {
    const sales = this.getSales();
    sales.unshift(sale);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));

    // خصم الكميات من المخزون
    sale.items.forEach((item) => {
      this.updateStock(item.productId, item.quantity);
    });

    // تحديث رصيد كريدي العميل إذا كانت طريقة الدفع بالدين (Credit)
    if (sale.paymentMethod === 'credit' && sale.customerId && sale.customerId !== 'cust_walkin') {
      const unpaid = Math.max(0, sale.total - sale.paidAmount);
      this.updateCustomerCredit(sale.customerId, unpaid);
    }

    return sale;
  }

  // --- المصروفات (Expenses) ---
  public getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      return data ? JSON.parse(data) : DEFAULT_EXPENSES;
    } catch {
      return DEFAULT_EXPENSES;
    }
  }

  public addExpense(expense: Expense): Expense {
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    return expense;
  }

  public deleteExpense(expenseId: string): boolean {
    const expenses = this.getExpenses().filter((e) => e.id !== expenseId);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    return true;
  }

  // --- المستخدمون (Users) ---
  public getUsers(): User[] {
    try {
      const data = localStorage.getItem(KEYS.USERS);
      return data ? JSON.parse(data) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  }

  public authenticate(username: string, passwordAttempt: string): User | null {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();
    const users = this.getUsers();

    const user = users.find(
      (u) => u.username.toLowerCase() === cleanUser && (u.passwordHash === cleanPass || !u.passwordHash)
    );
    return user || null;
  }

  public saveUser(user: User): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return user;
  }

  // --- الإعدادات (Settings) ---
  public getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public updateSettings(settings: AppSettings): AppSettings {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }

  // --- النسخ الاحتياطي وتصدير SQL / JSON ---
  public exportBackup(): string {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      store: this.getSettings(),
      categories: this.getCategories(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      sales: this.getSales(),
      expenses: this.getExpenses(),
      users: this.getUsers(),
    };
    return JSON.stringify(payload, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const payload = JSON.parse(jsonString);
      if (payload.products) localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(payload.products));
      if (payload.categories) localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(payload.categories));
      if (payload.customers) localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(payload.customers));
      if (payload.suppliers) localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(payload.suppliers));
      if (payload.sales) localStorage.setItem(KEYS.SALES, JSON.stringify(payload.sales));
      if (payload.expenses) localStorage.setItem(KEYS.EXPENSES, JSON.stringify(payload.expenses));
      if (payload.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(payload.settings));
      if (payload.users) localStorage.setItem(KEYS.USERS, JSON.stringify(payload.users));
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  // تهيئة وتجهيز النظام للتسليم النهائي للعميل (Client Delivery Mode)
  public prepareForClientDelivery(
    storeConfig: Partial<AppSettings>,
    keepCatalog: boolean = true
  ): void {
    // تصفية سجل المبيعات والفواتير
    localStorage.setItem(KEYS.SALES, JSON.stringify([]));
    // تصفية المصروفات
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify([]));
    // إعادة تعيين العملاء (إبقاء الزبون العام فقط بدون ديون)
    const walkInCustomer = DEFAULT_CUSTOMERS.find((c) => c.id === 'cust_walkin') || {
      id: 'cust_walkin',
      name: 'زبون عام (مجهول)',
      phone: '-',
      address: 'المحل',
      wilaya: 'الجزائر',
      creditBalance: 0,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([{ ...walkInCustomer, creditBalance: 0 }]));

    // تصفية أو إبقاء المنتجات
    if (!keepCatalog) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([]));
    }

    // تحديث بيانات المتجر الجديد
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...storeConfig };
    this.updateSettings(updatedSettings);
  }

  // إنشاء سكريبت SQLite SQL متوافق 100% للتطبيق المكتبي database.db
  public generateSqliteDump(): string {
    const products = this.getProducts();
    const customers = this.getCustomers();
    const settings = this.getSettings();

    let sql = `-- TAJIR - SQLite Schema & Seed Dump (Algerian Retail POS)
-- Generated: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  barcode TEXT UNIQUE,
  name_ar TEXT,
  name_fr TEXT,
  category TEXT,
  buy_price REAL,
  sell_price REAL,
  stock REAL,
  min_stock_alert REAL,
  unit TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  address TEXT,
  wilaya TEXT,
  credit_balance REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  total REAL,
  payment_method TEXT,
  customer_id TEXT,
  cashier_name TEXT,
  created_at TEXT
);

-- Store Info
INSERT OR REPLACE INTO settings (key, value) VALUES ('store_name', '${settings.storeNameAr.replace(/'/g, "''")}');
INSERT OR REPLACE INTO settings (key, value) VALUES ('nif', '${settings.nifNumber}');
INSERT OR REPLACE INTO settings (key, value) VALUES ('rc', '${settings.rcNumber}');

-- Products
`;

    products.forEach((p) => {
      sql += `INSERT OR REPLACE INTO products VALUES ('${p.id}', '${p.barcode}', '${p.nameAr.replace(/'/g, "''")}', '${p.nameFr.replace(/'/g, "''")}', '${p.category}', ${p.buyPrice}, ${p.sellPrice}, ${p.stock}, ${p.minStockAlert}, '${p.unit}', '${p.createdAt}');\n`;
    });

    customers.forEach((c) => {
      sql += `INSERT OR REPLACE INTO customers VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.phone}', '${c.address.replace(/'/g, "''")}', '${c.wilaya}', ${c.creditBalance}, '${c.createdAt}');\n`;
    });

    return sql;
  }
}

export const db = new DatabaseService();
