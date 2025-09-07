"use client";

import { useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

interface WalletProfileSyncProps {
  userFid?: number;
}

export function WalletProfileSync({ userFid }: WalletProfileSyncProps) {
  const { address, isConnected } = useAccount();

  const syncWalletToProfile = useCallback(async () => {
    if (!userFid || !address || !isConnected) {
      return;
    }

    try {
      // Update user profile with wallet address
      const response = await fetch("/api/profile/sync-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: userFid,
          walletAddress: address,
        }),
      });

      if (response.ok) {
        console.log("Wallet address synced to profile successfully");
      } else {
        console.error("Failed to sync wallet address to profile");
      }
    } catch (error) {
      console.error("Error syncing wallet to profile:", error);
    }
  }, [userFid, address, isConnected]);

  useEffect(() => {
    // Sync wallet when both userFid and wallet are available
    if (userFid && address && isConnected) {
      syncWalletToProfile();
    }
  }, [userFid, address, isConnected, syncWalletToProfile]);

  // This component doesn't render anything visible
  return null;
}

export function useWalletProfileSync(userFid?: number) {
  const { address, isConnected } = useAccount();

  const syncWallet = useCallback(async () => {
    if (!userFid || !address || !isConnected) {
      return { success: false, error: "Missing required data" };
    }

    try {
      const response = await fetch("/api/profile/sync-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: userFid,
          walletAddress: address,
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }, [userFid, address, isConnected]);

  return {
    syncWallet,
    canSync: Boolean(userFid && address && isConnected),
    walletAddress: address,
    isConnected,
  };
}
