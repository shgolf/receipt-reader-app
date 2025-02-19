import React from 'react';
import { Receipt } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <Receipt className="h-8 w-8 text-[#77CDE9]" />
      <span className="text-xl font-bold bg-gradient-to-r from-[#77CDE9] to-[#5bb8d6] text-transparent bg-clip-text hidden sm:inline">
        Receipt Scanner
      </span>
    </div>
  );
}