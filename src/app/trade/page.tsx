'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingData, MarketData as MarketDataType } from '@/types/trading';
import TradingForm from '@/components/TradingForm';
import MarketData from '@/components/MarketData';
import { hyperliquidService } from '@/services/hyperliquid';

export default function TradePage() {
  const { ready, authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [marketData, setMarketData] = useState<MarketDataType | null>(null);
  const [loading, setLoading] = useState(true);

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

        setOnboardingData(enhancedData);
        
        // Redirect to dashboard if wallet is not funded
        if (needsEmbeddedHyperliquidFunding) {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Onboarding failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  const handleOrderSuccess = useCallback(() => {
    // Refresh market data and page after order placement
    fetchMarketData();
    router.refresh();
  }, [fetchMarketData, router]);

  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

  useEffect(() => {
    if (authenticated && user) {
      handleOnboard();
      fetchMarketData();
    }
  }, [authenticated, user, handleOnboard, fetchMarketData]);

  if (!ready || loading) {
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
          <h1 className="text-2xl font-bold mb-4">Please login to continue</h1>
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

  if (!onboardingData?.canTrade) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Wallet Not Ready</p>
          <p>Please fund your wallet before trading.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="bg-blue-400 shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Place Orders</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Market Data */}
        {marketData && (
          <div className="mb-6">
            <MarketData 
              marketData={marketData}
              onRefresh={fetchMarketData}
            />
          </div>
        )}

        {/* Trading Form */}
        {marketData && onboardingData && (
          <TradingForm 
            onboardingData={onboardingData}
            marketData={marketData}
            onOrderSuccess={handleOrderSuccess}
          />
        )}
      </div>
    </div>
  );
}
