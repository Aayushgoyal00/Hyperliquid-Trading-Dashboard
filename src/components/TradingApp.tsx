'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';

interface Asset {
  name: string;
  szDecimals: number;
  [key: string]: unknown;
}

interface MarketData {
  success: boolean;
  assets: Asset[];
  btc: {
    markPx: string;
  };
  userState: {
    marginSummary: any;
    assetPositions: any;
  } | null;
}

interface OrderData {
  assetName: string;
  isBuy: boolean;
  size: string;
  price: string;
}

interface OnboardingData {
  success: boolean;
  address: string;
  walletId: string;
  isNewWallet: boolean;
  balance: {
    eth: string;
    needsDeposit: boolean;
    message: string;
  };
  hyperliquid: {
    exists: boolean;
    accountValue: string;
    needsFunding: boolean;
    message: string;
  };
  canTrade: boolean;
  message: string;
}

export default function TradingApp() {
  const { ready, authenticated, user, login, createWallet, logout } = usePrivy();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderData>({
    assetName: 'BTC',
    isBuy: true,
    size: '0.001',
    price: '0'
  });

  const fetchMarketData = useCallback(async () => {
    try {
      if (!user || user.wallet?.address == undefined) return;
      
      const response = await fetch(`/api/exchange-info?walletAddress=${encodeURIComponent(user.wallet?.address)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMarketData(data);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }, [user?.wallet?.address]);

  // Auto-login effect
  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated]);

  // Reset state when user changes (logout/login with different account)
  useEffect(() => {
    if (!authenticated || !user) {
      // Clear all state when user logs out
      setIsOnboarded(false);
      setOnboardingData(null);
      setMarketData(null);
    }
  }, [authenticated, user?.id]); // Track user.id to detect user changes

  // Onboarding effect
  useEffect(() => {
    const handleOnboard = async () => {
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
        console.log('Onboarding response:', data);
        
        if (data.success) {
          setIsOnboarded(true);
          setOnboardingData(data);
          
          // Only fetch market data if wallet is ready to trade
          if (data.canTrade) {
            fetchMarketData();
          }
        }
      } catch (error) {
        console.error('Onboarding failed:', error);
      } finally {
        setLoading(false);
      }
    };

    if (authenticated && user && !isOnboarded) {
      handleOnboard();
    }
  }, [authenticated, user, isOnboarded, fetchMarketData]);

  const handleCreateWallet = async () => {
    try {
      await createWallet();
      setTimeout(() => {
        setIsOnboarded(false);
      }, 1000);
    } catch (error) {
      console.error('Wallet creation failed:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user?.wallet?.address) return;
    
    // Check if wallet can trade
    if (onboardingData && !onboardingData.canTrade) {
      alert('Please fund your wallet before trading!');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: user.wallet.address,
          ...orderForm
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Order placed successfully!');
        fetchMarketData();
      } else {
        alert('Order failed: ' + data.error);
      }
    } catch (error) {
      console.error('Order failed:', error);
      alert('Order failed: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalance = async () => {
    setIsOnboarded(false); // Trigger re-onboarding to check balance
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

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
        
        {/* User Info */}
        <div className="mb-6 p-4 bg-amber-50 rounded text-amber-900">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-semibold">Account Info</h2>
            <button 
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
            >
              Logout
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p><strong>Wallet:</strong> {user?.wallet?.address || 'No wallet'}</p>
              {user?.wallet?.address && (
                <button
                  onClick={() => copyToClipboard(user.wallet!.address)}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded text-xs"
                >
                  Copy
                </button>
              )}
            </div>
            
            <p><strong>Status:</strong> {isOnboarded ? 'Onboarded ✅' : 'Not onboarded'}</p>
            
            {!user?.wallet && (
              <button 
                onClick={handleCreateWallet}
                disabled={loading}
                className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Funding Status - Show if wallet needs funding */}
        {isOnboarded && onboardingData && !onboardingData.canTrade && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded">
            <h2 className="text-xl font-semibold text-red-800 mb-3">⚠️ Funding Required</h2>
            
            {/* ETH Balance Status */}
            {onboardingData.balance.needsDeposit && (
              <div className="mb-4 p-3 bg-white rounded text-amber-950">
                <h3 className="font-semibold text-red-700 mb-2">1. Deposit ETH for Gas Fees</h3>
                <p className="text-sm mb-2">Current Balance: {onboardingData.balance.eth} ETH</p>
                <p className="text-sm mb-3">{onboardingData.balance.message}</p>
                
                <div className="bg-gray-100 p-2 rounded mb-2">
                  <p className="text-xs font-mono break-all">{onboardingData.address}</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(onboardingData.address)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    Copy Address
                  </button>
                  <a
                    href={`https://basescan.org/address/${onboardingData.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    View on BaseScan
                  </a>
                </div>
              </div>
            )}

            {/* Hyperliquid Funding Status */}
            {onboardingData.hyperliquid.needsFunding && (
              <div className="mb-4 p-3 bg-white rounded text-amber-950">
                <h3 className="font-semibold text-red-700 mb-2">
                  {onboardingData.balance.needsDeposit ? '2. ' : ''}Bridge USDC to Hyperliquid
                </h3>
                <p className="text-sm mb-2">
                  Account Value: ${onboardingData.hyperliquid.accountValue}
                </p>
                <p className="text-sm mb-3">{onboardingData.hyperliquid.message}</p>
                
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
                      <li>Connect your wallet ({onboardingData.address.slice(0, 6)}...{onboardingData.address.slice(-4)})</li>
                      <li>Bridge at least $10 USDC to start trading</li>
                      <li>Wait for confirmation (usually 1-2 minutes)</li>
                      <li>Click "Check Balance" below</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleRefreshBalance}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Checking...' : '🔄 Check Balance'}
            </button>
          </div>
        )}

        {/* Market Data - Only show if funded */}
        {isOnboarded && onboardingData?.canTrade && marketData && (
          <div className="mb-6 p-4 bg-green-50 rounded text-green-900">
            <h2 className="text-xl font-semibold mb-3">✅ Market Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">BTC Price</h3>
                <p className="text-2xl font-bold">${marketData.btc.markPx}</p>
              </div>
              <div>
                <h3 className="font-medium">Available Assets</h3>
                <div className="max-h-32 overflow-y-auto">
                  {marketData.assets.map((asset, i) => (
                    <p key={i} className="text-sm">{asset.name}</p>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium">User Account</h3>
                {marketData.userState ? (
                  <div className="text-sm">
                    <p className="text-green-600">✓ Account exists on Hyperliquid</p>
                    {marketData.userState.marginSummary && (
                      <p>Account Value: ${marketData.userState.marginSummary.accountValue || 'N/A'}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-orange-600">⚠ No account found</p>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={fetchMarketData}
              className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
            >
              Refresh Data
            </button>
          </div>
        )}

        {/* Trading Form - Only show if funded */}
        {isOnboarded && user?.wallet && onboardingData?.canTrade && (
          <div className="p-4 bg-yellow-50 rounded text-amber-900">
            <h2 className="text-xl font-semibold mb-4">Place Order</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset</label>
                <select 
                  value={orderForm.assetName}
                  onChange={(e) => setOrderForm({...orderForm, assetName: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Side</label>
                <select 
                  value={orderForm.isBuy ? 'buy' : 'sell'}
                  onChange={(e) => setOrderForm({...orderForm, isBuy: e.target.value === 'buy'})}
                  className="w-full p-2 border rounded"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Size</label>
                <input 
                  type="number"
                  step="0.001"
                  value={orderForm.size}
                  onChange={(e) => setOrderForm({...orderForm, size: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Price (0 for market)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={orderForm.price}
                  onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="mt-4 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}