import React, { useEffect, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Receipt } from '../types/database';
import { toast } from 'react-hot-toast';

const PAGE_SIZE = 50;

export function ReceiptList() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, [page]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error, count } = await supabase
        .from('receipts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      setReceipts(data || []);
      setHasMore(count ? count > (page + 1) * PAGE_SIZE : false);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('領収書の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['日付', '取引先', '勘定科目', '金額'];
    const csvData = receipts.map(receipt => [
      receipt.date,
      receipt.vendor,
      receipt.account_category,
      receipt.amount.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receipts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#77CDE9]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 sm:p-6 flex justify-between items-center border-b">
        <h2 className="text-lg font-medium text-gray-900">読み取り済み領収書一覧</h2>
        <button
          onClick={handleExportCSV}
          disabled={receipts.length === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#77CDE9] rounded-lg hover:bg-[#5bb8d6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          CSV出力
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="text-gray-600 text-center py-12">
          まだ領収書の読み取りがありません。<br />
          カメラボタンから領収書の読み取りを開始してください。
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    取引先
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    勘定科目
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.account_category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatAmount(receipt.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 flex items-center justify-between border-t">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#77CDE9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              前へ
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#77CDE9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              次へ
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}