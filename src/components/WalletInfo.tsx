'use client';

import { OnboardingData } from '@/types/trading';
import { copyToClipboard } from '@/utils/error-parser';

interface WalletInfoProps {
  onboardingData: OnboardingData | null;
  isOnboarded: boolean;
  onLogout: () => void;
}

export default function WalletInfo({ onboardingData, isOnboarded, onLogout }: WalletInfoProps) {
  if (!onboardingData) return null;

  return (
    <div className="mb-6 p-4 bg-amber-50 rounded text-amber-900">
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-semibold">Account Info</h2>
        <button 
          onClick={onLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
        >
          Logout
        </button>
      </div>
      
      <div className="space-y-3">
        {/* Embedded Trading Wallet */}
        <div className="bg-white p-3 rounded">
          <h3 className="font-semibold text-sm mb-2">🔐 Trading Wallet (Privy Embedded)</h3>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-mono truncate flex-1">
              {onboardingData.embeddedWallet.address}
            </p>
            <button
              onClick={() => copyToClipboard(onboardingData.embeddedWallet.address)}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded text-xs ml-2"
            >
              Copy
            </button>
          </div>
          {onboardingData.embeddedWallet.hyperliquid.exists && (
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-gray-600 font-medium">💵 Spot Balance</p>
                  <p className="text-green-700 font-bold">
                    ${parseFloat(onboardingData.embeddedWallet.hyperliquid.spotBalance || '0').toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-gray-600 font-medium">📊 Perps Balance</p>
                  <p className="text-blue-700 font-bold">
                    ${parseFloat(onboardingData.embeddedWallet.hyperliquid.perpsBalance || '0').toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="bg-purple-50 p-2 rounded text-xs">
                <p className="text-gray-600 font-medium">💰 Total Account Value</p>
                <p className="text-purple-700 font-bold text-sm">
                  ${parseFloat(onboardingData.embeddedWallet.hyperliquid.accountValue || '0').toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Margin Used: ${parseFloat(onboardingData.embeddedWallet.hyperliquid.totalMarginUsed || '0').toFixed(2)} | 
                  Position Value: ${parseFloat(onboardingData.embeddedWallet.hyperliquid.totalNtlPos || '0').toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* External Wallet Info */}
        {onboardingData.externalWallet && (
          <div className="bg-white p-3 rounded">
            <h3 className="font-semibold text-sm mb-2">💳 Connected Wallet (External)</h3>
            <p className="text-xs font-mono truncate mb-1">
              {onboardingData.externalWallet.address}
            </p>
            {onboardingData.externalWallet.hyperliquid.exists ? (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-gray-600 font-medium">💵 Spot Balance</p>
                    <p className="text-green-700 font-bold">
                      ${parseFloat(onboardingData.externalWallet.hyperliquid.spotBalance || '0').toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-gray-600 font-medium">📊 Perps Balance</p>
                    <p className="text-blue-700 font-bold">
                      ${parseFloat(onboardingData.externalWallet.hyperliquid.perpsBalance || '0').toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="bg-purple-50 p-2 rounded text-xs">
                  <p className="text-gray-600 font-medium">💰 Total Account Value</p>
                  <p className="text-purple-700 font-bold text-sm">
                    ${parseFloat(onboardingData.externalWallet.hyperliquid.accountValue || '0').toFixed(2)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Margin Used: ${parseFloat(onboardingData.externalWallet.hyperliquid.totalMarginUsed || '0').toFixed(2)} | 
                    Position Value: ${parseFloat(onboardingData.externalWallet.hyperliquid.totalNtlPos || '0').toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                No Hyperliquid account found
              </p>
            )}
          </div>
        )}
        
        <p className="text-sm">
          <strong>Status:</strong> {isOnboarded ? 'Onboarded ✅' : 'Not onboarded'}
        </p>
      </div>
    </div>
  );
}
