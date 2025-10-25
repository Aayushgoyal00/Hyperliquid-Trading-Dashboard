'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';
import { OnboardingData, MarketData as MarketDataType } from '@/types/trading';
import WalletInfo from './WalletInfo';
import WithdrawForm from './WithdrawForm';
import FundingStatus from './FundingStatus';
import MarketData from './MarketData';
import TradingForm from './TradingForm';

export default function TradingApp() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [marketData, setMarketData] = useState<MarketDataType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMarketData = useCallback(async () => {
    try {
      const response = await fetch('/api/exchange-info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMarketData(data);
        console.log('Market data fetched:', data);
      } else {
        console.error('API returned error:', data.error);
      }
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
        setIsOnboarded(true);
        setOnboardingData(data);
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

  const handleOrderSuccess = useCallback(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

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
    if (onboardingData?.canTrade && !marketData) {
      fetchMarketData();
    }
  }, [onboardingData?.canTrade, marketData, fetchMarketData]);

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

        {isOnboarded && user?.wallet && onboardingData?.canTrade && (
          <TradingForm 
            embeddedWalletAddress={onboardingData.embeddedWallet.address}
            onOrderSuccess={handleOrderSuccess}
          />
        )}
      </div>
    </div>
  );
}
