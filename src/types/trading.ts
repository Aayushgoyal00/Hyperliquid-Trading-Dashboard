export interface Asset {
  name: string;
  szDecimals: number;
  markPx?: string;
  [key: string]: unknown;
}

export interface MarketData {
  success: boolean;
  assets: Asset[];
}

export interface OrderData {
  assetName: string;
  isBuy: boolean;
  size: string;
  price: string;
}

export interface OnboardingData {
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
