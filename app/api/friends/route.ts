import { NextRequest, NextResponse } from "next/server";
import { FarcasterFriend } from "@/lib/types";

// Mock Farcaster friends data - In production, this would fetch from Farcaster API
const MOCK_FRIENDS: FarcasterFriend[] = [
  {
    fid: 12345,
    username: "alice.eth",
    displayName: "Alice Johnson",
    pfpUrl: "https://i.imgur.com/placeholder1.jpg",
    followerCount: 1250,
    followingCount: 890,
    isFollowing: true,
    isFollowedBy: true
  },
  {
    fid: 67890,
    username: "bob.base",
    displayName: "Bob Smith",
    pfpUrl: "https://i.imgur.com/placeholder2.jpg",
    followerCount: 756,
    followingCount: 432,
    isFollowing: true,
    isFollowedBy: false
  },
  {
    fid: 11111,
    username: "charlie.fc",
    displayName: "Charlie Brown",
    pfpUrl: "https://i.imgur.com/placeholder3.jpg",
    followerCount: 2100,
    followingCount: 1567,
    isFollowing: false,
    isFollowedBy: true
  },
  {
    fid: 22222,
    username: "diana.warpcast",
    displayName: "Diana Prince",
    pfpUrl: "https://i.imgur.com/placeholder4.jpg",
    followerCount: 3400,
    followingCount: 2100,
    isFollowing: true,
    isFollowedBy: true
  },
  {
    fid: 33333,
    username: "eve.crypto",
    displayName: "Eve Martinez",
    pfpUrl: "https://i.imgur.com/placeholder5.jpg",
    followerCount: 892,
    followingCount: 654,
    isFollowing: true,
    isFollowedBy: true
  }
];

// GET /api/friends - Get user's Farcaster friends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get("fid");
    const searchQuery = searchParams.get("search");
    const limitParam = searchParams.get("limit");
    
    if (!fidParam) {
      return NextResponse.json(
        { error: "FID parameter is required" },
        { status: 400 }
      );
    }

    const fid = parseInt(fidParam);
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: "Invalid FID parameter" },
        { status: 400 }
      );
    }

    // In production, this would make API calls to Farcaster to get real friends data
    // For now, we'll return mock data
    
    let friends = [...MOCK_FRIENDS];

    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      friends = friends.filter(friend => 
        friend.username.toLowerCase().includes(query) ||
        friend.displayName.toLowerCase().includes(query)
      );
    }

    // Apply limit if provided
    const limit = limitParam ? parseInt(limitParam) : undefined;
    if (limit && !isNaN(limit) && limit > 0) {
      friends = friends.slice(0, limit);
    }

    // Sort by mutual connection strength (both following each other first)
    friends.sort((a, b) => {
      const aMutual = a.isFollowing && a.isFollowedBy ? 1 : 0;
      const bMutual = b.isFollowing && b.isFollowedBy ? 1 : 0;
      
      if (aMutual !== bMutual) {
        return bMutual - aMutual; // Mutual connections first
      }
      
      // Then by follower count
      return (b.followerCount || 0) - (a.followerCount || 0);
    });

    return NextResponse.json({
      friends,
      count: friends.length,
      hasMore: false, // In production, implement pagination
      requestorFid: fid
    });

  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}

// POST /api/friends - Add friends to a bill (batch operation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fids, requestorFid } = body;

    if (!Array.isArray(fids) || fids.length === 0) {
      return NextResponse.json(
        { error: "FIDs array is required" },
        { status: 400 }
      );
    }

    if (!requestorFid) {
      return NextResponse.json(
        { error: "Requestor FID is required" },
        { status: 400 }
      );
    }

    // Get detailed info for the specified FIDs
    const selectedFriends = MOCK_FRIENDS.filter(friend => 
      fids.includes(friend.fid)
    );

    // In production, this would fetch real data from Farcaster API
    const friendsWithDetails = selectedFriends.map(friend => ({
      fid: friend.fid,
      username: friend.username,
      displayName: friend.displayName,
      pfpUrl: friend.pfpUrl,
      isFollowing: friend.isFollowing,
      isFollowedBy: friend.isFollowedBy
    }));

    return NextResponse.json({
      friends: friendsWithDetails,
      count: friendsWithDetails.length,
      requestorFid
    });

  } catch (error) {
    console.error("Error processing friends selection:", error);
    return NextResponse.json(
      { error: "Failed to process friends selection" },
      { status: 500 }
    );
  }
}



