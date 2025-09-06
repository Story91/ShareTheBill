import { NextRequest, NextResponse } from "next/server";
import { BillStorage } from "@/lib/bill-storage";
import { PaymentRequest, PaymentResult } from "@/lib/types";
import { BillNotifications } from "@/lib/bill-notifications";

// POST /api/bills/[id]/pay - Process payment for a bill
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id;
    const body = await request.json();
    
    const {
      participantFid,
      amount,
      currency = 'USDC',
      transactionHash,
      recipientAddress
    }: PaymentRequest & { transactionHash: string } = body;

    if (!billId || !participantFid || !amount || !transactionHash) {
      return NextResponse.json(
        { error: "Missing required fields: billId, participantFid, amount, transactionHash" },
        { status: 400 }
      );
    }

    // Get the bill
    const bill = await BillStorage.getBill(billId);
    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    // Find the participant
    const participant = bill.participants.find(p => p.fid === participantFid);
    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found in this bill" },
        { status: 404 }
      );
    }

    // Check if already paid
    if (participant.status === 'paid') {
      return NextResponse.json(
        { error: "Payment already completed for this participant" },
        { status: 400 }
      );
    }

    // Validate amount matches what's owed
    if (Math.abs(amount - participant.amountOwed) > 0.01) {
      return NextResponse.json(
        { 
          error: `Payment amount (${amount}) doesn't match amount owed (${participant.amountOwed})` 
        },
        { status: 400 }
      );
    }

    // In a real implementation, you would verify the transaction on-chain here
    // For now, we'll assume the transaction hash is valid
    const paymentResult: PaymentResult = {
      success: true,
      transactionHash,
      timestamp: new Date().toISOString()
    };

    // Update participant payment status
    const updateSuccess = await BillStorage.updateParticipantPayment(
      billId,
      participantFid,
      {
        paidAt: paymentResult.timestamp,
        paymentHash: transactionHash,
        status: 'paid'
      }
    );

    if (!updateSuccess) {
      return NextResponse.json(
        { error: "Failed to update payment status" },
        { status: 500 }
      );
    }

    // Get updated bill to check if all payments are complete
    const updatedBill = await BillStorage.getBill(billId);
    if (!updatedBill) {
      return NextResponse.json(
        { error: "Failed to retrieve updated bill" },
        { status: 500 }
      );
    }

    // Send notifications
    try {
      // Notify about payment received
      await BillNotifications.notifyPaymentReceived(bill, participant);

      // If bill is now completed, notify all participants
      if (updatedBill.status === 'completed') {
        await BillNotifications.notifyBillCompleted(updatedBill);
      }
    } catch (notificationError) {
      console.error("Failed to send notifications:", notificationError);
      // Don't fail the payment if notification fails
    }

    return NextResponse.json({
      success: true,
      paymentResult,
      bill: updatedBill,
      message: "Payment processed successfully"
    });

  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { 
        error: "Failed to process payment",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET /api/bills/[id]/pay - Get payment information for a bill
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id;
    const { searchParams } = new URL(request.url);
    const participantFid = searchParams.get("participantFid");
    
    if (!billId) {
      return NextResponse.json(
        { error: "Bill ID is required" },
        { status: 400 }
      );
    }

    const bill = await BillStorage.getBill(billId);
    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    if (participantFid) {
      // Return specific participant payment info
      const participant = bill.participants.find(p => p.fid === parseInt(participantFid));
      if (!participant) {
        return NextResponse.json(
          { error: "Participant not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        billId: bill.id,
        billTitle: bill.title,
        participantFid: participant.fid,
        amountOwed: participant.amountOwed,
        currency: bill.currency,
        status: participant.status,
        paidAt: participant.paidAt,
        paymentHash: participant.paymentHash,
        creatorFid: bill.creatorFid
      });
    }

    // Return overall payment status
    const totalPaid = bill.participants
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amountOwed, 0);

    const totalPending = bill.participants
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amountOwed, 0);

    return NextResponse.json({
      billId: bill.id,
      billTitle: bill.title,
      totalAmount: bill.totalAmount,
      totalPaid,
      totalPending,
      currency: bill.currency,
      status: bill.status,
      participantCount: bill.participants.length,
      paidCount: bill.participants.filter(p => p.status === 'paid').length,
      participants: bill.participants.map(p => ({
        fid: p.fid,
        displayName: p.displayName,
        amountOwed: p.amountOwed,
        status: p.status,
        paidAt: p.paidAt
      }))
    });

  } catch (error) {
    console.error("Error getting payment info:", error);
    return NextResponse.json(
      { error: "Failed to get payment information" },
      { status: 500 }
    );
  }
}
