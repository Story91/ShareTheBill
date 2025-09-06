import { NextRequest, NextResponse } from "next/server";
import { BillStorage } from "@/lib/bill-storage";

// GET /api/bills/[id] - Get specific bill
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id;
    
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

    return NextResponse.json({ bill });

  } catch (error) {
    console.error("Error fetching bill:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 }
    );
  }
}

// PATCH /api/bills/[id] - Update bill
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id;
    const updates = await request.json();
    
    if (!billId) {
      return NextResponse.json(
        { error: "Bill ID is required" },
        { status: 400 }
      );
    }

    // Validate that bill exists
    const existingBill = await BillStorage.getBill(billId);
    if (!existingBill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    // Prevent updating certain fields
    const allowedUpdates = [
      'title', 'description', 'status', 'dueDate', 'tags'
    ];
    
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const success = await BillStorage.updateBill(billId, filteredUpdates);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to update bill" },
        { status: 500 }
      );
    }

    const updatedBill = await BillStorage.getBill(billId);
    
    return NextResponse.json({ 
      bill: updatedBill,
      message: "Bill updated successfully" 
    });

  } catch (error) {
    console.error("Error updating bill:", error);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id] - Delete bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id;
    const { searchParams } = new URL(request.url);
    const requestorFid = searchParams.get("fid");
    
    if (!billId) {
      return NextResponse.json(
        { error: "Bill ID is required" },
        { status: 400 }
      );
    }

    if (!requestorFid) {
      return NextResponse.json(
        { error: "Requestor FID is required" },
        { status: 400 }
      );
    }

    // Check if bill exists and user is the creator
    const bill = await BillStorage.getBill(billId);
    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    if (bill.creatorFid !== parseInt(requestorFid)) {
      return NextResponse.json(
        { error: "Only the bill creator can delete the bill" },
        { status: 403 }
      );
    }

    // Only allow deletion if no payments have been made
    const hasPayments = bill.participants.some(p => p.status === 'paid');
    if (hasPayments) {
      return NextResponse.json(
        { error: "Cannot delete bill with completed payments" },
        { status: 400 }
      );
    }

    const success = await BillStorage.deleteBill(billId);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete bill" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Bill deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting bill:", error);
    return NextResponse.json(
      { error: "Failed to delete bill" },
      { status: 500 }
    );
  }
}


