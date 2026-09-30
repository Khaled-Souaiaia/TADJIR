import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Sale } from '../types';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  Coins,
  TrendingUp,
  Receipt,
  Eye,
  ShieldAlert,
  ArrowDownCircle,
  FileText,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export const ReportsPage: React.FC = () => {
  const { sales, isAdmin, t, lang, showToast } = useApp();

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // إذا لم يكن المدير، نظهر رسالة الحظر
  if (!isAdmin) {
    return (
      <div className="neu-flat rounded-3xl p-12 text-center max-w-lg mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl neu-inset mx-auto flex items-center justify-center text-rose-500 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">عذرًا، صلاحية مقيدة</h2>
        <p className="text-xs text-slate-500">
          حساب الكاشير ليس لديه صلاحية الوصول إلى التقارير المالية والأرباح. يرجى تسجيل الدخول بحساب المدير.
        </p>
      </div>
    );
  }

  // تصفية المبيعات
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.slice(0, 7);

    return sales.filter((s) => {
      // فلتر التاريخ
      if (dateFilter === 'today' && !s.createdAt.startsWith(todayStr)) return false;
      if (dateFilter === 'month' && !s.createdAt.startsWith(monthStr)) return false;
      if (dateFilter === 'week') {
        const saleDate = new Date(s.createdAt);
        const diffTime = Math.abs(now.getTime() - saleDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      }

      // فلتر أمين الصندوق
      if (cashierFilter !== 'all' && s.cashierName !== cashierFilter) return false;

      // فلتر وسيلة الدفع
      if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) return false;

      return true;
    });
  }, [sales, dateFilter, cashierFilter, paymentFilter]);

  // حساب مؤشرات التقرير
  const reportTotals = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let itemsCount = 0;

    filteredSales.forEach((s) => {
      revenue += s.total;
      s.items.forEach((item) => {
        itemsCount += item.quantity;
        profit += ((item.unitPrice || 0) - (item.buyPrice || 0)) * item.quantity;
      });
    });

    const averageTicket = filteredSales.length > 0 ? Math.round(revenue / filteredSales.length) : 0;

    return { revenue, profit, itemsCount, averageTicket };
  }, [filteredSales]);

  // قائمة أسماء الصناديق المتوفرة
  const cashiersList = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.cashierName) set.add(s.cashierName);
    });
    return Array.from(set);
  }, [sales]);

  // تصدير التقرير إلى Excel (.xlsx)
  const handleExportExcel = () => {
    const data = filteredSales.map((s) => ({
      'رقم الفاتورة': s.invoiceNumber,
      'تاريخ البيع': new Date(s.createdAt).toLocaleString('fr-FR'),
      'العميل': s.customerName,
      'أمين الصندوق': s.cashierName,
      'طريقة الدفع': s.paymentMethod,
      'المجموع الفرعي (د.ج)': s.subtotal,
      'الخصم (د.ج)': s.discount,
      'الصافي للدفع (د.ج)': s.total,
      'المبلغ المدفوع (د.ج)': s.paidAmount,
      'الصرف (د.ج)': s.changeAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventes');
    XLSX.writeFile(wb, `Rapport_Ventes_DzPOS_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('تم تصدير تقرير المبيعات إلى ملف Excel بنجاح', 'success');
  };

  // تصدير ملخص التقرير إلى PDF
  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Rapport des Ventes - DzPOS Pro Algerie', 14, 20);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Date de generation: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Nombre de transactions: ${filteredSales.length}`, 14, 34);
    doc.text(`Total Chiffre d'Affaires: ${reportTotals.revenue.toLocaleString()} DZD`, 14, 40);
    doc.text(`Marge Beneficiaire Estimee: ${reportTotals.profit.toLocaleString()} DZD`, 14, 46);

    doc.line(14, 50, 196, 50);

    let y = 58;
    doc.setFont('Helvetica', 'bold');
    doc.text('Ticket', 14, y);
    doc.text('Date', 50, y);
    doc.text('Client', 95, y);
    doc.text('Caissier', 135, y);
    doc.text('Total (DZD)', 170, y);

    doc.setFont('Helvetica', 'normal');
    y += 6;

    filteredSales.slice(0, 30).forEach((s) => {
      doc.text(s.invoiceNumber, 14, y);
      doc.text(new Date(s.createdAt).toLocaleDateString(), 50, y);
      doc.text((s.customerName || 'Comptoir').slice(0, 18), 95, y);
      doc.text(s.cashierName.slice(0, 15), 135, y);
      doc.text(`${s.total}`, 170, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`Rapport_Ventes_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('تم تحميل ملف التقرير PDF بنجاح', 'success');
  };

  return (
    <div className="space-y-5">
      {/* شريط أدوات التصفية والتصدير */}
      <div className="neu-flat p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* أزرار الفترات الزمنية */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'all' ? 'neu-pressed text-blue-600 bg-white/70' : 'neu-raised text-slate-600'
            }`}
          >
            كل الفترات
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'today' ? 'neu-pressed text-blue-600 bg-white/70' : 'neu-raised text-slate-600'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'week' ? 'neu-pressed text-blue-600 bg-white/70' : 'neu-raised text-slate-600'
            }`}
          >
            آخر 7 أيام
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'month' ? 'neu-pressed text-blue-600 bg-white/70' : 'neu-raised text-slate-600'
            }`}
          >
            الشهر الجاري
          </button>
        </div>

        {/* فلاتر الصندوق والدفع */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={cashierFilter}
            onChange={(e) => setCashierFilter(e.target.value)}
            className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer"
          >
            <option value="all">كل الصناديق</option>
            {cashiersList.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer"
          >
            <option value="all">كل طرق الدفع</option>
            <option value="cash">نقدًا (Espèces)</option>
            <option value="credit">كريدي (Crédit)</option>
            <option value="cib_card">بطاقة بنكية (CIB)</option>
          </select>

          {/* تصدير */}
          <NeuButton
            size="sm"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Excel
          </NeuButton>

          <NeuButton
            size="sm"
            onClick={handleExportPdf}
            icon={<FileText className="w-3.5 h-3.5 text-rose-600" />}
          >
            PDF
          </NeuButton>
        </div>
      </div>

      {/* بطاقات المؤشرات المالية للتقرير */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">إجمالي المبيعات المصفاة</div>
          <div className="text-2xl font-extrabold text-blue-700 tabular-nums">
            {reportTotals.revenue.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {filteredSales.length} معاملة منجزة
          </div>
        </NeuCard>

        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">هامش الأرباح التقديري</div>
          <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
            {reportTotals.profit.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            ربح إجمالي قبل خصم المصاريف
          </div>
        </NeuCard>

        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">متوسط قيمة السلة (Ticket)</div>
          <div className="text-2xl font-extrabold text-slate-800 tabular-nums">
            {reportTotals.averageTicket.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">لكل فاتورة بيع</div>
        </NeuCard>

        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">القطع والمواد المباعة</div>
          <div className="text-2xl font-extrabold text-purple-700 tabular-nums">
            {reportTotals.itemsCount}
            <span className="text-xs font-medium text-slate-400 ms-1.5">وحدة</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">كمية إجمالية</div>
        </NeuCard>
      </div>

      {/* جدول سجل الفواتير والمبيعات */}
      <NeuCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-200/50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">رقم الفاتورة</th>
                <th className="py-3 px-4 text-start">التاريخ والوقت</th>
                <th className="py-3 px-4 text-start">الزبون</th>
                <th className="py-3 px-4 text-start">أمين الصندوق</th>
                <th className="py-3 px-4 text-center">طريقة الدفع</th>
                <th className="py-3 px-4 text-end">الخصم</th>
                <th className="py-3 px-4 text-end">الصافي</th>
                <th className="py-3 px-4 text-center">معاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    لا توجد فواتير مطابقة لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {sale.invoiceNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {new Date(sale.createdAt).toLocaleString('fr-FR')}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {sale.customerName}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {sale.cashierName}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold neu-inset text-slate-700">
                        {sale.paymentMethod === 'cash'
                          ? 'نقدًا'
                          : sale.paymentMethod === 'credit'
                          ? 'كريدي'
                          : 'بطاقة'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-end font-semibold text-rose-500 tabular-nums">
                      {sale.discount > 0 ? `-${sale.discount}` : '-'}
                    </td>

                    <td className="py-3 px-4 text-end font-extrabold text-blue-700 tabular-nums">
                      {sale.total.toLocaleString()} {t.currency}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-blue-600 transition-colors"
                        title="معاينة وطباعة الفاتورة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </NeuCard>

      {/* معاينة الفاتورة المحددة */}
      {selectedSale && (
        <ReceiptModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  );
};
