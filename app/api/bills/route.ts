import { NextRequest, NextResponse } from "next/server";
import { BillStorage } from "@/lib/bill-storage";
import { Bill, BillParticipant } from "@/lib/types";
import { BillNotifications } from "@/lib/bill-notifications";
import { getUserProfile } from "@/lib/user-profiles";
import { nanoid } from "nanoid";

// GET /api/bills - Get user's bills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get("fid");
    
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

    const bills = await BillStorage.getUserBills(fid);
    
    return NextResponse.json({
      bills,
      count: bills.length
    });

  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create new bill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      title,
      description,
      totalAmount,
      creatorFid,
      creatorUsername,
      participants,
      splitType = 'equal',
      currency = 'USDC',
      dueDate,
      receiptImage,
      tags
    } = body;

    // Validation
    if (!title || !totalAmount || !creatorFid || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: title, totalAmount, creatorFid, participants" },
        { status: 400 }
      );
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Total amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Calculate split amounts
    const processedParticipants: BillParticipant[] = participants.map((p: { fid: number; displayName: string; username?: string; pfpUrl?: string; amount?: number; percentage?: number }) => {
      let amountOwed = 0;
      
      if (splitType === 'equal') {
        amountOwed = totalAmount / participants.length;
      } else if (splitType === 'custom' && p.amount) {
        amountOwed = p.amount;
      } else if (splitType === 'percentage' && p.percentage) {
        amountOwed = (totalAmount * p.percentage) / 100;
      }

      return {
        fid: p.fid,
        username: p.username,
        displayName: p.displayName,
        pfpUrl: p.pfpUrl,
        amountOwed: Math.round(amountOwed * 100) / 100, // Round to 2 decimal places
        status: 'pending' as const
      };
    });

    // Validate total amounts match
    const totalSplit = processedParticipants.reduce((sum, p) => sum + p.amountOwed, 0);
    const difference = Math.abs(totalSplit - totalAmount);
    
    if (difference > 0.01) { // Allow for small rounding errors
      return NextResponse.json(
        { error: `Split amounts (${totalSplit}) don't match total amount (${totalAmount})` },
        { status: 400 }
      );
    }

    // Get creator's wallet address from profile
    const creatorProfile = await getUserProfile(creatorFid);
    const creatorWalletAddress = creatorProfile?.walletAddress;

    if (!creatorWalletAddress) {
      return NextResponse.json(
        { error: "Bill creator must have a verified wallet address. Please update your profile." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    
    const bill: Bill = {
      id: nanoid(),
      title,
      description,
      totalAmount,
      creatorFid,
      creatorUsername,
      creatorWalletAddress, // Add creator's wallet address for payments
      participants: processedParticipants,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      dueDate,
      receiptImage,
      currency,
      splitType,
      tags
    };

    console.log("Creating bill:", bill);
    
    const success = await BillStorage.createBill(bill);
    
    if (!success) {
      console.error("Failed to create bill in storage");
      return NextResponse.json(
        { error: "Failed to create bill in storage" },
        { status: 500 }
      );
    }

    // Send notifications to participants
    try {
      await BillNotifications.notifyBillCreated(bill);
    } catch (notificationError) {
      console.error("Failed to send bill creation notifications:", notificationError);
      // Don't fail the bill creation if notifications fail
    }

    return NextResponse.json(
      { 
        bill,
        message: "Bill created successfully" 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json(
      { 
        error: "Failed to create bill",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
