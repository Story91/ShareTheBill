import { sendFrameNotification } from "./notification-client";
import { Bill, BillParticipant } from "./types";

export class BillNotifications {
  // Notify participants when a new bill is created
  static async notifyBillCreated(bill: Bill): Promise<void> {
    const notifications: Promise<void>[] = [];

    // Notify all participants (except creator)
    for (const participant of bill.participants) {
      if (participant.fid !== bill.creatorFid) {
        notifications.push(
          sendFrameNotification({
            fid: participant.fid,
            title: "New Bill to Split! 💸",
            body: `${bill.creatorUsername || "Someone"} wants to split "${bill.title}" (${participant.amountOwed} ${bill.currency})`,
          }).then(() => {}),
        );
      }
    }

    await Promise.allSettled(notifications);
  }

  // Notify when a payment is received
  static async notifyPaymentReceived(
    bill: Bill,
    paidParticipant: BillParticipant,
  ): Promise<void> {
    const notifications: Promise<void>[] = [];

    // Notify bill creator
    notifications.push(
      sendFrameNotification({
        fid: bill.creatorFid,
        title: "Payment Received! 💰",
        body: `${paidParticipant.displayName || `User ${paidParticipant.fid}`} paid ${paidParticipant.amountOwed} ${bill.currency} for "${bill.title}"`,
      }).then(() => {}),
    );

    // Notify other participants about the payment
    for (const participant of bill.participants) {
      if (
        participant.fid !== paidParticipant.fid &&
        participant.fid !== bill.creatorFid
      ) {
        notifications.push(
          sendFrameNotification({
            fid: participant.fid,
            title: "Someone Paid! ✅",
            body: `${paidParticipant.displayName || `Someone`} paid their share for "${bill.title}"`,
          }).then(() => {}),
        );
      }
    }

    await Promise.allSettled(notifications);
  }

  // Notify when all payments are completed
  static async notifyBillCompleted(bill: Bill): Promise<void> {
    const notifications: Promise<void>[] = [];

    // Notify all participants including creator
    const allParticipants = [
      bill.creatorFid,
      ...bill.participants.map((p) => p.fid),
    ];
    const uniqueParticipants = [...new Set(allParticipants)];

    for (const fid of uniqueParticipants) {
      notifications.push(
        sendFrameNotification({
          fid,
          title: "Bill Completed! 🎉",
          body: `All payments received for "${bill.title}". The bill is now settled!`,
        }).then(() => {}),
      );
    }

    await Promise.allSettled(notifications);
  }

  // Send payment reminders to pending participants
  static async sendPaymentReminders(bill: Bill): Promise<void> {
    const notifications: Promise<void>[] = [];

    const pendingParticipants = bill.participants.filter(
      (p) => p.status === "pending",
    );

    for (const participant of pendingParticipants) {
      notifications.push(
        sendFrameNotification({
          fid: participant.fid,
          title: "Payment Reminder 🔔",
          body: `Don't forget to pay ${participant.amountOwed} ${bill.currency} for "${bill.title}"`,
        }).then(() => {}),
      );
    }

    await Promise.allSettled(notifications);
  }

  // Notify when a bill is cancelled
  static async notifyBillCancelled(bill: Bill, reason?: string): Promise<void> {
    const notifications: Promise<void>[] = [];

    // Notify all participants
    for (const participant of bill.participants) {
      notifications.push(
        sendFrameNotification({
          fid: participant.fid,
          title: "Bill Cancelled ❌",
          body: `"${bill.title}" has been cancelled${reason ? `: ${reason}` : ""}`,
        }).then(() => {}),
      );
    }

    await Promise.allSettled(notifications);
  }

  // Notify when payment fails
  static async notifyPaymentFailed(
    bill: Bill,
    participantFid: number,
  ): Promise<void> {
    // Notify the participant who's payment failed
    await sendFrameNotification({
      fid: participantFid,
      title: "Payment Failed ❌",
      body: `Your payment for "${bill.title}" failed. Please try again.`,
    });

    // Notify bill creator about the failed payment
    const participant = bill.participants.find((p) => p.fid === participantFid);
    if (participant) {
      await sendFrameNotification({
        fid: bill.creatorFid,
        title: "Payment Failed 🚨",
        body: `Payment from ${participant.displayName || `User ${participantFid}`} failed for "${bill.title}"`,
      });
    }
  }

  // Send due date reminders
  static async sendDueDateReminders(bills: Bill[]): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const notifications: Promise<void>[] = [];

    for (const bill of bills) {
      if (!bill.dueDate || bill.status === "completed") continue;

      const dueDate = new Date(bill.dueDate);
      const timeDiff = dueDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      // Send reminder if due in 1 day or overdue
      if (daysDiff <= 1) {
        const pendingParticipants = bill.participants.filter(
          (p) => p.status === "pending",
        );

        for (const participant of pendingParticipants) {
          const message =
            daysDiff < 0
              ? `"${bill.title}" payment is overdue! Please pay ${participant.amountOwed} ${bill.currency} ASAP`
              : `"${bill.title}" payment is due tomorrow! Please pay ${participant.amountOwed} ${bill.currency}`;

          notifications.push(
            sendFrameNotification({
              fid: participant.fid,
              title:
                daysDiff < 0
                  ? "Payment Overdue! ⚠️"
                  : "Payment Due Tomorrow! ⏰",
              body: message,
            }).then(() => {}),
          );
        }
      }
    }

    await Promise.allSettled(notifications);
  }

  // Welcome notification for new users
  static async sendWelcomeNotification(fid: number): Promise<void> {
    await sendFrameNotification({
      fid,
      title: "Welcome to ShareTheBill! 👋",
      body: "Split receipts easily with friends using Farcaster & Base Pay. Create your first bill to get started!",
    });
  }
}

// Friend Notifications Class
export class FriendNotifications {
  // Notify when someone adds you as a friend
  static async notifyFriendAdded(
    requesterFid: number,
    addedFid: number,
    requesterName?: string
  ): Promise<void> {
    await sendFrameNotification({
      fid: addedFid,
      title: "New Friend Added! 👥",
      body: `${requesterName || `User ${requesterFid}`} added you as a friend in ShareTheBill!`,
    });
  }

  // Notify when someone removes you from friends
  static async notifyFriendRemoved(
    requesterFid: number,
    removedFid: number,
    requesterName?: string
  ): Promise<void> {
    await sendFrameNotification({
      fid: removedFid,
      title: "Friend Removed 😢",
      body: `${requesterName || `User ${requesterFid}`} removed you from their friends list.`,
    });
  }

  // Notify when you successfully add someone as a friend
  static async notifyFriendRequestAccepted(
    requesterFid: number,
    friendFid: number,
    friendName?: string
  ): Promise<void> {
    await sendFrameNotification({
      fid: requesterFid,
      title: "Friend Added Successfully! ✅",
      body: `You've successfully added ${friendName || `User ${friendFid}`} as a friend!`,
    });
  }

  // Achievement notifications
  static async sendAchievementNotification(
    fid: number,
    achievement: string,
    description: string,
  ): Promise<void> {
    await sendFrameNotification({
      fid,
      title: `Achievement Unlocked! 🏆 ${achievement}`,
      body: description,
    });
  }
}

// Helper function to determine if user should get achievement notifications
export function checkAchievements(userStats: {
  totalBills: number;
  totalPaid: number;
  completedBills: number;
}): Array<{ achievement: string; description: string }> {
  const achievements = [];

  if (userStats.totalBills === 1) {
    achievements.push({
      achievement: "First Bill",
      description: "You created your first bill! Welcome to ShareTheBill!",
    });
  }

  if (userStats.totalBills === 10) {
    achievements.push({
      achievement: "Bill Master",
      description: "You've created 10 bills! You're getting the hang of this!",
    });
  }

  if (userStats.completedBills === 5) {
    achievements.push({
      achievement: "Reliable Payer",
      description: "You've completed 5 bills. Your friends can count on you!",
    });
  }

  if (userStats.totalPaid >= 1000) {
    achievements.push({
      achievement: "Big Spender",
      description: "You've paid over 1000 zł in total. Time to budget? 😄",
    });
  }

  return achievements;
}
