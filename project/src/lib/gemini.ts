import { toast } from 'react-hot-toast';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

type ReceiptAnalysisResult = {
  date: string;
  vendor: string;
  account_category: string;
  amount: number;
};

export async function analyzeReceipt(imageBase64: string): Promise<ReceiptAnalysisResult> {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `
以下の領収書画像から必要な情報を抽出し、指定されたJSONフォーマットで返してください。

必要な情報:
1. date: 領収書の日付（YYYY-MM-DD形式）
2. vendor: 取引先の名称
3. account_category: 勘定科目（消耗品費、交通費、会議費、通信費、など）
4. amount: 金額（数値のみ。カンマや円マークは除く）

レスポンス形式:
{
  "date": "YYYY-MM-DD",
  "vendor": "取引先名",
  "account_category": "勘定科目",
  "amount": 金額
}

注意点:
- 日付は必ずYYYY-MM-DD形式で返すこと
- 金額は数値のみを返すこと（カンマや円マークは除く）
- 取引内容から適切な勘定科目を判断すること
`,
          }, {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64.split(',')[1]
            }
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // JSONテキストを抽出して解析
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // 日付のフォーマットを確認
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(result.date)) {
      // 日付が正しいフォーマットでない場合は今日の日付を使用
      result.date = new Date().toISOString().split('T')[0];
    }
    
    // 金額を数値に変換（カンマや円マークを除去）
    const amount = typeof result.amount === 'string' 
      ? parseInt(result.amount.replace(/[^\d]/g, ''))
      : result.amount;
    
    // 結果の検証と整形
    return {
      date: result.date,
      vendor: result.vendor || '',
      account_category: result.account_category || '',
      amount: amount || 0
    };
  } catch (error) {
    console.error('Receipt analysis failed:', error);
    toast.error('領収書の解析に失敗しました');
    // デフォルト値を返す
    return {
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      account_category: '',
      amount: 0
    };
  }
}