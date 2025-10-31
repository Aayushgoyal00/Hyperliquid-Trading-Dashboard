'use client';

import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { HttpTransport, ExchangeClient } from '@nktkas/hyperliquid';
import { getIsTestnet } from '@/utils/hyperliquid-config';
import { OnboardingData } from '@/types/trading';
import { parseErrorMessage } from '@/utils/error-parser';

interface SpotPerpsTransferProps {
  onboardingData: OnboardingData;
  onTransferSuccess: () => void;
}

export default function SpotPerpsTransfer({ onboardingData, onTransferSuccess }: SpotPerpsTransferProps) {
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [transferAmount, setTransferAmount] = useState('10');
  const [transferDirection, setTransferDirection] = useState<'spotToPerps' | 'perpsToSpot'>('spotToPerps');

  const spotBalance = parseFloat(onboardingData.embeddedWallet.hyperliquid.spotBalance || '0');
  const perpsBalance = parseFloat(onboardingData.embeddedWallet.hyperliquid.perpsBalance || '0');

  const handleTransfer = async () => {
    if (!transferAmount || !onboardingData?.embeddedWallet?.address) {
      alert('Please enter transfer amount');
      return;
    }
    
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount (must be greater than 0)');
      return;
    }

    // Check if user has sufficient balance
    const sourceBalance = transferDirection === 'spotToPerps' ? spotBalance : perpsBalance;
    if (sourceBalance < amount) {
      alert(`Insufficient balance. Available: $${sourceBalance.toFixed(2)}`);
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

      // Initialize Hyperliquid transport
      const IS_TESTNET = getIsTestnet();
      const transport = new HttpTransport({
        isTestnet: IS_TESTNET,
        timeout: 10000,
        fetchOptions: {
          keepalive: false
        }
      });

      const exchangeClient = new ExchangeClient({
        transport,
        wallet: signer as unknown as ethers.Wallet,
        isTestnet: IS_TESTNET
      });

      const toPerp = transferDirection === 'spotToPerps';
      const fromAccount = toPerp ? 'Spot' : 'Perps';
      const toAccount = toPerp ? 'Perps' : 'Spot';

      console.log(`🔄 Transferring $${amount} USDC from ${fromAccount} to ${toAccount} on ${IS_TESTNET ? 'TESTNET' : 'MAINNET'}...`);

      // Perform the account class transfer
      const transferResponse = await exchangeClient.usdClassTransfer({
        amount: amount.toString(),
        toPerp: toPerp
      });

      console.log('Transfer response:', transferResponse);

      if (transferResponse.status === 'ok') {
        alert(`✅ Transfer successful! Moved $${amount} USDC from ${fromAccount} to ${toAccount}`);
        setTimeout(() => {
          onTransferSuccess();
        }, 2000);
      } else {
        throw new Error(JSON.stringify(transferResponse.response) || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      const errorMessage = parseErrorMessage(error, 'Transfer failed. Please try again.');
      alert(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!onboardingData.embeddedWallet.hyperliquid.exists) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-cyan-50 border-2 border-cyan-400 rounded">
      <h2 className="text-xl font-semibold text-cyan-800 mb-3">🔄 Transfer Between Spot & Perps</h2>
      <div className="bg-white p-4 rounded text-amber-950">
        <p className="text-sm mb-3">
          Move funds between your Spot and Perps accounts for the embedded trading wallet
        </p>
        
        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-green-50 p-2 rounded">
            <p className="text-gray-600 font-medium">💵 Spot Balance</p>
            <p className="text-green-700 font-bold">${spotBalance.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-gray-600 font-medium">📊 Perps Balance</p>
            <p className="text-blue-700 font-bold">${perpsBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* Transfer Direction */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Transfer Direction</label>
          <select
            value={transferDirection}
            onChange={(e) => setTransferDirection(e.target.value as 'spotToPerps' | 'perpsToSpot')}
            className="w-full p-2 border rounded"
          >
            <option value="spotToPerps">💵 Spot → 📊 Perps</option>
            <option value="perpsToSpot">📊 Perps → 💵 Spot</option>
          </select>
          <p className="text-xs text-gray-600 mt-1">
            {transferDirection === 'spotToPerps' 
              ? 'Move funds from Spot to Perps account for margin trading'
              : 'Move funds from Perps to Spot account for spot trading'}
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Amount (USDC)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={transferDirection === 'spotToPerps' ? spotBalance : perpsBalance}
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="10.00"
          />
          <p className="text-xs text-gray-600 mt-1">
            Available: ${(transferDirection === 'spotToPerps' ? spotBalance : perpsBalance).toFixed(2)}
          </p>
        </div>

        {/* Transfer Button */}
        <button
          onClick={handleTransfer}
          disabled={loading || parseFloat(transferAmount) <= 0}
          className="w-full bg-cyan-500 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mb-2"
        >
          {loading ? 'Processing...' : `Transfer $${transferAmount} ${transferDirection === 'spotToPerps' ? 'to Perps' : 'to Spot'}`}
        </button>
        
        <p className="text-xs text-gray-500 mt-2">
          ⚠️ This will transfer USDC between your Spot and Perps accounts on Hyperliquid
        </p>
      </div>
    </div>
  );
}
