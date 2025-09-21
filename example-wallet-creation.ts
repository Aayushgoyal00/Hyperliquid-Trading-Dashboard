// Example: How to create a wallet using Privy's Wallet API
import { privyClient } from '@/utils/privy-signature';

// Example 1: Create a basic Ethereum wallet for a user
async function createBasicEthereumWallet(userId: string) {
  try {
    const newWallet = await privyClient.walletApi.createWallet({
      // BaseWalletCreateInput
      chainType: 'ethereum', // Required: 'ethereum' or 'solana'
      policyIds: [], // Optional: Policy IDs for wallet restrictions
      
      // OwnerInput - specify who owns this wallet
      owner: {
        userId: userId // The Privy user ID (like 'did:privy:cmftpnkie005zjo0dvvlpncnx')
      },
      
      // Optional: Idempotency key for safe retries
      idempotencyKey: `create-wallet-${userId}-${Date.now()}`
    });

    console.log('Created wallet:', {
      id: newWallet.id,
      address: newWallet.address,
      chainType: newWallet.chainType,
      ownerId: newWallet.ownerId
    });

    return newWallet;
  } catch (error) {
    console.error('Failed to create wallet:', error);
    throw error;
  }
}

// Example 2: Create a Solana wallet
async function createSolanaWallet(userId: string) {
  return await privyClient.walletApi.createWallet({
    chainType: 'solana',
    owner: {
      userId: userId
    },
    idempotencyKey: `create-solana-${userId}-${Date.now()}`
  });
}

// Example 3: Create wallet with additional signers (advanced use case)
async function createWalletWithAdditionalSigners(userId: string) {
  return await privyClient.walletApi.createWallet({
    chainType: 'ethereum',
    owner: {
      userId: userId
    },
    // Additional signers for multi-sig functionality
    additionalSigners: [
      {
        signerId: 'signer-key-id-1',
        overridePolicyIds: ['policy-id-1']
      }
    ],
    idempotencyKey: `create-multisig-${userId}-${Date.now()}`
  });
}

// Example 4: Create wallet with specific policies
async function createWalletWithPolicies(userId: string, policyIds: string[]) {
  return await privyClient.walletApi.createWallet({
    chainType: 'ethereum',
    policyIds: policyIds, // Apply specific policies to this wallet
    owner: {
      userId: userId
    },
    idempotencyKey: `create-policy-wallet-${userId}-${Date.now()}`
  });
}

// Example 5: Alternative owner specification using public key
async function createWalletWithPublicKeyOwner(publicKey: string) {
  return await privyClient.walletApi.createWallet({
    chainType: 'ethereum',
    owner: {
      publicKey: publicKey // Instead of userId, use public key
    },
    idempotencyKey: `create-pubkey-wallet-${Date.now()}`
  });
}

export {
  createBasicEthereumWallet,
  createSolanaWallet,
  createWalletWithAdditionalSigners,
  createWalletWithPolicies,
  createWalletWithPublicKeyOwner
};