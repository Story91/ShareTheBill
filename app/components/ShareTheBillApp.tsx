"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Icon } from "./DemoComponents";
import { BillUploader, BillSplitter } from "./BillComponents";
import { PaymentFlow, BillStatus } from "./PaymentComponents";
import { BillHistory, BillStats } from "./BillHistory";
import {
  UploadedReceipt,
  FarcasterFriend,
  SplitConfiguration,
  Bill,
  BillParticipant,
  PaymentResult,
} from "@/lib/types";

type AppView = "home" | "create" | "history" | "bill" | "payment";

interface ShareTheBillAppProps {
  userFid?: number;
}

export function ShareTheBillApp({ userFid = 12345 }: ShareTheBillAppProps) {
  const [currentView, setCurrentView] = useState<AppView>("create"); // Start with create view
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Create Bill State
  const [uploadedReceipt, setUploadedReceipt] =
    useState<UploadedReceipt | null>(null);
  const [billTitle, setBillTitle] = useState("");
  const [billDescription, setBillDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedFriends, setSelectedFriends] = useState<FarcasterFriend[]>([]);
  const [splitConfig, setSplitConfig] = useState<SplitConfiguration>({
    type: "equal",
    participants: [],
  });
  const [isCreating, setIsCreating] = useState(false);

  // Reset create bill state
  const resetCreateBillState = useCallback(() => {
    setUploadedReceipt(null);
    setBillTitle("");
    setBillDescription("");
    setTotalAmount(0);
    setSelectedFriends([]);
    setSplitConfig({ type: "equal", participants: [] });
  }, []);

  // Handle receipt upload
  const handleReceiptUploaded = useCallback(
    (receipt: UploadedReceipt) => {
      setUploadedReceipt(receipt);

      // Auto-fill amount if OCR detected it
      if (receipt.ocrResult?.suggestedAmount && !totalAmount) {
        setTotalAmount(receipt.ocrResult.suggestedAmount);
      }
    },
    [totalAmount],
  );

  // Handle amount change
  const handleAmountChange = useCallback((amount: number) => {
    setTotalAmount(amount);

    // Reset split config - BillSplitter will handle the rest
    setSplitConfig({ type: "equal", participants: [] });
  }, []);

  // Create bill
  const createBill = useCallback(async () => {
    if (!billTitle || totalAmount <= 0 || selectedFriends.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    setIsCreating(true);

    try {
      // Use participants from BillSplitter (includes creator)
      const allParticipants = [
        {
          fid: userFid,
          username: "you",
          displayName: "You",
          pfpUrl: "",
          isFollowing: false,
          isFollowedBy: false,
        },
        ...selectedFriends,
      ];

      const participants: BillParticipant[] = allParticipants.map(
        (participant) => {
          const config = splitConfig.participants.find(
            (p) => p.fid === participant.fid,
          );
          return {
            fid: participant.fid,
            username: participant.username,
            displayName: participant.displayName,
            pfpUrl: participant.pfpUrl,
            amountOwed: config?.amount || totalAmount / allParticipants.length,
            status: "pending" as const,
          };
        },
      );

      const billData = {
        title: billTitle,
        description: billDescription,
        totalAmount,
        creatorFid: userFid,
        participants,
        splitType: splitConfig.type,
        currency: "USDC" as const,
        receiptImage: uploadedReceipt?.preview,
      };

      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billData),
      });

      if (response.ok) {
        const result = await response.json();
        alert("Bill created successfully!");
        resetCreateBillState();
        setSelectedBill(result.bill);
        setCurrentView("bill");
      } else {
        const error = await response.json();
        alert(`Failed to create bill: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      alert("Failed to create bill. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }, [
    billTitle,
    billDescription,
    totalAmount,
    selectedFriends,
    splitConfig,
    userFid,
    uploadedReceipt,
    resetCreateBillState,
  ]);

  // Handle bill selection from history
  const handleBillSelect = useCallback((bill: Bill) => {
    setSelectedBill(bill);
    setCurrentView("bill");
  }, []);

  // Handle payment completion
  const handlePaymentComplete = useCallback((result: PaymentResult) => {
    if (result.success) {
      // Refresh bill data or show success message
      alert("Payment completed successfully!");
    } else {
      alert(`Payment failed: ${result.error}`);
    }
  }, []);

  // Navigation
  const navigateToView = useCallback(
    (view: AppView) => {
      setCurrentView(view);
      if (view === "create") {
        resetCreateBillState();
      }
    },
    [resetCreateBillState],
  );

  // Validation for create bill
  const canCreateBill = useMemo(() => {
    const allParticipants = [
      {
        fid: userFid,
        username: "you",
        displayName: "You",
        pfpUrl: "",
        isFollowing: false,
        isFollowedBy: false,
      },
      ...selectedFriends,
    ];

    return (
      billTitle.trim() !== "" &&
      totalAmount > 0 &&
      selectedFriends.length > 0 &&
      splitConfig.participants.length === allParticipants.length &&
      splitConfig.participants.every((p) => (p.amount ?? 0) > 0)
    );
  }, [billTitle, totalAmount, selectedFriends, splitConfig, userFid]);

  return (
    <div className="space-y-6">
      {/* Navigation */}
      {currentView !== "create" && (
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToView("create")}
            icon={<Icon name="arrow-right" size="sm" className="rotate-180" />}
          >
            Back
          </Button>
        </div>
      )}

      {/* Home View */}
      {currentView === "home" && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--app-foreground)] mb-2">
              Share The Bill 💸
            </h1>
            <p className="text-[var(--app-foreground-muted)]">
              Split receipts with friends using Farcaster & Base Pay
            </p>
          </div>

          <BillStats userFid={userFid} />

          <div className="grid grid-cols-1 gap-4">
            <Button
              variant="primary"
              onClick={() => navigateToView("create")}
              icon={<Icon name="plus" size="sm" />}
              className="h-14"
            >
              Create New Bill
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigateToView("history")}
              icon={<Icon name="star" size="sm" />}
              className="h-14"
            >
              View Bill History
            </Button>
          </div>
        </div>
      )}

      {/* Create Bill View */}
      {currentView === "create" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[var(--app-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white">$</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--app-foreground)] mb-2">
              Share The Bill
            </h1>
            <p className="text-[var(--app-foreground-muted)]">
              Split receipts with friends using Farcaster & Base Pay
            </p>
          </div>

          {/* Step 1: Upload Receipt */}
          <div className="space-y-4">
            <BillUploader
              onReceiptUploaded={handleReceiptUploaded}
              isProcessing={uploadedReceipt?.isProcessing}
            />
          </div>

          {/* Step 2: Bill Details */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Bill title (e.g., Dinner at Restaurant)"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            />

            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Total amount"
                value={totalAmount || ""}
                onChange={(e) =>
                  handleAmountChange(parseFloat(e.target.value) || 0)
                }
                step="0.01"
                min="0"
                className="flex-1 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
              />
              <span className="text-[var(--app-foreground-muted)]">USDC</span>
            </div>
          </div>

          {/* Step 3: Select Friends */}
          <div className="space-y-4">
            <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">
                  Friends ({selectedFriends.length})
                </h3>
                <a
                  href="/friends"
                  className="text-[var(--app-accent)] text-sm hover:underline"
                >
                  Manage Friends
                </a>
              </div>

              {selectedFriends.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedFriends.map((friend, index) => (
                    <div
                      key={`${friend.fid}-${friend.username}-${index}`}
                      className="flex items-center space-x-2 bg-[var(--app-accent-light)] px-3 py-1 rounded-full"
                    >
                      <img
                        src={friend.pfpUrl || "/placeholder-avatar.png"}
                        alt={friend.displayName}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm">{friend.displayName}</span>
                      <button
                        onClick={() =>
                          setSelectedFriends((prev) =>
                            prev.filter((f) => f.fid !== friend.fid),
                          )
                        }
                        className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-[var(--app-gray)] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon
                      name="plus"
                      size="lg"
                      className="text-[var(--app-foreground-muted)]"
                    />
                  </div>
                  <p className="text-[var(--app-foreground-muted)] text-sm mb-3">
                    No friends selected for this bill
                  </p>
                  <a
                    href="/friends"
                    className="inline-flex items-center space-x-2 text-[var(--app-accent)] hover:underline"
                  >
                    <Icon name="plus" size="sm" />
                    <span>Add friends to split with</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Split Configuration */}
          {selectedFriends.length > 0 && totalAmount > 0 && (
            <div className="space-y-4">
              <BillSplitter
                totalAmount={totalAmount}
                participants={[
                  {
                    fid: userFid,
                    username: "you",
                    displayName: "You",
                    pfpUrl: "",
                    isFollowing: false,
                    isFollowedBy: false,
                  },
                  ...selectedFriends,
                ]}
                splitConfig={splitConfig}
                onSplitConfigChange={setSplitConfig}
              />
            </div>
          )}

          {/* Create Button */}
          <Button
            variant="primary"
            onClick={createBill}
            disabled={!canCreateBill || isCreating}
            className="w-full h-12"
          >
            {isCreating ? "Creating Bill..." : "Create Bill"}
          </Button>

          {/* Navigation to other views */}
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => navigateToView("history")}
              className="flex-1"
            >
              View History
            </Button>
          </div>
        </div>
      )}

      {/* Bill History View */}
      {currentView === "history" && (
        <BillHistory userFid={userFid} onBillSelect={handleBillSelect} />
      )}

      {/* Individual Bill View */}
      {currentView === "bill" && selectedBill && (
        <div className="space-y-6">
          <BillStatus bill={selectedBill} currentUserFid={userFid} />

          {/* Show payment flow if user hasn't paid yet */}
          {selectedBill.participants.find(
            (p) => p.fid === userFid && p.status === "pending",
          ) && (
            <div className="pt-4 border-t border-[var(--app-card-border)]">
              <h3 className="font-medium mb-4">Make Payment</h3>
              <PaymentFlow
                bill={selectedBill}
                participantFid={userFid}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
