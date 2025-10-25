import { NextRequest, NextResponse } from 'next/server';
import { provider,getSigner } from '@/utils/privy-signature';
import { HttpTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { getIsTestnet } from '@/utils/hyperliquid-config';


export async function POST(request: NextRequest) {
  try {
    const { walletId, assetName, isBuy, size, price} = await request.json();
    console.log('Received order request:', { walletId, assetName, isBuy, size, price });
    if (!walletId || !assetName || typeof isBuy !== 'boolean' || !size) {
      return NextResponse.json(
        { error: 'Missing required parameters: walletId, assetName, isBuy, size' },
        { status: 400 }
      );
    }

    // Initialize Hyperliquid clients
    const transport = new HttpTransport({
      isTestnet: getIsTestnet(),
      timeout:5000,
      fetchOptions:{
        keepalive:false
      }
    });
    const publicClient = new InfoClient({ transport });
    
    // Get the signer from Privy
    const signer = await getSigner(walletId);
    if (!signer) {
      return NextResponse.json(
        { error: 'Failed to get wallet signer' },
        { status: 400 }
      );
    }
    const walletAddress = await signer.getAddress();
    console.log(`Retrieved wallet address: ${walletAddress}`);
    const exchangeClient = new ExchangeClient({
        transport,
        wallet: signer// This should now be compatible with AbstractWallet
    });
    let userState = null;
    try {
      userState = await publicClient.preTransferCheck({ user: walletAddress as `0x${string}` ,source:walletAddress as `0x${string}`});
      if (!userState.userExists) {
  throw new Error("Hyperliquid account does not exist for this wallet.");
}
    } catch (e) {
      console.log(e);
    }
    // Get asset metadata to find the asset index
    const metaAndCtx = await publicClient.metaAndAssetCtxs();
    const meta = metaAndCtx[0];
    
    const assetIndex = meta.universe.findIndex((asset) => asset.name === assetName);
    if (assetIndex === -1) {
      return NextResponse.json(
        { error: `Asset ${assetName} not found` },
        { status: 400 }
      );
    }

    // Get wallet address for user state check
    // const walletAddress = await signer.getAddress();

    // For demo purposes, we'll simulate order placement since we don't have the actual wallet setup
    // In production, you would:
    // 1. Use the exchangeClient to place actual orders
    // 2. Handle order confirmation and status checking

    // Place a market order
    const orderResponse = await exchangeClient.order({
      orders: [
        {
          a: assetIndex, // Asset index
          b: isBuy, // Buy order
          s: size, // Size
          r: false, // Not reduce-only
          p: price || "0", // Price (0 for market order, or specified limit price)
          t: { limit: { tif: "Ioc" } }, // Immediate or Cancel for market-like behavior
        },
      ],
      grouping: "na", // No grouping
    });
    console.log("Order placed:", orderResponse);

    // If you want to add stop-loss or take-profit orders, you would need additional orders:
    // For stop-loss (if stopLoss parameter is provided):
    // {
    //   a: assetIndex,
    //   b: !isBuy, // Opposite direction
    //   s: size,
    //   r: true, // Reduce-only
    //   p: "0", // Market order
    //   t: { trigger: { isMarket: true, tpsl: "sl", triggerPx: stopLoss.toString() } }
    // }
    // For take-profit (if takeProfit parameter is provided):
    // {
    //   a: assetIndex,
    //   b: !isBuy, // Opposite direction
    //   s: size,
    //   r: true, // Reduce-only
    //   p: "0", // Market order
    //   t: { trigger: { isMarket: true, tpsl: "tp", triggerPx: takeProfit.toString() } }
    // }


    // Get updated user state
    userState = null;
    try {
      userState = await publicClient.clearinghouseState({ user: walletId as `0x${string}` });
    } catch {
      console.log('Could not fetch user state');
    }

    return NextResponse.json({
      success: true,
      message: `Order simulation: ${isBuy ? 'BUY' : 'SELL'} ${size} ${assetName}`,
      walletId,
      order: orderResponse,
      assetIndex,
      positions: userState?.assetPositions || [],
      note: 'This is a simulated order. In production, this would place a real order on Hyperliquid.'
    });

  } catch (error) {
    console.error('Order placement error:', error);
    return NextResponse.json(
      { 
        error: 'Order placement failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}