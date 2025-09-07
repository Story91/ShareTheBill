"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, Icon } from "./DemoComponents";
import { FarcasterFriend } from "@/lib/types";

interface FriendsManagerProps {
  userFid?: number;
}

export function FriendsManager({ userFid = 12345 }: FriendsManagerProps) {
  const [friends, setFriends] = useState<FarcasterFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [managedFriends, setManagedFriends] = useState<FarcasterFriend[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load existing friends from database on component mount
  const loadExistingFriends = useCallback(async () => {
    if (!userFid) return;

    try {
      const response = await fetch(`/api/friends?fid=${userFid}`);
      if (response.ok) {
        const data = await response.json();
        setManagedFriends(data.friends);
      }
    } catch (error) {
      console.error("Error loading existing friends:", error);
    }
  }, [userFid]);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/friends?fid=${userFid}&action=search&search=${searchQuery}`,
      );
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setLoading(false);
    }
  }, [userFid, searchQuery]);

  const addFriend = useCallback(
    async (friend: FarcasterFriend) => {
      if (!userFid) {
        console.error("User FID is undefined");
        return;
      }

      if (!managedFriends.some((f) => f.fid === friend.fid)) {
        try {
          // Save to database
          const response = await fetch("/api/friends", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "add",
              friendFid: friend.fid,
              requestorFid: userFid,
            }),
          });

          if (response.ok) {
            setManagedFriends((prev) => [...prev, friend]);
            console.log("Friend added successfully:", friend.displayName);
          } else {
            const errorText = await response.text();
            console.error(
              "Failed to add friend to database:",
              response.status,
              errorText,
            );
            // Fallback: add to local state even if API fails
            console.log("Adding friend to local state as fallback");
            setManagedFriends((prev) => [...prev, friend]);
          }
        } catch (error) {
          console.error("Error adding friend:", error);
          // Fallback: add to local state if network error
          console.log("Adding friend to local state due to network error");
          setManagedFriends((prev) => [...prev, friend]);
        }
      }
      setShowSearchResults(false);
      setSearchQuery("");
      setFriends([]);
    },
    [managedFriends, userFid],
  );

  const removeFriend = useCallback(
    async (fid: number) => {
      try {
        // Remove from database
        const response = await fetch("/api/friends", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "remove",
            friendFid: fid,
            requestorFid: userFid,
          }),
        });

        if (response.ok) {
          setManagedFriends((prev) => prev.filter((f) => f.fid !== fid));
        } else {
          console.error("Failed to remove friend from database");
        }
      } catch (error) {
        console.error("Error removing friend:", error);
      }
    },
    [userFid],
  );

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      loadFriends();
    }
  }, [searchQuery, loadFriends]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  // Load existing friends on component mount
  useEffect(() => {
    loadExistingFriends();
  }, [loadExistingFriends]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-[var(--app-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-white"
          >
            <path
              d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="9"
              cy="7"
              r="4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.6977C21.7033 16.0413 20.9999 15.5717 20.2 15.36"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--app-foreground)] mb-2">
          Friends
        </h1>
        <p className="text-[var(--app-foreground-muted)]">
          Manage your friends for easy bill splitting
        </p>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Enter exact username (e.g., @username or username)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
          />
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            icon={<Icon name="plus" size="sm" />}
          >
            Find User
          </Button>
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg p-4">
            <h3 className="font-medium mb-3">User Found</h3>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--app-accent)]"></div>
              </div>
            )}

            {!loading && friends.length === 0 && (
              <p className="text-center text-[var(--app-foreground-muted)] py-4">
                No user found with username &quot;{searchQuery}&quot;
              </p>
            )}

            {!loading && friends.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.map((friend, index) => {
                  const isAlreadyAdded = managedFriends.some(
                    (f) => f.fid === friend.fid,
                  );
                  return (
                    <div
                      key={`${friend.fid}-${friend.username}-${index}`}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
                    >
                      <img
                        src={friend.pfpUrl || "/placeholder-avatar.png"}
                        alt={friend.displayName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{friend.displayName}</p>
                        <p className="text-sm text-[var(--app-foreground-muted)]">
                          @{friend.username}
                        </p>
                      </div>
                      <Button
                        variant={isAlreadyAdded ? "outline" : "primary"}
                        size="sm"
                        onClick={() => addFriend(friend)}
                        disabled={isAlreadyAdded}
                        icon={
                          <Icon
                            name={isAlreadyAdded ? "check" : "plus"}
                            size="sm"
                          />
                        }
                      >
                        {isAlreadyAdded ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* My Friends Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--app-foreground)]">
            My Friends ({managedFriends.length})
          </h2>
        </div>

        {managedFriends.length === 0 ? (
          <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-[var(--app-gray)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon
                name="plus"
                size="lg"
                className="text-[var(--app-foreground-muted)]"
              />
            </div>
            <h3 className="font-medium text-[var(--app-foreground)] mb-2">
              No friends added yet
            </h3>
            <p className="text-[var(--app-foreground-muted)] text-sm mb-4">
              Find friends by their exact username to make bill splitting easier
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {managedFriends.map((friend, index) => (
              <div
                key={`${friend.fid}-${friend.username}-${index}`}
                className="flex items-center space-x-3 p-3 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
              >
                <img
                  src={friend.pfpUrl || "/placeholder-avatar.png"}
                  alt={friend.displayName}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-medium">{friend.displayName}</p>
                  <p className="text-sm text-[var(--app-foreground-muted)]">
                    @{friend.username}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {friend.isFollowing && friend.isFollowedBy && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Mutual
                      </span>
                    )}
                    {friend.isFollowing && !friend.isFollowedBy && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Following
                      </span>
                    )}
                    {!friend.isFollowing && friend.isFollowedBy && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        Follower
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFriend(friend.fid)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
