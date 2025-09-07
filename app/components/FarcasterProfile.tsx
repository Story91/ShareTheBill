"use client";

import { useEffect, useState, useMemo } from "react";
import { NeynarUser, UserProfile } from "../../lib/types";
import { useWalletProfileSync } from "./WalletProfileSync";

interface FarcasterProfileProps {
  fid?: number;
  className?: string;
  showFullProfile?: boolean;
  showWalletStatus?: boolean;
  compact?: boolean;
}

export function FarcasterProfile({ 
  fid, 
  className = "", 
  showFullProfile = false,
  showWalletStatus = false,
  compact = false
}: FarcasterProfileProps) {
  const [user, setUser] = useState<NeynarUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { syncWallet, canSync, walletAddress: connectedWalletAddress, isConnected } = useWalletProfileSync(fid);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!fid) {
        setUser(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch both Neynar user data and user profile
        const [neynarResponse, profileResponse] = await Promise.all([
          fetch(`/api/farcaster/user?fid=${fid}`),
          fetch(`/api/profile?fid=${fid}`)
        ]);
        
        if (!neynarResponse.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData = await neynarResponse.json();
        setUser(userData);

        // Try to get user profile (may not exist)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserProfile(profileData);
        }
      } catch (err) {
        console.error('Error fetching Farcaster profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [fid]);

  const displayName = useMemo(() => {
    if (!user) return null;
    return user.display_name || user.username || `User ${user.fid}`;
  }, [user]);

  const farcasterWalletAddress = useMemo(() => {
    if (!user?.verified_addresses?.eth_addresses?.length) return null;
    const address = user.verified_addresses.eth_addresses[0];
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [user]);

  const walletStatus = useMemo(() => {
    const hasConnectedWallet = isConnected && connectedWalletAddress;
    const hasProfileWallet = !!userProfile?.walletAddress;
    const walletsMatch = hasConnectedWallet && hasProfileWallet && 
      userProfile?.walletAddress?.toLowerCase() === connectedWalletAddress?.toLowerCase();

    return {
      hasConnectedWallet,
      hasProfileWallet,
      walletsMatch,
      needsSync: hasConnectedWallet && !walletsMatch,
      connectedAddress: connectedWalletAddress,
      profileAddress: hasProfileWallet && userProfile?.walletAddress ? 
        `${userProfile.walletAddress.slice(0, 6)}...${userProfile.walletAddress.slice(-4)}` : 
        null
    };
  }, [isConnected, connectedWalletAddress, userProfile]);

  if (!fid) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Connect your Farcaster account
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        Failed to load profile
      </div>
    );
  }

  if (showFullProfile) {
    return (
      <div className={`bg-white rounded-lg p-4 border ${className}`}>
        <div className="flex items-start space-x-3">
          {user.pfp_url && (
            <img
              src={user.pfp_url}
              alt={displayName || "Profile picture"}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-sm text-gray-500">@{user.username}</p>
            <p className="text-xs text-gray-400">FID: {user.fid}</p>
            
            {farcasterWalletAddress && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">Farcaster Wallet: </span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {farcasterWalletAddress}
                </span>
              </div>
            )}
            
            <div className="flex space-x-4 mt-2 text-xs text-gray-500">
              {user.follower_count !== undefined && (
                <span>{user.follower_count} followers</span>
              )}
              {user.following_count !== undefined && (
                <span>{user.following_count} following</span>
              )}
            </div>

            {/* Wallet Status */}
            {showWalletStatus && (
              <div className="mt-3 p-2 bg-gray-50 rounded border">
                <div className="text-xs font-medium text-gray-700 mb-1">
                  Wallet Status
                </div>
                
                {walletStatus.hasProfileWallet ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-700">
                      Verified: {walletStatus.profileAddress}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-red-700">
                        No wallet address
                      </span>
                    </div>
                    
                    {canSync && (
                      <button
                        onClick={() => syncWallet()}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Connect Current Wallet
                      </button>
                    )}
                  </div>
                )}

                {walletStatus.needsSync && (
                  <div className="mt-1">
                    <button
                      onClick={() => syncWallet()}
                      className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                    >
                      Update Wallet Address
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact profile display with verified badge and followers
  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {user.pfp_url && (
          <img
            src={user.pfp_url}
            alt={displayName || "Profile picture"}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-1">
            <span className="text-base font-semibold text-gray-900 truncate">
              {displayName}
            </span>
            {/* Verified badge */}
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-600">@{user.username}</p>
          <div className="flex space-x-4 mt-1 text-sm text-gray-500">
            {user.follower_count !== undefined && (
              <span>{user.follower_count} followers</span>
            )}
            {user.following_count !== undefined && (
              <span>{user.following_count} following</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Regular compact profile display
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {user.pfp_url && (
        <img
          src={user.pfp_url}
          alt={displayName || "Profile picture"}
          className="w-8 h-8 rounded-full object-cover"
        />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900 truncate">
          {displayName}
        </span>
        <span className="text-xs text-gray-500">@{user.username}</span>
      </div>
    </div>
  );
}

export function FarcasterProfileCard({ fid, className }: { fid?: number; className?: string }) {
  return <FarcasterProfile fid={fid} showFullProfile={true} className={className} />;
}
