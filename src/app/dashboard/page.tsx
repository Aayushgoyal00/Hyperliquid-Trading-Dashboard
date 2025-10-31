'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OnboardingData, MarketData as MarketDataType } from '@/types/trading';
import WalletInfo from '@/components/WalletInfo';
import FundingStatus from '@/components/FundingStatus';
import MarketData from '@/components/MarketData';
import TradingForm from '@/components/TradingForm';
import SpotPerpsTransfer from '@/components/SpotPerpsTransfer';
import WithdrawForm from '@/components/WithdrawForm';
import { hyperliquidService } from '@/services/hyperliquid';

type TabType = 'home' | 'trade' | 'transfer' | 'withdraw';

export default function DashboardPage() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [marketData, setMarketData] = useState<MarketDataType | null>(null);
  const [loading, setLoading] = useState(false);

  // Update active tab based on URL
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['home', 'trade', 'transfer', 'withdraw'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('home');
    }
  }, [searchParams]);

  const fetchMarketData = useCallback(async () => {
    try {
      const data = await hyperliquidService.getMarketData();
      setMarketData(data);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }, []);

  const handleOnboard = useCallback(async () => {
    if (!user || !wallets) return;
    
    setLoading(true);
    try {
      // Find embedded wallet from Privy wallets
      const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
      
      // Find external wallet (MetaMask, Coinbase, etc.)
      const externalWallet = wallets.find(w => w.walletClientType !== 'privy');
      
      if (!embeddedWallet) {
        console.error('No embedded wallet found');
        setLoading(false);
        return;
      }

      const embeddedAddress = embeddedWallet.address;
      const externalAddress = externalWallet?.address;

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
            walletId: embeddedAddress,
            isNew: false,
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
    } catch (error) {
      console.error('Onboarding failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user, wallets]);

  const handleRefreshBalance = useCallback(() => {
    setIsOnboarded(false);
  }, []);

  const handleWithdrawSuccess = useCallback(() => {
    setIsOnboarded(false);
  }, []);

  const handleTransferSuccess = useCallback(() => {
    setIsOnboarded(false);
  }, []);

  const handleOrderSuccess = useCallback(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/dashboard?tab=${tab}`);
  };

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
    if (authenticated && user && !isOnboarded && wallets.length > 0) {
      handleOnboard();
    }
  }, [authenticated, user, isOnboarded, handleOnboard, wallets]);

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
        {/* Header with Title and Logout */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold ">Hyperliquid Trading Dashboard</h1>
          {authenticated && (
            <button 
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Logout
            </button>
          )}
        </div>
        
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

        {/* Navigation Tabs */}
        {isOnboarded && (
          <div className="mb-6 border-b border-gray-300">
            <nav className="flex space-x-4">
              <button
                onClick={() => handleTabChange('home')}
                className={`py-2 px-4 font-semibold transition-colors border-b-2 ${
                  activeTab === 'home'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-blue-600'
                }`}
              >
                🏠 Home
              </button>
              {onboardingData?.canTrade && (
                <>
                  <button
                    onClick={() => handleTabChange('trade')}
                    className={`py-2 px-4 font-semibold transition-colors border-b-2 ${
                      activeTab === 'trade'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    📈 Place Orders
                  </button>
                  <button
                    onClick={() => handleTabChange('transfer')}
                    className={`py-2 px-4 font-semibold transition-colors border-b-2 ${
                      activeTab === 'transfer'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    🔄 Spot-Perps Transfer
                  </button>
                  <button
                    onClick={() => handleTabChange('withdraw')}
                    className={`py-2 px-4 font-semibold transition-colors border-b-2 ${
                      activeTab === 'withdraw'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    💸 Withdraw
                  </button>
                </>
              )}
            </nav>
          </div>
        )}

        {/* Home Tab - Show Account Info, Funding Status and Market Data */}
        {activeTab === 'home' && (
          <>
            <WalletInfo 
              onboardingData={onboardingData}
              isOnboarded={isOnboarded}
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
          </>
        )}

        {/* Trade Tab - Show Market Data and Trading Form */}
        {activeTab === 'trade' && isOnboarded && onboardingData?.canTrade && (
          <>
            {marketData && (
              <MarketData 
                marketData={marketData}
                onRefresh={fetchMarketData}
              />
            )}
            
            {user?.wallet && marketData && (
              <TradingForm 
                onboardingData={onboardingData}
                marketData={marketData}
                onOrderSuccess={handleOrderSuccess}
              />
            )}
          </>
        )}

        {/* Transfer Tab - Show Spot-Perps Transfer */}
        {activeTab === 'transfer' && isOnboarded && onboardingData?.canTrade && (
          <SpotPerpsTransfer 
            onboardingData={onboardingData}
            onTransferSuccess={handleTransferSuccess}
          />
        )}

        {/* Withdraw Tab - Show Withdraw Form */}
        {activeTab === 'withdraw' && isOnboarded && onboardingData?.canTrade && (
          <WithdrawForm 
            onboardingData={onboardingData}
            onWithdrawSuccess={handleWithdrawSuccess}
          />
        )}
      </div>
    </div>
  );
}
