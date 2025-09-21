import { NextRequest, NextResponse } from 'next/server';
// import { HttpTransport,ExchangeClient,InfoClient} from '@nktkas/hyperliquid';
import { privyClient ,provider} from '@/utils/privy-signature';
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
    const users = await privyClient.getUsers();
    // console.log(`Users: ${JSON.stringify(users, null, 2)}`);
    
    // Find the specific user by ID
    const user = users.find(u => u.id === walletId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }
    
    let wallet;
    let address: string;
    let actualWalletId: string;
    
    // Check linkedAccounts for embedded wallets
    const embeddedWalletAccount = user.linkedAccounts.find(account => 
      account.type === 'wallet' && 
      'connectorType' in account &&
      account.connectorType === 'embedded' &&
      account.id !== null
    ) as any; // Type assertion to handle the union type
    
    if (!embeddedWalletAccount) {
      console.log('User does not have an embedded wallet, creating one...');
      
      // Create a new Ethereum wallet for the user
      wallet = await privyClient.walletApi.createWallet({
        chainType: 'ethereum',
        owner: {
          userId: user.id
        }
      });
      
      address = wallet.address;
      actualWalletId = wallet.id;
      console.log(`Created new wallet: ${wallet.id} at address: ${address}`);
    } else {
      // User has an existing embedded wallet
      address = embeddedWalletAccount.address;
      actualWalletId = embeddedWalletAccount.id;
      
      console.log(`Found embedded wallet with ID: ${actualWalletId} at address: ${address}`);
      
      // Fetch the full wallet details using the wallet API
      // wallet = await privyClient.walletApi.getWallet({ id: actualWalletId });
      
      // console.log(`Retrieved wallet details:`, {
      //   id: wallet.id,
      //   address: wallet.address,
      //   chainType: wallet.chainType
      // });
    }

    // Create an ethers signer
    // const signer = createEthersSigner({
    //     walletId: actualWalletId,
    //     address,
    //     provider,
    //     privyClient: privyClient as any // Type assertion to resolve pnpm symlink type conflicts
    // });

    console.log(`Wallet address: ${address}`);

    // Initialize Hyperliquid clients
    // const transport = new HttpTransport({
    //   isTestnet:true,
    //   timeout:1000
    // });

    // const client = new ExchangeClient({
    //     transport,
    //     wallet: signer
    // });

    // const infoClient = new InfoClient({ transport })

    // Check Hyperliquid account
    // const preTransferCheck = await infoClient.preTransferCheck({
    //   user: address as `0x${string}`,
    //   source: address as `0x${string}`,
    // });

    // let hyperliquidAccount = true;
    // let fundingMessage = '';

    // if (!preTransferCheck.userExists) {
    //   // User needs to fund their account
    //   hyperliquidAccount = false;
    //   fundingMessage = 'Account needs funding. Please bridge USDC to Hyperliquid.';
      
      // Note: In a real implementation, you might trigger automated funding here
      // const fundTx = await signer.sendTransaction({
      //   to: 'hyperliquid-bridge-address',
      //   value: ethers.parseEther('10'),
      // });
      // await fundTx.wait();
    // }

    // Store session data (in production, use Redis or database)
    // For demo purposes, we'll just return the data
    
    return NextResponse.json({
      success: true,
      address,
      // hyperliquidAccount,
      // fundingMessage,
      message:'Wallet ready for trading' });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Onboarding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}