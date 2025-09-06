import { NextRequest, NextResponse } from "next/server";
import { FarcasterFriend, UserProfile, NeynarUser } from "@/lib/types";
import { getUserByUsername, getUsersByFids } from "@/lib/neynar-client";
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  addFriend,
  removeFriend,
  getFriends,
} from "@/lib/user-profiles";

// Helper function to convert NeynarUser to FarcasterFriend
function neynarUserToFarcasterFriend(
  user: NeynarUser,
  isFriend: boolean = false,
): FarcasterFriend {
  return {
    fid: user.fid,
    username: user.username,
    displayName: user.display_name,
    pfpUrl: user.pfp_url || "",
    followerCount: user.follower_count,
    followingCount: user.following_count,
    isFollowing: isFriend,
    isFollowedBy: isFriend,
  };
}

// GET /api/friends - Search users or get user's friends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get("fid");
    const searchQuery = searchParams.get("search");
    const limitParam = searchParams.get("limit");
    const action = searchParams.get("action"); // "search" or "list"

    if (!fidParam) {
      return NextResponse.json(
        { error: "FID parameter is required" },
        { status: 400 },
      );
    }

    const fid = parseInt(fidParam);
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: "Invalid FID parameter" },
        { status: 400 },
      );
    }

    const limit = limitParam ? parseInt(limitParam) : 10;

    // Ensure user profile exists
    let userProfile = await getUserProfile(fid);
    if (!userProfile) {
      // Try to create profile from Neynar data if it doesn't exist
      const neynarUsers = await getUsersByFids([fid]);
      if (neynarUsers.length > 0) {
        userProfile = await createUserProfile(neynarUsers[0]);
      }
    }

    if (action === "search" && searchQuery) {
      // Look up user by exact username using Neynar
      const neynarUser = await getUserByUsername(searchQuery);

      // Convert to FarcasterFriend format
      const friends: FarcasterFriend[] = neynarUser
        ? [neynarUserToFarcasterFriend(neynarUser, false)]
        : [];

      return NextResponse.json({
        friends,
        count: friends.length,
        hasMore: false, // No pagination for single username lookup
        requestorFid: fid,
        searchQuery,
      });
    } else {
      // Get user's existing friends
      const friendFids = await getFriends(fid);

      if (friendFids.length === 0) {
        return NextResponse.json({
          friends: [],
          count: 0,
          hasMore: false,
          requestorFid: fid,
        });
      }

      // Fetch friend details from Neynar
      const neynarFriends = await getUsersByFids(friendFids);

      // Convert to FarcasterFriend format
      const friends: FarcasterFriend[] = neynarFriends.map((user) =>
        neynarUserToFarcasterFriend(user, true),
      );

      // Apply search filter if provided
      let filteredFriends = friends;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredFriends = friends.filter(
          (friend) =>
            friend.username.toLowerCase().includes(query) ||
            friend.displayName.toLowerCase().includes(query),
        );
      }

      // Apply limit
      if (limit > 0) {
        filteredFriends = filteredFriends.slice(0, limit);
      }

      return NextResponse.json({
        friends: filteredFriends,
        count: filteredFriends.length,
        hasMore: filteredFriends.length < friends.length,
        requestorFid: fid,
      });
    }
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 },
    );
  }
}

// POST /api/friends - Add or remove friends from user's profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, friendFid, requestorFid } = body;

    if (!requestorFid) {
      return NextResponse.json(
        { error: "Requestor FID is required" },
        { status: 400 },
      );
    }

    if (!friendFid) {
      return NextResponse.json(
        { error: "Friend FID is required" },
        { status: 400 },
      );
    }

    if (!action || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'add' or 'remove'" },
        { status: 400 },
      );
    }

    // Ensure user profile exists
    let userProfile = await getUserProfile(requestorFid);

    if (!userProfile) {
      const neynarUsers = await getUsersByFids([requestorFid]);

      if (neynarUsers.length > 0) {
        userProfile = await createUserProfile(neynarUsers[0]);
      } else {
        return NextResponse.json(
          { error: "User profile not found" },
          { status: 404 },
        );
      }
    }

    let success = false;
    if (action === "add") {
      success = await addFriend(requestorFid, friendFid);
    } else {
      success = await removeFriend(requestorFid, friendFid);
    }

    if (!success) {
      return NextResponse.json(
        { error: `Failed to ${action} friend` },
        { status: 500 },
      );
    }

    // Get updated friends list
    const updatedFriends = await getFriends(requestorFid);

    return NextResponse.json({
      success: true,
      action,
      friendFid,
      requestorFid,
      totalFriends: updatedFriends.length,
      message: `Friend ${action === "add" ? "added" : "removed"} successfully`,
    });
  } catch (error) {
    console.error("Error managing friend:", error);
    return NextResponse.json(
      { error: "Failed to manage friend" },
      { status: 500 },
    );
  }
}

// PUT /api/friends - Create or update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid } = body;

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    // Check if profile exists
    let userProfile = await getUserProfile(fid);

    if (!userProfile) {
      // Create new profile from Neynar data
      const neynarUsers = await getUsersByFids([fid]);
      if (neynarUsers.length === 0) {
        return NextResponse.json(
          { error: "User not found on Farcaster" },
          { status: 404 },
        );
      }

      userProfile = await createUserProfile(neynarUsers[0]);
      if (!userProfile) {
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        action: "created",
        userProfile,
        message: "User profile created successfully",
      });
    } else {
      // Update existing profile with latest Neynar data
      const neynarUsers = await getUsersByFids([fid]);
      if (neynarUsers.length > 0) {
        const neynarUser = neynarUsers[0];
        const updatedProfile = await updateUserProfile(fid, {
          username: neynarUser.username,
          displayName: neynarUser.display_name,
          pfpUrl: neynarUser.pfp_url,
        });

        return NextResponse.json({
          success: true,
          action: "updated",
          userProfile: updatedProfile,
          message: "User profile updated successfully",
        });
      }
    }

    return NextResponse.json({
      success: true,
      action: "no_change",
      userProfile,
      message: "User profile is up to date",
    });
  } catch (error) {
    console.error("Error managing user profile:", error);
    return NextResponse.json(
      { error: "Failed to manage user profile" },
      { status: 500 },
    );
  }
}
