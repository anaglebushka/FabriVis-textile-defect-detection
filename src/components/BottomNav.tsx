import React from 'react';
import { Camera, Sliders } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'inspect' | 'rules';
  onChangeTab: (tab: 'inspect' | 'rules') => void;
  rulesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  rulesCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#DCE3EB] shadow-xs select-none">
      <div className="max-w-md mx-auto grid grid-cols-2 h-[64px] px-4">
        {/* Inspect Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('inspect')}
          className={`min-h-[48px] flex flex-col items-center justify-center space-y-1 transition ${
            activeTab === 'inspect'
              ? 'text-[#2F6FED] font-semibold'
              : 'text-[#5B6B7F] hover:text-[#0F1B2D] font-medium'
          }`}
          aria-label="Inspect tab"
        >
          <Camera className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[13px] tracking-wide">Inspect</span>
        </button>

        {/* Rules Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('rules')}
          className={`min-h-[48px] flex flex-col items-center justify-center space-y-1 transition relative ${
            activeTab === 'rules'
              ? 'text-[#2F6FED] font-semibold'
              : 'text-[#5B6B7F] hover:text-[#0F1B2D] font-medium'
          }`}
          aria-label="Rules tab"
        >
          <div className="relative">
            <Sliders className="w-5 h-5 stroke-[2.2]" />
            {rulesCount > 0 && (
              <span className="absolute -top-1 -right-3 px-1.5 py-0.2 rounded-full bg-[#2F6FED] text-white font-bold text-[10px] leading-tight">
                {rulesCount}
              </span>
            )}
          </div>
          <span className="text-[13px] tracking-wide">Rules</span>
        </button>
      </div>
    </nav>
  );
};
