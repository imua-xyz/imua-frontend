export interface WalletConnector {
    isReady: boolean;
    isNativeWalletConnected: boolean;
    nativeWalletAddress: string;
    nativeCurrencyBalance: {
        value: bigint;
        decimals: number;
        symbol: string;
    };
    // For tokens requiring Imua connection
    isImuaConnected?: boolean;
    boundAddress?: string;

    issues?: {
      needsConnectToNative?: boolean;
      needsConnectToImua?: boolean;
      needsMatchingBoundAddress?: boolean;
      others?: string[];
    };
    
    // Actions
    checkNativeInstallation?: () => Promise<any>;
    connectNative?: () => Promise<any>;
    disconnectNative?: () => Promise<any>;
  }

export interface EVMWalletConnector extends WalletConnector {
    isReady: boolean;
    isNativeWalletConnected: boolean;
    nativeWalletAddress: string;
    nativeCurrencyBalance: {
        value: bigint;
        decimals: number;
        symbol: string;
    };
}

export interface XRPWalletConnector extends WalletConnector {
    isImuaConnected: boolean;
    boundAddress: string;

    checkNativeInstallation: () => Promise<boolean>;
    connectNative: () => Promise<any>;
    disconnectNative: () => Promise<any>;
}