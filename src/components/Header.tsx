import React from 'react';

interface HeaderProps {
  onOpenRules?: () => void;
  rulesCount?: number;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="sticky top-0 z-40 bg-[#0F2A44] text-white px-4 h-[56px] flex items-center justify-between border-b border-[#0F2A44]">
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-white tracking-tight">
          FabriVis
        </h1>
      </div>
    </header>
  );
};
