import React, { useState, useRef } from 'react';
import { Camera, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeReceipt } from '../lib/gemini';

type ScanPhase = 'camera' | 'edit';
type ReceiptData = {
  date: string;
  vendor: string;
  account_category: string;
  amount: number;
};

export function ReceiptScanner() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<ScanPhase>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    date: '',
    vendor: '',
    account_category: '',
    amount: 0
  });

  // カメラの開始
  const startCamera = async () => {
    try {
      // すべてのビデオ入力デバイスを取得
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length === 0) {
        throw new Error('カメラデバイスが見つかりません');
      }

      // カメラストリームを取得
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // 可能な場合は背面カメラを優先
        }
      });

      // ビデオ要素にストリームを設定
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('カメラの起動に失敗しました:', error);
      // ユーザーにエラーを表示
      alert(`カメラの起動に失敗しました。以下を確認してください：
      1. ブラウザのカメラ権限が許可されているか
      2. カメラが他のアプリケーションで使用されていないか
      3. カメラドライバーが正しくインストールされているか`);
    }
  };

  // カメラの停止
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // 撮影処理
  const captureImage = async () => {
    if (!videoRef.current || !containerRef.current) return;

    try {
      setIsAnalyzing(true);
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      const container = containerRef.current;
      
      // コンテナのサイズを取得
      const containerRect = container.getBoundingClientRect();
      const scale = video.videoWidth / containerRect.width;
      
      // ガイドラインの位置とサイズを計算
      const guideWidth = Math.min(containerRect.width * 0.9, 400);
      const guideHeight = guideWidth * 1.4;
      const guideX = (containerRect.width - guideWidth) / 2;
      const guideY = (containerRect.height - guideHeight) / 2;
      
      // キャンバスサイズを設定
      canvas.width = guideWidth * scale;
      canvas.height = guideHeight * scale;
      
      // ビデオから該当部分のみを切り出し
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context is null');
      
      ctx.drawImage(
        video,
        guideX * scale,
        guideY * scale,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      // 画像をBase64に変換
      const imageBase64 = canvas.toDataURL('image/jpeg');
      
      // Gemini APIで解析
      const analysisResult = await analyzeReceipt(imageBase64);
      setReceiptData(analysisResult);
      
      stopCamera();
      setPhase('edit');
    } catch (error) {
      console.error('撮影に失敗しました:', error);
      toast.error('撮影に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // データの保存
  const saveReceipt = async () => {
    try {
      // 入力値のバリデーション
      if (receiptData.amount <= 0) {
        throw new Error('金額は0より大きい値を入力してください');
      }

      const receiptDate = new Date(receiptData.date);
      const today = new Date();
      if (receiptDate > today) {
        throw new Error('未来の日付は入力できません');
      }

      if (!receiptData.vendor.trim()) {
        throw new Error('取引先を入力してください');
      }

      if (!receiptData.account_category.trim()) {
        throw new Error('勘定科目を入力してください');
      }

      const { error } = await supabase
        .from('receipts')
        .insert([{
          user_id: user?.id,
          ...receiptData
        }]);

      if (error) throw error;

      toast.success('領収書を保存しました');
      resetAndReturnToCamera();
    } catch (error) {
      console.error('保存に失敗しました:', error);
      toast.error(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  // キャンセルして撮影画面に戻る
  const resetAndReturnToCamera = () => {
    setReceiptData({
      date: '',
      vendor: '',
      account_category: '',
      amount: 0
    });
    setPhase('camera');
    startCamera();
  };

  // コンポーネントのマウント時にカメラを開始
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  if (phase === 'camera') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-900 flex flex-col">
        {/* カメラビュー */}
        <div ref={containerRef} className="relative flex-1">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* ガイドメッセージ */}
          <div className="absolute top-4 left-0 right-0 text-center">
            <span className="inline-block text-sm text-white bg-black/50 px-4 py-2 rounded-full">
              領収書が枠内に収まるようにしてください
            </span>
          </div>
          {/* ガイドライン */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] aspect-[1/1.4] border-2 border-[#77CDE9] rounded-lg">
            <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-lg" />
          </div>
        </div>
        {/* 撮影ボタン */}
        <div className="bg-black/90 p-4 flex justify-center">
          <button
            onClick={captureImage}
            disabled={isAnalyzing}
            className="w-16 h-16 rounded-full bg-[#77CDE9] flex items-center justify-center hover:bg-[#5bb8d6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <div className="h-8 w-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-white" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 p-4 sm:p-6 overflow-auto">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">読み取り結果の確認</h2>
          <button
            onClick={resetAndReturnToCamera}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* 日付 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日付
            </label>
            <input
              type="date"
              value={receiptData.date}
              onChange={(e) => setReceiptData({ ...receiptData, date: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#77CDE9] focus:border-transparent"
            />
          </div>

          {/* 取引先 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              取引先
            </label>
            <input
              type="text"
              value={receiptData.vendor}
              onChange={(e) => setReceiptData({ ...receiptData, vendor: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#77CDE9] focus:border-transparent"
              placeholder="例: ○○商店"
            />
          </div>

          {/* 勘定科目 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              勘定科目
            </label>
            <input
              type="text"
              value={receiptData.account_category}
              onChange={(e) => setReceiptData({ ...receiptData, account_category: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#77CDE9] focus:border-transparent"
              placeholder="例: 消耗品費"
            />
          </div>

          {/* 金額 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              金額
            </label>
            <input
              type="number"
              value={receiptData.amount}
              onChange={(e) => setReceiptData({ ...receiptData, amount: parseInt(e.target.value) || 0 })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#77CDE9] focus:border-transparent"
              placeholder="例: 1000"
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
          <button
            onClick={resetAndReturnToCamera}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#77CDE9]"
          >
            キャンセル
          </button>
          <button
            onClick={saveReceipt}
            className="px-4 py-2 text-sm font-medium text-white bg-[#77CDE9] rounded-lg hover:bg-[#5bb8d6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#77CDE9]"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}