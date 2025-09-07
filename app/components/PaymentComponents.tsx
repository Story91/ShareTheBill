"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Button, Icon } from "./DemoComponents";
import { Bill, PaymentResult, BasePayPayment } from "@/lib/types";
// @ts-ignore - Base Pay SDK will be installed
import { pay, getPaymentStatus } from '@base-org/account';
// @ts-ignore - Base Pay UI will be installed
import { BasePayButton } from '@base-org/account-ui/react';

// PaymentFlow Component
interface PaymentFlowProps {
  bill: Bill;
  participantFid: number;
  onPaymentComplete: (result: PaymentResult) => void;
}

export function PaymentFlow({
  bill,
  participantFid,
  onPaymentComplete,
}: PaymentFlowProps) {
  const { address } = useAccount();
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null,
  );

  // Base Pay payment handler
  const handleBasePayment = useCallback(async () => {
    if (!bill.creatorWalletAddress) {
      alert("Error: Bill creator's wallet address not found");
      return;
    }

    const participant = bill.participants.find((p) => p.fid === participantFid);
    if (!participant) {
      alert("Error: Participant not found");
      return;
    }

    setPaymentStatus("processing");

    try {
      // Initiate Base Pay payment
      const payment: BasePayPayment = await pay({
        amount: participant.amountOwed.toString(),
        to: bill.creatorWalletAddress, // Payment goes to bill creator
        testnet: true, // Set to false for mainnet
      });

      console.log(`Payment initiated! Transaction ID: ${payment.id}`);

      // Poll for payment status
      const checkPaymentStatus = async () => {
        try {
          const status = await getPaymentStatus({ 
            id: payment.id,
            testnet: true // Must match testnet setting from pay()
          });

          if (status.status === 'completed') {
            // Record successful payment in backend
            const paymentResponse = await fetch(`/api/bills/${bill.id}/pay`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                participantFid,
                amount: participant.amountOwed,
                currency: bill.currency,
                transactionHash: payment.id, // Use Base Pay transaction ID
                recipientAddress: bill.creatorWalletAddress,
                basePaymentId: payment.id,
              }),
            });

            if (paymentResponse.ok) {
              const result: PaymentResult = {
                success: true,
                transactionHash: payment.id,
                timestamp: new Date().toISOString(),
              };

              setPaymentResult(result);
              setPaymentStatus("completed");
              onPaymentComplete(result);
            } else {
              throw new Error("Failed to record payment in backend");
            }
          } else if (status.status === 'failed') {
            throw new Error("Payment failed on Base");
          } else {
            // Still pending, check again after delay
            setTimeout(checkPaymentStatus, 2000);
          }
        } catch (statusError) {
          console.error("Error checking payment status:", statusError);
          // Retry after delay
          setTimeout(checkPaymentStatus, 3000);
        }
      };

      // Start polling
      checkPaymentStatus();

    } catch (error) {
      console.error("Base Pay payment failed:", error);
      const result: PaymentResult = {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
        timestamp: new Date().toISOString(),
      };

      setPaymentResult(result);
      setPaymentStatus("failed");
      onPaymentComplete(result);
    }
  }, [bill, participantFid, onPaymentComplete]);

  // All conditional logic after hooks
  const participant = bill.participants.find((p) => p.fid === participantFid);

  if (!participant) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500">Participant not found in this bill</p>
      </div>
    );
  }

  if (participant.status === "paid") {
    return (
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <Icon name="check" className="text-green-500 mx-auto mb-2" size="lg" />
        <p className="text-green-700 font-medium">Payment Completed!</p>
        <p className="text-green-600 text-sm">
          Paid {participant.amountOwed} {bill.currency} on{" "}
          {new Date(participant.paidAt!).toLocaleDateString()}
        </p>
        {participant.paymentHash && (
          <p className="text-green-600 text-xs mt-1">
            Transaction: {participant.paymentHash.slice(0, 10)}...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--app-card-bg)] p-4 rounded-lg">
        <h3 className="font-medium mb-2">Payment Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Bill:</span>
            <span className="font-medium">{bill.title}</span>
          </div>
          <div className="flex justify-between">
            <span>Your share:</span>
            <span className="font-medium">
              {participant.amountOwed} {bill.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Payment method:</span>
            <span className="font-medium">Base Pay ({bill.currency})</span>
          </div>
          <div className="flex justify-between">
            <span>Recipient:</span>
            <span className="font-medium text-xs">
              {bill.creatorWalletAddress ? 
                `${bill.creatorWalletAddress.slice(0, 6)}...${bill.creatorWalletAddress.slice(-4)}` :
                "Creator address not set"
              }
            </span>
          </div>
        </div>
      </div>

      {bill.creatorWalletAddress ? (
        <div className="text-center">
          <div 
            style={{
              width: '100%',
              opacity: paymentStatus === "processing" ? 0.6 : 1,
              pointerEvents: paymentStatus === "processing" ? 'none' : 'auto',
            }}
          >
            <BasePayButton
              colorScheme="light"
              onClick={handleBasePayment}
            />
          </div>
          {paymentStatus === "processing" && (
            <p className="text-sm text-[var(--app-foreground-muted)] mt-2">
              Processing payment... Please wait for confirmation.
            </p>
          )}
        </div>
      ) : (
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-yellow-700">
            Bill creator hasn't set their wallet address yet
          </p>
        </div>
      )}

      {paymentResult && paymentStatus === "failed" && (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-700 font-medium">Payment Failed</p>
          <p className="text-red-600 text-sm">{paymentResult.error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPaymentStatus("idle");
              setPaymentResult(null);
            }}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

// BillStatus Component
interface BillStatusProps {
  bill: Bill;
  currentUserFid: number;
}

export function BillStatus({ bill, currentUserFid }: BillStatusProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [billData, setBillData] = useState<Bill>(bill);

  const refreshBillStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/bills/${bill.id}`);
      if (response.ok) {
        const data = await response.json();
        setBillData(data.bill);
      }
    } catch (error) {
      console.error("Failed to refresh bill status:", error);
    } finally {
      setRefreshing(false);
    }
  }, [bill.id]);

  const totalPaid = billData.participants.reduce(
    (sum, p) => (p.status === "paid" ? sum + p.amountOwed : sum),
    0,
  );

  const totalPending = billData.totalAmount - totalPaid;
  const completionPercentage = (totalPaid / billData.totalAmount) * 100;

  const currentUserParticipant = billData.participants.find(
    (p) => p.fid === currentUserFid,
  );
  const isCreator = billData.creatorFid === currentUserFid;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{billData.title}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshBillStatus}
          disabled={refreshing}
          icon={<Icon name="arrow-right" size="sm" />}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {billData.description && (
        <p className="text-[var(--app-foreground-muted)]">
          {billData.description}
        </p>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Payment Progress</span>
          <span>{Math.round(completionPercentage)}%</span>
        </div>
        <div className="w-full bg-[var(--app-gray)] rounded-full h-2">
          <div
            className="bg-[var(--app-accent)] h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--app-card-bg)] p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">
            {totalPaid.toFixed(2)}
          </p>
          <p className="text-sm text-[var(--app-foreground-muted)]">Paid</p>
        </div>
        <div className="bg-[var(--app-card-bg)] p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-orange-600">
            {totalPending.toFixed(2)}
          </p>
          <p className="text-sm text-[var(--app-foreground-muted)]">Pending</p>
        </div>
      </div>

      {/* Current User Status */}
      {currentUserParticipant && (
        <div
          className={`p-4 rounded-lg border-2 ${
            currentUserParticipant.status === "paid"
              ? "border-green-200 bg-green-50"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Your Status</p>
              <p className="text-sm text-[var(--app-foreground-muted)]">
                {currentUserParticipant.amountOwed} {billData.currency}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {currentUserParticipant.status === "paid" ? (
                <>
                  <Icon name="check" className="text-green-600" />
                  <span className="text-green-600 font-medium">Paid</span>
                </>
              ) : (
                <>
                  <span className="text-orange-600 font-medium">Pending</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="space-y-3">
        <h3 className="font-medium">
          Participants ({billData.participants.length})
        </h3>
        {billData.participants.map((participant, index) => (
          <div
            key={`${participant.fid}-${participant.username || "unknown"}-${index}`}
            className="flex items-center space-x-3 p-3 bg-[var(--app-card-bg)] rounded-lg"
          >
            <img
              src={participant.pfpUrl || "/placeholder-avatar.png"}
              alt={participant.displayName || `User ${participant.fid}`}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <p className="font-medium">
                {participant.displayName || `User ${participant.fid}`}
                {participant.fid === currentUserFid && " (You)"}
                {participant.fid === billData.creatorFid && " (Creator)"}
              </p>
              <p className="text-sm text-[var(--app-foreground-muted)]">
                {participant.amountOwed} {billData.currency}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {participant.status === "paid" ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Icon name="check" size="sm" />
                  <span className="text-sm font-medium">Paid</span>
                </div>
              ) : (
                <span className="text-orange-600 text-sm font-medium">
                  Pending
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bill Actions */}
      {isCreator && billData.status !== "completed" && (
        <div className="pt-4 border-t border-[var(--app-card-border)]">
          <p className="text-sm text-[var(--app-foreground-muted)] mb-2">
            As the bill creator, you can send reminders to participants who
            haven&apos;t paid yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement reminder functionality
              alert("Reminder feature coming soon!");
            }}
          >
            Send Reminders
          </Button>
        </div>
      )}

      {/* Bill Metadata */}
      <div className="pt-4 border-t border-[var(--app-card-border)] text-sm text-[var(--app-foreground-muted)]">
        <p>Created: {new Date(billData.createdAt).toLocaleDateString()}</p>
        {billData.dueDate && (
          <p>Due: {new Date(billData.dueDate).toLocaleDateString()}</p>
        )}
        <p>Bill ID: {billData.id}</p>
      </div>
    </div>
  );
}
