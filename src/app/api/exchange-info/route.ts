import { NextRequest, NextResponse } from 'next/server';
import { HttpTransport,InfoClient } from '@nktkas/hyperliquid';


export async function GET(request: NextRequest) {
  try {
    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: 'Missing walletId' },
        { status: 400 }
      );
    }

    // Initialize Hyperliquid clients
    const transport = new HttpTransport();
    const publicClient = new InfoClient({ transport });

    // Fetch meta and asset contexts
    const metaAndCtx = await publicClient.metaAndAssetCtxs();
    const meta = metaAndCtx[0]; // { universe: Asset[] }
    const ctx = metaAndCtx[1]; // Context[]

    // Find BTC asset
    const btcIndex = meta.universe.findIndex((asset) => asset.name === 'BTC');
    if (btcIndex === -1) {
      throw new Error('BTC not found in universe');
    }
    // Get user state if wallet exists
    let userState = null;
    try {
      userState = await publicClient.clearinghouseState({ user: walletId as `0x${string}` });
    } catch {
      console.log('User not found on Hyperliquid, that\'s okay for new users');
    }

    return NextResponse.json({
      success: true,
      assets: meta.universe.slice(0, 10), // Top 10 assets
      btc: {
        markPx: ctx[btcIndex].markPx,
      },
      userState: userState ? {
        marginSummary: userState.marginSummary,
        assetPositions: userState.assetPositions
      } : null
    });

  } catch (error) {
    console.error('Exchange info error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange info', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}