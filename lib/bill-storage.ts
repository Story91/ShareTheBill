// Bill storage utilities using Redis
import { redis } from "./redis";
import { Bill, BillParticipant, BillSummary } from "./types";

const BILL_KEY_PREFIX = "sharethebill:bill:";
const USER_BILLS_KEY_PREFIX = "sharethebill:user_bills:";
const BILL_PARTICIPANTS_KEY_PREFIX = "sharethebill:bill_participants:";

export class BillStorage {
  private static getBillKey(billId: string): string {
    return `${BILL_KEY_PREFIX}${billId}`;
  }

  private static getUserBillsKey(fid: number): string {
    return `${USER_BILLS_KEY_PREFIX}${fid}`;
  }

  private static getBillParticipantsKey(billId: string): string {
    return `${BILL_PARTICIPANTS_KEY_PREFIX}${billId}`;
  }

  static async createBill(bill: Bill): Promise<boolean> {
    if (!redis) {
      console.warn("Redis not available, using mock storage");
      // For demo purposes, just return true
      // In production, you'd want to use a real database
      return true;
    }

    try {
      const billKey = this.getBillKey(bill.id);
      
      // Store the bill
      await redis.set(billKey, bill);
      
      // Add bill to creator's bill list
      await redis.sadd(this.getUserBillsKey(bill.creatorFid), bill.id);
      
      // Add bill to all participants' bill lists
      for (const participant of bill.participants) {
        await redis.sadd(this.getUserBillsKey(participant.fid), bill.id);
      }
      
      // Store participants mapping
      const participantFids = bill.participants.map(p => p.fid);
      await redis.sadd(this.getBillParticipantsKey(bill.id), ...participantFids);
      
      return true;
    } catch (error) {
      console.error("Error creating bill:", error);
      return false;
    }
  }

  static async getBill(billId: string): Promise<Bill | null> {
    if (!redis) {
      return null;
    }

    try {
      return await redis.get<Bill>(this.getBillKey(billId));
    } catch (error) {
      console.error("Error getting bill:", error);
      return null;
    }
  }

  static async updateBill(billId: string, updates: Partial<Bill>): Promise<boolean> {
    if (!redis) {
      return false;
    }

    try {
      const existingBill = await this.getBill(billId);
      if (!existingBill) {
        return false;
      }

      const updatedBill: Bill = {
        ...existingBill,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await redis.set(this.getBillKey(billId), updatedBill);
      return true;
    } catch (error) {
      console.error("Error updating bill:", error);
      return false;
    }
  }

  static async updateParticipantPayment(
    billId: string, 
    participantFid: number, 
    paymentData: { paidAt: string; paymentHash: string; status: 'paid' | 'failed' }
  ): Promise<boolean> {
    if (!redis) {
      return false;
    }

    try {
      const bill = await this.getBill(billId);
      if (!bill) {
        return false;
      }

      const participantIndex = bill.participants.findIndex(p => p.fid === participantFid);
      if (participantIndex === -1) {
        return false;
      }

      bill.participants[participantIndex] = {
        ...bill.participants[participantIndex],
        ...paymentData,
      };

      // Check if all participants have paid
      const allPaid = bill.participants.every(p => p.status === 'paid');
      if (allPaid) {
        bill.status = 'completed';
      }

      return await this.updateBill(billId, bill);
    } catch (error) {
      console.error("Error updating participant payment:", error);
      return false;
    }
  }

  static async getUserBills(fid: number): Promise<BillSummary[]> {
    if (!redis) {
      return [];
    }

    try {
      const billIds = await redis.smembers(this.getUserBillsKey(fid));
      const bills: BillSummary[] = [];

      for (const billId of billIds) {
        const bill = await this.getBill(billId);
        if (bill) {
          const participant = bill.participants.find(p => p.fid === fid);
          const yourShare = participant ? participant.amountOwed : 0;
          
          bills.push({
            id: bill.id,
            title: bill.title,
            totalAmount: bill.totalAmount,
            yourShare,
            status: bill.status,
            createdAt: bill.createdAt,
            participantCount: bill.participants.length,
            isCreator: bill.creatorFid === fid,
          });
        }
      }

      // Sort by creation date (newest first)
      return bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting user bills:", error);
      return [];
    }
  }

  static async deleteBill(billId: string): Promise<boolean> {
    if (!redis) {
      return false;
    }

    try {
      const bill = await this.getBill(billId);
      if (!bill) {
        return false;
      }

      // Remove from all participants' bill lists
      const allFids = [bill.creatorFid, ...bill.participants.map(p => p.fid)];
      for (const fid of allFids) {
        await redis.srem(this.getUserBillsKey(fid), billId);
      }

      // Delete bill data
      await redis.del(this.getBillKey(billId));
      await redis.del(this.getBillParticipantsKey(billId));

      return true;
    } catch (error) {
      console.error("Error deleting bill:", error);
      return false;
    }
  }

  static async getBillParticipants(billId: string): Promise<number[]> {
    if (!redis) {
      return [];
    }

    try {
      const members = await redis.smembers(this.getBillParticipantsKey(billId));
      return members.map(fid => parseInt(fid.toString()));
    } catch (error) {
      console.error("Error getting bill participants:", error);
      return [];
    }
  }
}

