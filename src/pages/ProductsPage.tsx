import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Product } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  Upload,
  Barcode,
  Image as ImageIcon,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { NeuInput } from '../components/common/NeuInput';
import * as XLSX from 'xlsx';

export const ProductsPage: React.FC = () => {
  const { products, categories, saveProduct, deleteProduct, isAdmin, t, lang, showToast } =
    useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // حالة نافذة إضافة/تعديل منتج
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // حالة تأكيد الحذف
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // ملف استيراد CSV
  const fileInputRef = useRef<HTMLInputElement>(null);

  // فلترة المنتجات
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nameAr.toLowerCase().includes(q) ||
        p.nameFr.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      const matchStock = !onlyLowStock || p.stock <= p.minStockAlert;

      return matchCat && matchSearch && matchStock;
    });
  }, [products, selectedCategory, searchQuery, onlyLowStock]);

  // فتح نافذة الإضافة
  const handleAddNew = () => {
    setEditingProduct({
      id: `prod_${Date.now()}`,
      barcode: `613${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      nameAr: '',
      nameFr: '',
      category: categories[0]?.id || 'cat_grocery',
      buyPrice: 0,
      sellPrice: 0,
      stock: 10,
      minStockAlert: 5,
      unit: 'قطعة',
      imageUrl: '',
      createdAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const handleEdit = (p: Product) => {
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  // حفظ المنتج
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.nameAr.trim() && !editingProduct.nameFr.trim()) {
      showToast(t.requiredField, 'error');
      return;
    }

    saveProduct(editingProduct);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // حذف منتج (مع التحقق من صلاحيات المدير)
  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    if (!isAdmin) {
      showToast(t.cashierNoDeletePermission, 'error');
      setProductToDelete(null);
      return;
    }
    deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  // رفع صورة المنتج وتحويلها لـ Base64 محليًا
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({
          ...editingProduct,
          imageUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // توليد كود باركود جزائري عشوائي 613...
  const handleGenerateBarcode = () => {
    if (editingProduct) {
      const randomBarcode = `613${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      setEditingProduct({
        ...editingProduct,
        barcode: randomBarcode,
      });
    }
  };

  // تصدير المنتجات إلى ملف Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = products.map((p) => ({
      'الباركود (Barcode)': p.barcode,
      'الاسم بالعربية': p.nameAr,
      'الاسم بالفرنسية': p.nameFr,
      'التصنيف': p.category,
      'سعر الشراء (د.ج)': p.buyPrice,
      'سعر البيع (د.ج)': p.sellPrice,
      'الكمية المتوفرة': p.stock,
      'حد التنبيه': p.minStockAlert,
      'الوحدة': p.unit,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
    XLSX.writeFile(workbook, `Inventaire_DzPOS_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('تم تصدير ملف المخزون Excel بنجاح', 'success');
  };

  // استيراد المنتجات من ملف CSV
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        let importedCount = 0;

        // تخطي سطر العناوين والبدء من 1
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 4) {
            const barcode = parts[0] || `613${Date.now() + i}`;
            const nameAr = parts[1] || 'منتج مستورد';
            const buyPrice = parseFloat(parts[2]) || 0;
            const sellPrice = parseFloat(parts[3]) || 0;
            const stock = parseFloat(parts[4]) || 10;

            saveProduct({
              id: `prod_imp_${Date.now()}_${i}`,
              barcode,
              nameAr,
              nameFr: nameAr,
              category: 'cat_grocery',
              buyPrice,
              sellPrice,
              stock,
              minStockAlert: 5,
              unit: 'قطعة',
              createdAt: new Date().toISOString(),
            });
            importedCount++;
          }
        }
        showToast(`تم استيراد ${importedCount} منتج بنجاح`, 'success');
      } catch (err) {
        showToast('خطأ أثناء قراءة ملف CSV', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* شريط الأدوات العلوي: بحث، تصفيات، وأزرار إضافة وتصدير */}
      <div className="neu-flat p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* حقل البحث والتصفية السريعة */}
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="flex-1">
            <NeuInput
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer"
          >
            <option value="all">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === 'ar' ? c.nameAr : c.nameFr}
              </option>
            ))}
          </select>

          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              onlyLowStock
                ? 'neu-pressed text-rose-600 bg-rose-50'
                : 'neu-raised text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>نواقص المخزون</span>
          </button>
        </div>

        {/* أزرار الإجراءات: إضافة، تصدير، واستيراد */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCsv}
            accept=".csv"
            className="hidden"
          />
          <NeuButton
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
            title="استيراد منتجات من ملف CSV"
          >
            <span>{t.importCsv}</span>
          </NeuButton>

          <NeuButton
            size="sm"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            <span>{t.exportExcel}</span>
          </NeuButton>

          <NeuButton
            variant="primary"
            size="sm"
            onClick={handleAddNew}
            icon={<Plus className="w-4 h-4" />}
          >
            <span>{t.add}</span>
          </NeuButton>
        </div>
      </div>

      {/* جدول المنتجات المعروضة */}
      <NeuCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-200/50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">المنتج</th>
                <th className="py-3 px-4 text-start">الباركود</th>
                <th className="py-3 px-4 text-start">التصنيف</th>
                <th className="py-3 px-4 text-end">سعر الشراء</th>
                <th className="py-3 px-4 text-end">سعر البيع</th>
                <th className="py-3 px-4 text-end">الربح</th>
                <th className="py-3 px-4 text-center">المخزون</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    لا توجد منتجات مطابقة في المخزون
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const profit = p.sellPrice - p.buyPrice;
                  const isLow = p.stock <= p.minStockAlert;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.nameAr}
                              className="w-8 h-8 rounded-lg object-cover neu-inset"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center text-slate-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="line-clamp-1">{p.nameAr}</div>
                            <div className="text-[10px] text-slate-400 font-normal line-clamp-1">
                              {p.nameFr}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                        {p.barcode}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {categories.find((c) => c.id === p.category)?.nameAr || p.category}
                      </td>

                      <td className="py-3 px-4 text-end font-semibold text-slate-600 tabular-nums">
                        {p.buyPrice.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-end font-extrabold text-blue-700 tabular-nums">
                        {p.sellPrice.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-end font-bold text-emerald-600 tabular-nums">
                        +{profit.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 ${
                            isLow
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'neu-inset text-slate-700'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          <span>
                            {p.stock} {p.unit}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-blue-600 transition-colors"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-rose-600 transition-colors"
                              title={t.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </NeuCard>

      {/* نافذة إضافة أو تعديل منتج Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-lg bg-white my-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingProduct.id.startsWith('prod_1') ? t.edit : t.add}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
              {/* الباركود وتوليد تلقائي */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  {t.productBarcode}
                </label>
                <div className="flex items-center gap-2">
                  <NeuInput
                    required
                    value={editingProduct.barcode}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcode: e.target.value })
                    }
                    className="font-mono text-xs"
                  />
                  <NeuButton
                    type="button"
                    size="sm"
                    onClick={handleGenerateBarcode}
                    icon={<Barcode className="w-3.5 h-3.5" />}
                    title={t.generateBarcode}
                  >
                    توليد
                  </NeuButton>
                </div>
              </div>

              {/* الاسم بالعربية والفرنسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NeuInput
                  label={t.productNameAr}
                  required
                  value={editingProduct.nameAr}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nameAr: e.target.value })
                  }
                  placeholder="مثال: حليب كانديا 1 لتر"
                />
                <NeuInput
                  label={t.productNameFr}
                  value={editingProduct.nameFr}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nameFr: e.target.value })
                  }
                  placeholder="Ex: Lait Candia 1L"
                />
              </div>

              {/* التصنيف ووحدة القياس */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                    {t.productCategory}
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    className="neu-input w-full rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 bg-white/70"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.nameAr : c.nameFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                    {t.unit}
                  </label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, unit: e.target.value })
                    }
                    className="neu-input w-full rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 bg-white/70"
                  >
                    <option value="قطعة">قطعة (Pièce)</option>
                    <option value="علبة">علبة (Boîte)</option>
                    <option value="كيس">كيس (Sachet)</option>
                    <option value="قارورة">قارورة (Bouteille)</option>
                    <option value="كغ">كيلوغرام (Kg)</option>
                    <option value="باكي">حزمة (Paquet)</option>
                  </select>
                </div>
              </div>

              {/* الأسعار والهامش الربحي */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NeuInput
                  label={t.buyPrice}
                  type="number"
                  required
                  value={editingProduct.buyPrice}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      buyPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums"
                />
                <NeuInput
                  label={t.sellPrice}
                  type="number"
                  required
                  value={editingProduct.sellPrice}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      sellPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums font-bold text-blue-600"
                />
              </div>

              {/* الكمية وحد التنبيه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NeuInput
                  label={t.stockQuantity}
                  type="number"
                  required
                  value={editingProduct.stock}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums"
                />
                <NeuInput
                  label={t.minStockAlert}
                  type="number"
                  required
                  value={editingProduct.minStockAlert}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      minStockAlert: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums"
                />
              </div>

              {/* صورة المنتج */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  {t.productImage}
                </label>
                <div className="flex items-center gap-3">
                  {editingProduct.imageUrl ? (
                    <img
                      src={editingProduct.imageUrl}
                      alt="Product"
                      className="w-12 h-12 rounded-xl object-cover neu-inset"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl neu-inset flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-slate-500 file:neu-raised file:rounded-xl file:px-3 file:py-1.5 file:border-0 file:text-xs file:font-bold file:text-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <NeuButton type="submit" variant="primary" fullWidth>
                  {t.save}
                </NeuButton>
                <NeuButton
                  type="button"
                  variant="default"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t.cancel}
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تأكيد حذف منتج */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-sm bg-white shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl neu-inset mx-auto flex items-center justify-center text-rose-500 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-800 mb-1">
              {t.confirmDelete}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              سيتم حذف المنتج "{productToDelete.nameAr}" نهائيًا من قاعدة البيانات.
            </p>
            <div className="flex items-center justify-center gap-2">
              <NeuButton variant="danger" onClick={handleConfirmDelete} fullWidth>
                {t.yes}، احذف
              </NeuButton>
              <NeuButton variant="default" onClick={() => setProductToDelete(null)} fullWidth>
                {t.cancel}
              </NeuButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
