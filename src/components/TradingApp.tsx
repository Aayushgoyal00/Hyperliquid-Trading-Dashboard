'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';
import { OnboardingData, MarketData as MarketDataType } from '@/types/trading';
import WalletInfo from './WalletInfo';
import WithdrawForm from './WithdrawForm';
import FundingStatus from './FundingStatus';
import MarketData from './MarketData';
import TradingForm from './TradingForm';
import SpotPerpsTransfer from './SpotPerpsTransfer';
import { hyperliquidService } from '@/services/hyperliquid';

export default function TradingApp() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [marketData, setMarketData] = useState<MarketDataType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMarketData = useCallback(async () => {
    try {
      const data = await hyperliquidService.getMarketData();
      setMarketData(data);
      console.log('Market data fetched:', data);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }, []);

  const handleOnboard = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First, call backend to create/get wallet addresses
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: user.id || null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Now fetch balances from frontend using Hyperliquid service
        const embeddedAddress = data.embeddedWallet.address;
        const externalAddress = data.externalWallet?.address;

        // Fetch embedded wallet balances
        let embeddedPerpsBalance = null;
        let embeddedSpotBalance = null;
        let needsEmbeddedHyperliquidFunding = false;

        try {
          embeddedPerpsBalance = await hyperliquidService.getPerpsBalance(embeddedAddress);
          embeddedSpotBalance = await hyperliquidService.getSpotBalance(embeddedAddress);
          
          const accountValue = parseFloat(embeddedPerpsBalance.marginSummary.accountValue);
          needsEmbeddedHyperliquidFunding = accountValue < 10;
          
          // console.log(`Embedded wallet Hyperliquid account value: $${accountValue}`);
        } catch (error) {
          console.log('Embedded wallet not found on Hyperliquid');
          needsEmbeddedHyperliquidFunding = true;
        }

        // Fetch external wallet balances if exists
        let externalPerpsBalance = null;
        let externalSpotBalance = null;

        if (externalAddress) {
          try {
            externalPerpsBalance = await hyperliquidService.getPerpsBalance(externalAddress);
            externalSpotBalance = await hyperliquidService.getSpotBalance(externalAddress);
            
            // const externalAccountValue = parseFloat(externalPerpsBalance.marginSummary.accountValue);
            // console.log(`External wallet Hyperliquid account value: $${externalAccountValue}`);
          } catch (error) {
            console.log('External wallet not found on Hyperliquid');
          }
        }

        // Calculate spot balances
        const spotBalance = embeddedSpotBalance?.balances.reduce((total: number, balance: any) => {
          return total + parseFloat(balance.total);
        }, 0) || 0;

        const externalSpotBalanceTotal = externalSpotBalance?.balances.reduce((total: number, balance: any) => {
          return total + parseFloat(balance.total);
        }, 0) || 0;

        // Determine if user can transfer from external wallet
        const canTransferFromExternal = externalPerpsBalance && 
                                        parseFloat(externalPerpsBalance.marginSummary.accountValue) >= 10;

        // Build enhanced onboarding data
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

  const handleWithdrawSuccess = useCallback(() => {
    setIsOnboarded(false);
  }, []);

  const handleTransferSuccess = useCallback(() => {
    setIsOnboarded(false); // Trigger re-onboarding to refresh balances
  }, []);

  const handleOrderSuccess = useCallback(() => {
    fetchMarketData();
  }, [fetchMarketData]);

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
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-blue-400 shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Hyperliquid Trading Dashboard</h1>
        
        <WalletInfo 
          onboardingData={onboardingData}
          isOnboarded={isOnboarded}
          onLogout={logout}
        />

        {isOnboarded && onboardingData?.canTrade && (
          <WithdrawForm 
            onboardingData={onboardingData}
            onWithdrawSuccess={handleWithdrawSuccess}
          />
        )}

        {/* Spot-Perps Transfer - Show if wallet is funded */}
        {isOnboarded && onboardingData?.canTrade && (
          <SpotPerpsTransfer 
            onboardingData={onboardingData}
            onTransferSuccess={handleTransferSuccess}
          />
        )}

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

        {isOnboarded && user?.wallet && onboardingData?.canTrade && marketData && (
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
