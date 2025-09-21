import { PrivyClient } from '@privy-io/server-auth';
import { type GetEthersSignerInputType } from '@privy-io/server-auth/ethers';
import { ethers } from 'ethers';
import { createEthersSigner } from '@privy-io/server-auth/ethers';

// Validate environment variables
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;
const authKey = process.env.PRIVY_WALLET_AUTH_KEY;
const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;

if (!appId || !appSecret || !rpcUrl) {
  throw new Error('Missing required environment variables (PRIVY_APP_ID, PRIVY_APP_SECRET, or BASE_RPC_URL)');
}

// Create PrivyClient instance
export const privyClient = new PrivyClient(appId, appSecret, {
  walletApi: {
    authorizationPrivateKey: authKey || undefined, // Optional
  },
});

// Create ethers provider
export const provider = new ethers.JsonRpcProvider(rpcUrl);

export const getSigner = async (walletId: string) => {
    try{
        const wallet = await privyClient.walletApi.getWallet({ id: walletId });
        const address = wallet.address;
        return createEthersSigner({
            walletId,
            address,
            provider,
            privyClient: privyClient as any // Type assertion to resolve pnpm symlink type conflicts
        });
    }catch(e){
        return null
    }
};