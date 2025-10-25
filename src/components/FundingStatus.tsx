'use client';

import { OnboardingData } from '@/types/trading';

interface FundingStatusProps {
  onboardingData: OnboardingData;
  loading: boolean;
  onRefreshBalance: () => void;
}

export default function FundingStatus({ onboardingData, loading, onRefreshBalance }: FundingStatusProps) {
  if (onboardingData.canTrade || onboardingData.funding.canTransferFromExternal) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded">
      <h2 className="text-xl font-semibold text-red-800 mb-3">⚠️ Funding Required</h2>
      
      {/* Hyperliquid Funding Status */}
      {onboardingData.funding.needsEmbeddedHyperliquidFunding && (
        <div className="mb-4 p-3 bg-white rounded text-amber-950">
          <h3 className="font-semibold text-red-700 mb-2">
            Bridge USDC to Hyperliquid
          </h3>
          <p className="text-sm mb-2">
            Account Value: ${onboardingData.embeddedWallet.hyperliquid.accountValue || '0'}
          </p>
          <p className="text-sm mb-3">Please bridge USDC to Hyperliquid to start trading</p>
          
          <div className="space-y-2">
            <a
              href="https://app.hyperliquid.xyz/bridge"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-center"
            >
              Bridge USDC to Hyperliquid
            </a>
            
            <div className="bg-yellow-100 p-2 rounded text-xs">
              <p className="font-semibold mb-1">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click "Bridge USDC to Hyperliquid" above</li>
                <li>Connect your wallet ({onboardingData.embeddedWallet.address.slice(0, 6)}...{onboardingData.embeddedWallet.address.slice(-4)})</li>
                <li>Bridge at least $10 USDC to start trading</li>
                <li>Wait for confirmation (usually 1-2 minutes)</li>
                <li>Click "Check Balance" below</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onRefreshBalance}
        disabled={loading}
        className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Checking...' : '🔄 Check Balance'}
      </button>
    </div>
  );
}
