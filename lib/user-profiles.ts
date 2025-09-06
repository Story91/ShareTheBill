import { redis } from "./redis";
import { UserProfile, NeynarUser } from "./types";

const USER_PROFILE_PREFIX = "user_profile:";
const USER_FRIENDS_PREFIX = "user_friends:";

// In-memory fallback storage when Redis is not available
const inMemoryProfiles = new Map<number, UserProfile>();
const inMemoryFriends = new Map<number, Set<number>>();

export async function createUserProfile(
  neynarUser: NeynarUser,
): Promise<UserProfile | null> {
  if (!redis) {
    console.warn("Redis not available, using in-memory storage");
    // Use in-memory storage as fallback
    const now = new Date().toISOString();
    const userProfile: UserProfile = {
      fid: neynarUser.fid,
      username: neynarUser.username,
      displayName: neynarUser.display_name,
      pfpUrl: neynarUser.pfp_url,
      friends: [],
      createdAt: now,
      updatedAt: now,
    };
    inMemoryProfiles.set(neynarUser.fid, userProfile);
    return userProfile;
  }

  const now = new Date().toISOString();
  const userProfile: UserProfile = {
    fid: neynarUser.fid,
    username: neynarUser.username,
    displayName: neynarUser.display_name,
    pfpUrl: neynarUser.pfp_url,
    friends: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await redis.set(
      `${USER_PROFILE_PREFIX}${neynarUser.fid}`,
      JSON.stringify(userProfile),
    );
    return userProfile;
  } catch (error) {
    console.error("Error creating user profile:", error);
    return null;
  }
}

export async function getUserProfile(fid: number): Promise<UserProfile | null> {
  if (!redis) {
    console.warn("Redis not available, using in-memory storage");
    return inMemoryProfiles.get(fid) || null;
  }

  try {
    const profileData = await redis.get(`${USER_PROFILE_PREFIX}${fid}`);
    if (!profileData) {
      return null;
    }
    return JSON.parse(profileData as string) as UserProfile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function updateUserProfile(
  fid: number,
  updates: Partial<UserProfile>,
): Promise<UserProfile | null> {
  if (!redis) {
    console.warn("Redis not available, using in-memory storage");
    const existingProfile = inMemoryProfiles.get(fid);
    if (!existingProfile) {
      return null;
    }

    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    inMemoryProfiles.set(fid, updatedProfile);
    return updatedProfile;
  }

  try {
    const existingProfile = await getUserProfile(fid);
    if (!existingProfile) {
      return null;
    }

    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(
      `${USER_PROFILE_PREFIX}${fid}`,
      JSON.stringify(updatedProfile),
    );

    return updatedProfile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
}

export async function addFriend(
  userFid: number,
  friendFid: number,
): Promise<boolean> {
  if (!redis) {
    console.warn("Redis not available, using in-memory storage");

    // Get or create user profile
    let userProfile = inMemoryProfiles.get(userFid);
    if (!userProfile) {
      return false; // Profile should exist before adding friends
    }

    // Check if friend is already added
    if (userProfile.friends.includes(friendFid)) {
      return true; // Already friends
    }

    // Add friend to user's friends list
    const updatedFriends = [...userProfile.friends, friendFid];
    const updatedProfile = {
      ...userProfile,
      friends: updatedFriends,
      updatedAt: new Date().toISOString(),
    };

    inMemoryProfiles.set(userFid, updatedProfile);

    // Also store in friends set for quick lookups
    if (!inMemoryFriends.has(userFid)) {
      inMemoryFriends.set(userFid, new Set());
    }
    inMemoryFriends.get(userFid)!.add(friendFid);

    return true;
  }

  try {
    const userProfile = await getUserProfile(userFid);
    if (!userProfile) {
      return false;
    }

    // Check if friend is already added
    if (userProfile.friends.includes(friendFid)) {
      return true; // Already friends
    }

    // Add friend to user's friends list
    const updatedFriends = [...userProfile.friends, friendFid];
    await updateUserProfile(userFid, { friends: updatedFriends });

    // Also store in a separate friends set for quick lookups
    await redis.sadd(`${USER_FRIENDS_PREFIX}${userFid}`, friendFid.toString());

    return true;
  } catch (error) {
    console.error("Error adding friend:", error);
    return false;
  }
}

export async function removeFriend(
  userFid: number,
  friendFid: number,
): Promise<boolean> {
  if (!redis) {
    console.warn("Redis not available, using in-memory storage");

    let userProfile = inMemoryProfiles.get(userFid);
    if (!userProfile) {
      return false;
    }

    // Remove friend from user's friends list
    const updatedFriends = userProfile.friends.filter(
      (fid) => fid !== friendFid,
    );

    const updatedProfile = {
      ...userProfile,
      friends: updatedFriends,
      updatedAt: new Date().toISOString(),
    };

    inMemoryProfiles.set(userFid, updatedProfile);

    // Also remove from friends set
    if (inMemoryFriends.has(userFid)) {
      inMemoryFriends.get(userFid)!.delete(friendFid);
    }

    return true;
  }

  try {
    const userProfile = await getUserProfile(userFid);
    if (!userProfile) {
      return false;
    }

    // Remove friend from user's friends list
    const updatedFriends = userProfile.friends.filter(
      (fid) => fid !== friendFid,
    );
    await updateUserProfile(userFid, { friends: updatedFriends });

    // Also remove from the separate friends set
    await redis.srem(`${USER_FRIENDS_PREFIX}${userFid}`, friendFid.toString());

    return true;
  } catch (error) {
    console.error("Error removing friend:", error);
    return false;
  }
}

export async function getFriends(userFid: number): Promise<number[]> {
  if (!redis) {
    console.warn("Redis not available, using in-memory storage");
    const userProfile = inMemoryProfiles.get(userFid);
    return userProfile?.friends || [];
  }

  try {
    const userProfile = await getUserProfile(userFid);
    return userProfile?.friends || [];
  } catch (error) {
    console.error("Error fetching friends:", error);
    return [];
  }
}

export async function areFriends(
  userFid: number,
  friendFid: number,
): Promise<boolean> {
  if (!redis) {
    console.warn("Redis not available, using in-memory storage");
    const friendsSet = inMemoryFriends.get(userFid);
    return friendsSet ? friendsSet.has(friendFid) : false;
  }

  try {
    const isFriend = await redis.sismember(
      `${USER_FRIENDS_PREFIX}${userFid}`,
      friendFid.toString(),
    );
    return Boolean(isFriend);
  } catch (error) {
    console.error("Error checking friendship:", error);
    return false;
  }
}
