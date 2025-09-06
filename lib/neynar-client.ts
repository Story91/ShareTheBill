import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { NeynarUser } from "./types";

if (!process.env.NEYNAR_API_KEY) {
  console.warn("NEYNAR_API_KEY environment variable is not defined");
}

const neynarClient = process.env.NEYNAR_API_KEY
  ? new NeynarAPIClient(
      new Configuration({ apiKey: process.env.NEYNAR_API_KEY }),
    )
  : null;

export async function getUserByUsername(
  username: string,
): Promise<NeynarUser | null> {
  if (!neynarClient) {
    console.warn("Neynar client not initialized - API key missing");
    return null;
  }

  try {
    // Remove @ prefix if present
    const cleanUsername = username.startsWith("@")
      ? username.slice(1)
      : username;

    const response = await neynarClient.lookupUserByUsername({
      username: cleanUsername,
    });

    if (response.user) {
      const user = response.user;
      return {
        fid: user.fid,
        username: user.username || "",
        display_name: user.display_name || "",
        pfp_url: user.pfp_url,
        follower_count: user.follower_count,
        following_count: user.following_count,
        verified_addresses: user.verified_addresses,
      };
    }

    return null;
  } catch (error) {
    console.error(
      `Error fetching user by username ${username} with Neynar:`,
      error,
    );
    return null;
  }
}

export async function getUserByFid(fid: number): Promise<NeynarUser | null> {
  if (!neynarClient) {
    console.warn("Neynar client not initialized - API key missing");
    return null;
  }

  try {
    // Use fetchBulkUsers for single user by FID
    const response = await neynarClient.fetchBulkUsers({ fids: [fid] });

    if (response.users && response.users.length > 0) {
      const user = response.users[0];
      return {
        fid: user.fid,
        username: user.username || "",
        display_name: user.display_name || "",
        pfp_url: user.pfp_url,
        follower_count: user.follower_count,
        following_count: user.following_count,
        verified_addresses: user.verified_addresses,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching user ${fid} with Neynar:`, error);
    return null;
  }
}

export async function getUsersByFids(fids: number[]): Promise<NeynarUser[]> {
  if (!neynarClient) {
    console.warn("Neynar client not initialized - API key missing");
    return [];
  }

  try {
    const response = await neynarClient.fetchBulkUsers({ fids });

    return response.users.map((user: any) => ({
      fid: user.fid,
      username: user.username || "",
      display_name: user.display_name || "",
      pfp_url: user.pfp_url,
      follower_count: user.follower_count,
      following_count: user.following_count,
      verified_addresses: user.verified_addresses,
    }));
  } catch (error) {
    console.error("Error fetching users by FIDs with Neynar:", error);
    return [];
  }
}
