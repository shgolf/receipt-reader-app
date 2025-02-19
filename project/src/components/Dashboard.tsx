import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, List, LogOut } from 'lucide-react';
import { ReceiptList } from './ReceiptList';
import { ReceiptScanner } from './ReceiptScanner';
import { Logo } from './Logo';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'list' | 'scanner'>('list');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Logo />
            <nav className="flex space-x-2 sm:space-x-4">
              <button
                onClick={() => setActiveView('scanner')}
                className={`inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium ${
                  activeView === 'scanner' ? 'text-[#77CDE9]' : 'text-gray-700 hover:text-[#77CDE9]'
                } transition-colors`}
              >
                <Camera className="h-5 w-5 sm:mr-1" />
                <span className="hidden sm:inline">読み取り</span>
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium ${
                  activeView === 'list' ? 'text-[#77CDE9]' : 'text-gray-700 hover:text-[#77CDE9]'
                } transition-colors`}
              >
                <List className="h-5 w-5 sm:mr-1" />
                <span className="hidden sm:inline">一覧</span>
              </button>
            </nav>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
            <button
              onClick={signOut}
              className="p-2 text-gray-700 hover:text-red-600 transition-colors rounded-full hover:bg-gray-100"
              title="ログアウト"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main>
        {activeView === 'list' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ReceiptList />
          </div>
        ) : (
          <ReceiptScanner />
        )}
      </main>
    </div>
  );
}