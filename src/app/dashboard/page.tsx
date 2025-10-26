'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingData, MarketData as MarketDataType } from '@/types/trading';
import WalletInfo from '@/components/WalletInfo';
import FundingStatus from '@/components/FundingStatus';
import MarketData from '@/components/MarketData';
import { hyperliquidService } from '@/services/hyperliquid';

export default function DashboardPage() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const router = useRouter();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [marketData, setMarketData] = useState<MarketDataType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMarketData = useCallback(async () => {
    try {
      const data = await hyperliquidService.getMarketData();
      setMarketData(data);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }, []);

  const handleOnboard = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: user.id || null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const embeddedAddress = data.embeddedWallet.address;
        const externalAddress = data.externalWallet?.address;

        let embeddedPerpsBalance = null;
        let embeddedSpotBalance = null;
        let needsEmbeddedHyperliquidFunding = false;

        try {
          embeddedPerpsBalance = await hyperliquidService.getPerpsBalance(embeddedAddress);
          embeddedSpotBalance = await hyperliquidService.getSpotBalance(embeddedAddress);
          
          const accountValue = parseFloat(embeddedPerpsBalance.marginSummary.accountValue);
          needsEmbeddedHyperliquidFunding = accountValue < 10;
        } catch (error) {
          console.log('Embedded wallet not found on Hyperliquid');
          needsEmbeddedHyperliquidFunding = true;
        }

        let externalPerpsBalance = null;
        let externalSpotBalance = null;

        if (externalAddress) {
          try {
            externalPerpsBalance = await hyperliquidService.getPerpsBalance(externalAddress);
            externalSpotBalance = await hyperliquidService.getSpotBalance(externalAddress);
          } catch (error) {
            console.log('External wallet not found on Hyperliquid');
          }
        }

        const spotBalance = embeddedSpotBalance?.balances.reduce((total: number, balance: any) => {
          return total + parseFloat(balance.total);
        }, 0) || 0;

        const externalSpotBalanceTotal = externalSpotBalance?.balances.reduce((total: number, balance: any) => {
          return total + parseFloat(balance.total);
        }, 0) || 0;

        const canTransferFromExternal = externalPerpsBalance && 
                                        parseFloat(externalPerpsBalance.marginSummary.accountValue) >= 10;

        const enhancedData: OnboardingData = {
          success: true,
          embeddedWallet: {
            address: embeddedAddress,
            walletId: data.embeddedWallet.walletId,
            isNew: data.embeddedWallet.isNew,
            hyperliquid: embeddedPerpsBalance ? {
              exists: true,
              accountValue: embeddedPerpsBalance.marginSummary.accountValue,
              totalRawUsd: embeddedPerpsBalance.marginSummary.totalRawUsd,
              totalMarginUsed: embeddedPerpsBalance.marginSummary.totalMarginUsed,
              totalNtlPos: embeddedPerpsBalance.marginSummary.totalNtlPos,
              spotBalance: spotBalance.toString(),
              perpsBalance: embeddedPerpsBalance.marginSummary.totalRawUsd,
              hasPositions: embeddedPerpsBalance.assetPositions.length > 0
            } : {
              exists: false
            }
          },
          externalWallet: externalAddress ? {
            address: externalAddress,
            hyperliquid: externalPerpsBalance ? {
              exists: true,
              accountValue: externalPerpsBalance.marginSummary.accountValue,
              totalRawUsd: externalPerpsBalance.marginSummary.totalRawUsd,
              totalMarginUsed: externalPerpsBalance.marginSummary.totalMarginUsed,
              totalNtlPos: externalPerpsBalance.marginSummary.totalNtlPos,
              spotBalance: externalSpotBalanceTotal.toString(),
              perpsBalance: externalPerpsBalance.marginSummary.totalRawUsd,
              hasPositions: externalPerpsBalance.assetPositions.length > 0
            } : {
              exists: false
            }
          } : null,
          funding: {
            needsEmbeddedHyperliquidFunding,
            canTransferFromExternal: !!canTransferFromExternal,
            message: canTransferFromExternal 
              ? `Your connected wallet has $${externalPerpsBalance?.marginSummary.accountValue} on Hyperliquid. Transfer some to your trading wallet.`
              : needsEmbeddedHyperliquidFunding
              ? 'Please fund your trading wallet to start trading'
              : 'Wallet is ready for trading'
          },
          canTrade: !needsEmbeddedHyperliquidFunding,
          message: !needsEmbeddedHyperliquidFunding
            ? 'Wallet ready for trading'
            : 'Please fund your wallet to continue'
        };

        setIsOnboarded(true);
        setOnboardingData(enhancedData);
      }
    } catch (error) {
      console.error('Onboarding failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefreshBalance = useCallback(() => {
    setIsOnboarded(false);
  }, []);

  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated]);

  useEffect(() => {
    if (!authenticated || !user) {
      setIsOnboarded(false);
      setOnboardingData(null);
      setMarketData(null);
    }
  }, [authenticated, user?.id]);

  useEffect(() => {
    if (authenticated && user && !isOnboarded) {
      handleOnboard();
    }
  }, [authenticated, user, isOnboarded, handleOnboard]);

  useEffect(() => {
    if (isOnboarded && !marketData) {
      fetchMarketData();
    }
  }, [isOnboarded, marketData, fetchMarketData]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Hyperliquid Trading App</h1>
          <p className="mb-4">Please authenticate to continue</p>
          <button 
            onClick={login}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="bg-blue-400 shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Hyperliquid Trading Dashboard</h1>
        
        {/* Alert for unfunded wallet */}
        {isOnboarded && !onboardingData?.canTrade && onboardingData?.funding.canTransferFromExternal && (
          <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-bold">Trading Wallet Needs Funding</h3>
                <p className="mt-1 text-sm">
                  {onboardingData?.funding.message}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  💡 Please transfer funds from your external wallet to your embedded trading wallet to start trading.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alert for wallet with no external funds */}
        {isOnboarded && !onboardingData?.canTrade && !onboardingData?.funding.canTransferFromExternal && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-bold">Wallet Not Funded</h3>
                <p className="mt-1 text-sm">
                  Your trading wallet needs at least $10 to start trading. Please deposit funds to your embedded wallet address.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {isOnboarded && onboardingData?.canTrade && (
          <div className="mt-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/trade')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              📈 Place Orders
            </button>
            <button
              onClick={() => router.push('/transfer')}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              🔄 Spot-Perps Transfer
            </button>
            <button
              onClick={() => router.push('/withdraw')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              💸 Withdraw
            </button>
          </div>
        )}

        <WalletInfo 
          onboardingData={onboardingData}
          isOnboarded={isOnboarded}
          onLogout={logout}
        />

        {isOnboarded && onboardingData && (
          <FundingStatus 
            onboardingData={onboardingData}
            loading={loading}
            onRefreshBalance={handleRefreshBalance}
          />
        )}

        {isOnboarded && marketData && (
          <MarketData 
            marketData={marketData}
            onRefresh={fetchMarketData}
          />
        )}

        
      </div>
    </div>
  );
}
