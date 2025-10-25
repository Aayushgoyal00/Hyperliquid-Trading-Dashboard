import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { getIsTestnet } from '@/utils/hyperliquid-config';

/**
 * Frontend service for interacting with Hyperliquid's public APIs
 * This handles all read-only operations that don't require authentication
 */
class HyperliquidService {
  private infoClient: InfoClient;

  constructor() {
    const transport = new HttpTransport({
      isTestnet: getIsTestnet(),
      timeout: 5000,
      fetchOptions: {
        keepalive: false
      }
    });
    this.infoClient = new InfoClient({ transport });
  }

  /**
   * Fetch public market data for top assets
   * @returns Array of assets with current prices
   */
  async getMarketData() {
    try {
      const [meta, ctx] = await this.infoClient.metaAndAssetCtxs();
      const topAssets = meta.universe.slice(0, 10);
      
      return {
        success: true,
        assets: topAssets.map((asset, index) => ({
          ...asset,
          markPx: ctx[index]?.markPx || '0'
        }))
      };
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      throw error;
    }
  }

  /**
   * Check wallet balance on Hyperliquid (Perps account)
   * @param address - Wallet address to check
   * @returns Clearinghouse state including balances and positions
   */
  async getPerpsBalance(address: string) {
    try {
      const state = await this.infoClient.clearinghouseState({ 
        user: address as `0x${string}` 
      });
      return state;
    } catch (error) {
      console.error('Failed to fetch perps balance:', error);
      throw error;
    }
  }

  /**
   * Check spot balance on Hyperliquid
   * @param address - Wallet address to check
   * @returns Spot clearinghouse state including token balances
   */
  async getSpotBalance(address: string) {
    try {
      const spotState = await this.infoClient.spotClearinghouseState({ 
        user: address as `0x${string}` 
      });
      return spotState;
    } catch (error) {
      console.error('Failed to fetch spot balance:', error);
      throw error;
    }
  }

  /**
   * Get both perps and spot balances for a wallet
   * @param address - Wallet address to check
   * @returns Combined balance information
   */
  async getWalletBalances(address: string) {
    try {
      const [perpsState, spotState] = await Promise.all([
        this.getPerpsBalance(address),
        this.getSpotBalance(address)
      ]);

      // Calculate spot balance (sum of all spot balances)
      const spotBalance = spotState.balances.reduce((total, balance) => {
        return total + parseFloat(balance.total);
      }, 0);

      return {
        exists: true,
        accountValue: perpsState.marginSummary.accountValue,
        totalRawUsd: perpsState.marginSummary.totalRawUsd,
        totalMarginUsed: perpsState.marginSummary.totalMarginUsed,
        totalNtlPos: perpsState.marginSummary.totalNtlPos,
        spotBalance: spotBalance.toString(),
        perpsBalance: perpsState.marginSummary.totalRawUsd,
        hasPositions: perpsState.assetPositions.length > 0
      };
    } catch (error) {
      console.error('Failed to fetch wallet balances:', error);
      return {
        exists: false
      };
    }
  }
}

// Export singleton instance
export const hyperliquidService = new HyperliquidService();
