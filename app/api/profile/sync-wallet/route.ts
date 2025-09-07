import { NextRequest, NextResponse } from "next/server";
import { getUserProfile, updateUserProfile, createUserProfile } from "../../../../lib/user-profiles";
import { getUserByFid } from "../../../../lib/neynar-client";

export async function POST(request: NextRequest) {
  try {
    const { fid, walletAddress } = await request.json();

    if (!fid || !walletAddress) {
      return NextResponse.json(
        { error: "FID and wallet address are required" },
        { status: 400 }
      );
    }

    // Validate wallet address format (basic Ethereum address check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Get or create user profile
    let userProfile = await getUserProfile(fid);

    if (!userProfile) {
      // Profile doesn't exist, try to create one from Neynar data
      const neynarUser = await getUserByFid(fid);
      if (neynarUser) {
        userProfile = await createUserProfile(neynarUser);
      }

      if (!userProfile) {
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }
    }

    // Update profile with wallet address
    const updatedProfile = await updateUserProfile(fid, {
      walletAddress: walletAddress.toLowerCase(), // Normalize to lowercase
    });

    if (!updatedProfile) {
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Error in sync-wallet API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
