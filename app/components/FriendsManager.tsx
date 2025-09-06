"use client";

import { useState, useCallback } from "react";
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

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/friends?fid=${userFid}&search=${searchQuery}&limit=50`,
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
    (friend: FarcasterFriend) => {
      if (!managedFriends.some((f) => f.fid === friend.fid)) {
        setManagedFriends((prev) => [...prev, friend]);
      }
      setShowSearchResults(false);
      setSearchQuery("");
      setFriends([]);
    },
    [managedFriends],
  );

  const removeFriend = useCallback((fid: number) => {
    setManagedFriends((prev) => prev.filter((f) => f.fid !== fid));
  }, []);

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
            placeholder="Search for friends by username or display name..."
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
            Search
          </Button>
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg p-4">
            <h3 className="font-medium mb-3">Search Results</h3>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--app-accent)]"></div>
              </div>
            )}

            {!loading && friends.length === 0 && (
              <p className="text-center text-[var(--app-foreground-muted)] py-4">
                No friends found for &quot;{searchQuery}&quot;
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
              Search and add friends to make bill splitting easier
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
