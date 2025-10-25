import { NextRequest, NextResponse } from 'next/server';
import { HttpTransport,InfoClient } from '@nktkas/hyperliquid';
import { getIsTestnet } from '@/utils/hyperliquid-config';


export async function GET(request: NextRequest) {
  try {
    // Initialize Hyperliquid clients
    const transport = new HttpTransport({
      isTestnet: getIsTestnet(),
      timeout:5000,
      fetchOptions:{
        keepalive:false
      }
    });
    const publicClient = new InfoClient({ transport });

    // Fetch meta and asset contexts (public data only)
    const metaAndCtx = await publicClient.metaAndAssetCtxs();
    const meta = metaAndCtx[0]; // { universe: Asset[] }
    const ctx = metaAndCtx[1]; // Context[]

    // Get top 10 assets with their prices
    const topAssets = meta.universe.slice(0, 10);
    const assetsWithPrices = topAssets.map((asset, index) => ({
      ...asset,
      markPx: ctx[index]?.markPx || '0'
    }));

    return NextResponse.json({
      success: true,
      assets: assetsWithPrices
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