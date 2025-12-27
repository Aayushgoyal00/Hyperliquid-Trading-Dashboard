'use client';

import { MarketData as MarketDataType } from '@/types/trading';

interface MarketDataProps {
  marketData: MarketDataType | null;
  onRefresh: () => void;
}

export default function MarketData({ marketData, onRefresh }: MarketDataProps) {
  if (!marketData) return null;

  return (
    <div className="mb-6 p-4 bg-green-50 rounded text-green-900">
      <h2 className="text-xl font-semibold mb-3">Market Data - Top Assets</h2>
      
      {/* Asset Prices Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {marketData.assets.map((asset, i) => (
          <div key={i} className="bg-white p-3 rounded shadow-sm">
            <p className="text-xs font-semibold text-gray-600 mb-1">{asset.name}</p>
            <p className="text-lg font-bold text-green-700">
              ${asset.markPx ? parseFloat(asset.markPx).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) : 'N/A'}
            </p>
          </div>
        ))}
      </div>
      
      <button 
        onClick={onRefresh}
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
      >
        Refresh Market Data
      </button>
    </div>
  );
}
