import { NextRequest, NextResponse } from 'next/server';
import { HttpTransport,ExchangeClient,InfoClient} from '@nktkas/hyperliquid';
import { privyClient ,provider,getSigner} from '@/utils/privy-signature';
import { createEthersSigner } from '@privy-io/server-auth/ethers';

export async function POST(request: NextRequest) {
  try {
    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: 'Missing walletId' },
        { status: 400 }
      );
    }
    
    console.log(`Onboarding user ${walletId}`);

    // Fetch wallet from Privy
    const wallet = await privyClient.walletApi.getWallet({ id: walletId });
    const address = wallet.address;

    // Create an ethers signer
    const signer = createEthersSigner({
        walletId,
        address,
        provider,
        privyClient: privyClient as any // Type assertion to resolve pnpm symlink type conflicts
    });

    console.log(`Wallet address: ${address}`);

    // Initialize Hyperliquid clients
    const transport = new HttpTransport();

    const client = new ExchangeClient({
        transport,
        wallet: signer
    });

    const infoClient = new InfoClient({ transport })

    // Check Hyperliquid account
    const preTransferCheck = await infoClient.preTransferCheck({
      user: address as `0x${string}`,
      source: address as `0x${string}`,
    });

    let hyperliquidAccount = true;
    let fundingMessage = '';

    if (!preTransferCheck.userExists) {
      // User needs to fund their account
      hyperliquidAccount = false;
      fundingMessage = 'Account needs funding. Please bridge USDC to Hyperliquid.';
      
      // Note: In a real implementation, you might trigger automated funding here
      // const fundTx = await signer.sendTransaction({
      //   to: 'hyperliquid-bridge-address',
      //   value: ethers.parseEther('10'),
      // });
      // await fundTx.wait();
    }

    // Store session data (in production, use Redis or database)
    // For demo purposes, we'll just return the data
    
    return NextResponse.json({
      success: true,
      address,
      hyperliquidAccount,
      fundingMessage,
      message: hyperliquidAccount ? 'Wallet ready for trading' : 'Wallet created, funding required'
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Onboarding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}