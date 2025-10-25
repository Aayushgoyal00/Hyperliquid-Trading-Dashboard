'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { HttpTransport, ExchangeClient } from '@nktkas/hyperliquid';

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
  embeddedWallet: {
    address: string;
    walletId: string;
    isNew: boolean;
    hyperliquid: {
      exists: boolean;
      accountValue?: string;
      totalRawUsd?: string;
      hasPositions?: boolean;
    };
  };
  externalWallet: {
    address: string;
    hyperliquid: {
      exists: boolean;
      accountValue?: string;
      totalRawUsd?: string;
      hasPositions?: boolean;
    };
  } | null;
  funding: {
    needsEmbeddedHyperliquidFunding: boolean;
    canTransferFromExternal: boolean;
    message: string;
  };
  canTrade: boolean;
  message: string;
}

export default function TradingApp() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferAmount, setTransferAmount] = useState('10');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [orderForm, setOrderForm] = useState<OrderData>({
    assetName: 'BTC',
    isBuy: true,
    size: '0.001',
    price: '0'
  });

  const fetchMarketData = useCallback(async () => {
    try {
      if (!onboardingData?.embeddedWallet?.address) return;
      
      const response = await fetch(`/api/exchange-info?walletAddress=${encodeURIComponent(onboardingData.embeddedWallet.address)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMarketData(data);
        console.log('Market data fetched:', marketData);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }, [onboardingData?.embeddedWallet?.address]);

  // Auto-login effect
  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated]);

  // Reset state when user changes
  useEffect(() => {
    if (!authenticated || !user) {
      setIsOnboarded(false);
      setOnboardingData(null);
      setMarketData(null);
    }
  }, [authenticated, user?.id]);
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
        console.log('Starting onboarding for user:', user);
        const response = await fetch('/api/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletId: user.id || null
          }),
        });
        
        const data = await response.json();
        // console.log('Onboarding response:', data);
        
        if (data.success) {
          setIsOnboarded(true);
          setOnboardingData(data);
          console.log("Onboarding data set:", data);
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

  // Fetch market data when onboarding is complete and user can trade
  useEffect(() => {
    if (onboardingData?.canTrade && !marketData) {
      console.log('Fetching market data after onboarding...');
      fetchMarketData();
    }
  }, [onboardingData?.canTrade, marketData, fetchMarketData]);

  const handleWithdrawFromEmbedded = async () => {
    if (!recipientAddress || !transferAmount || !onboardingData?.embeddedWallet?.address) {
      alert('Please enter recipient address and amount');
      return;
    }
    
    // Validate recipient address format
    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      alert('Please enter a valid Ethereum address (0x...)');
      return;
    }
    
    // Parse and validate the transfer amount
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount < 10) {
      alert('Please enter a valid amount (minimum $10 USDC)');
      return;
    }

    // Check if embedded wallet has sufficient balance
    const embeddedBalance = parseFloat(onboardingData.embeddedWallet.hyperliquid.accountValue || '0');
    if (embeddedBalance < amount) {
      alert(`Insufficient balance. Available: $${embeddedBalance.toFixed(2)}`);
      return;
    }
    
    setLoading(true);
    try {
      // Find the embedded wallet from Privy wallets
      const embeddedWallet = wallets.find(
        wallet => wallet.walletClientType === 'privy' && 
                  wallet.address.toLowerCase() === onboardingData.embeddedWallet.address.toLowerCase()
      );

      if (!embeddedWallet) {
        throw new Error('Embedded wallet not found. Please refresh and try again.');
      }

      // Get the Ethereum provider from the embedded wallet
      const provider = await embeddedWallet.getEthereumProvider();
      if (!provider) {
        throw new Error('Failed to get wallet provider');
      }

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Verify the signer address
      const signerAddress = await signer.getAddress();
      console.log(`Using embedded wallet: ${signerAddress}`);

      // Initialize Hyperliquid transport for TESTNET
      // Important: is Testnet must be true for Hyperliquid testnet operations
      const transport = new HttpTransport({
        isTestnet: true, // <-- Critical: This sets hyperliquidChain to "Testnet"
        timeout: 10000,
        fetchOptions: {
          keepalive: false
        }
      });

      console.log('✅ Using Hyperliquid TESTNET transport');

      // Create exchange client with the signer
      // CRITICAL: Must explicitly pass isTestnet: true to ExchangeClient
      // This sets hyperliquidChain to "Testnet" in EIP712 signature message
      const exchangeClient = new ExchangeClient({
        transport,
        wallet: signer as any,
        isTestnet: true  // <-- CRITICAL FIX: ExchangeClient needs this explicitly!
      });

      console.log(`🔄 Transferring $${amount} USDC from ${signerAddress} to ${recipientAddress} on TESTNET...`);

      // Perform the transfer
      const transferResponse = await exchangeClient.usdSend({
        destination: recipientAddress as `0x${string}`,
        amount: amount.toString()
      });

      console.log('Transfer response:', transferResponse);

      if (transferResponse.status === 'ok') {
        alert(`✅ Transfer successful! Transferred $${amount} USDC\n\nTo: ${recipientAddress}`);
        // Clear recipient address and refresh onboarding data
        setRecipientAddress('');
        setTimeout(() => {
          setIsOnboarded(false);
        }, 2000);
      } else {
        throw new Error(JSON.stringify(transferResponse.response) || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('❌ Transfer failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!onboardingData?.embeddedWallet?.address) return;
    
    if (!onboardingData.canTrade) {
      alert('Please fund your wallet before trading!');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: onboardingData.embeddedWallet.address,
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
          
          {onboardingData && (
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
                  <p className="text-xs text-green-600">
                    ✓ Hyperliquid: ${onboardingData.embeddedWallet.hyperliquid.accountValue}
                  </p>
                )}
              </div>

              {/* External Wallet Info */}
              {onboardingData.externalWallet && (
                <div className="bg-white p-3 rounded">
                  <h3 className="font-semibold text-sm mb-2">💳 Connected Wallet (MetaMask/External)</h3>
                  <p className="text-xs font-mono truncate mb-1">
                    {onboardingData.externalWallet.address}
                  </p>
                  {onboardingData.externalWallet.hyperliquid.exists ? (
                    <p className="text-xs text-blue-600">
                      ✓ Hyperliquid Balance: ${onboardingData.externalWallet.hyperliquid.accountValue}
                    </p>
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
          )}
        </div>

        {/* Withdraw from Embedded Wallet - Show only if user can trade */}
        {isOnboarded && onboardingData?.canTrade && (
          <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-400 rounded">
            <h2 className="text-xl font-semibold text-purple-800 mb-3">� Withdraw from Trading Wallet</h2>
            <div className="bg-white p-4 rounded text-amber-950">
              <p className="text-sm mb-3">
                Your trading wallet balance:{' '}
                <strong className="text-green-600">
                  ${onboardingData.embeddedWallet.hyperliquid.accountValue}
                </strong>{' '}
                USDC
              </p>
              
              <div className="bg-purple-100 p-3 rounded mb-3 text-xs">
                <p className="font-semibold mb-2">Transfer funds to any wallet:</p>
                <p className="mb-1">From: {onboardingData.embeddedWallet.address.slice(0, 10)}...{onboardingData.embeddedWallet.address.slice(-8)} (Trading Wallet)</p>
                <p>To: Enter recipient address below</p>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Recipient Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full p-2 border rounded font-mono text-sm"
                  placeholder="0x..."
                />
                <p className="text-xs text-gray-600 mt-1">
                  Enter the destination wallet address (must start with 0x)
                </p>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Amount (USDC)</label>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  max="{onboardingData.embeddedWallet.hyperliquid.accountValue}"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="10.00"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Minimum: $10 USDC | Available: ${onboardingData.embeddedWallet.hyperliquid.accountValue}
                </p>
              </div>

              <button
                onClick={handleWithdrawFromEmbedded}
                disabled={loading || parseFloat(transferAmount) < 10 || !recipientAddress}
                className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mb-2"
              >
                {loading ? 'Processing...' : `Withdraw $${transferAmount} USDC`}
              </button>
              
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ This will transfer USDC from your trading wallet to the specified address on Hyperliquid network
              </p>
            </div>
          </div>
        )}

        {/* Funding Status - Show if wallet needs funding */}
        {/* Funding Status - Show if wallet needs funding and can't transfer */}
        {isOnboarded && onboardingData && !onboardingData.canTrade && !onboardingData.funding.canTransferFromExternal && (
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