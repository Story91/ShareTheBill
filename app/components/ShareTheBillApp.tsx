"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Icon } from "./DemoComponents";
import { BillUploader, BillSplitter, FriendSelector } from "./BillComponents";
import { AdvancedOCR } from "./AdvancedOCR";
import { PaymentFlow, BillStatus } from "./PaymentComponents";
import { BillHistory, BillStats } from "./BillHistory";
import { useToast, ToastContainer } from "./Toast";
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
  const { toasts, showSuccess, showError, showWarning, removeToast } = useToast();
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
      showWarning("Please fill in all required fields");
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
        showSuccess("Bill created successfully!");
        resetCreateBillState();
        setSelectedBill(result.bill);
        setCurrentView("bill");
      } else {
        const error = await response.json();
        showError(`Failed to create bill: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      showError("Failed to create bill. Please try again.");
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
      showSuccess("Payment completed successfully!");
    } else {
      showError(`Payment failed: ${result.error}`);
    }
  }, [showSuccess, showError]);

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
          {/* Hero Background Section */}
          <div className="relative">
            {/* Hero background */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-20">
              <img 
                src="/hero.png" 
                alt="Share The Bill" 
                className="w-full h-full object-cover filter blur-sm"
              />
            </div>
            
            {/* Content over hero background */}
            <div className="relative z-10">

          {/* Step 1: Upload Receipt */}
          <div className="space-y-4">
            <BillUploader
              onReceiptUploaded={handleReceiptUploaded}
              isProcessing={uploadedReceipt?.isProcessing}
              onAmountSelected={handleAmountChange}
            />
          </div>

          {/* Step 2: Bill Details */}
          <div className="glass-effect rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-[var(--app-foreground)] mb-4">📋 Bill Details</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Bill title (e.g., Dinner at Restaurant)"
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 border border-white/20 rounded-xl text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:bg-white/70 transition-all backdrop-blur-sm"
              />

              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--app-foreground-muted)]">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={totalAmount || ""}
                    onChange={(e) =>
                      handleAmountChange(parseFloat(e.target.value) || 0)
                    }
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 bg-white/50 border border-white/20 rounded-xl text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:bg-white/70 transition-all backdrop-blur-sm"
                  />
                </div>
                <div className="px-3 py-3 bg-[var(--app-accent)]/10 rounded-xl border border-[var(--app-accent)]/20">
                  <span className="text-[var(--app-accent)] font-medium">USDC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Select Friends */}
          <div className="glass-effect rounded-2xl p-6">
            <h3 className="font-semibold text-[var(--app-foreground)] mb-4">👥 Split with Friends</h3>
            <FriendSelector
              selectedFriends={selectedFriends}
              onFriendsSelected={setSelectedFriends}
              currentUserFid={userFid}
            />
          </div>

          {/* Step 4: Split Configuration */}
          {selectedFriends.length > 0 && totalAmount > 0 && (
            <div className="glass-effect rounded-2xl p-6">
              <h3 className="font-semibold text-[var(--app-foreground)] mb-4">⚖️ Split Configuration</h3>
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
                showWarning={showWarning}
              />
            </div>
          )}

          {/* Create Button with Hero Background */}
          <div className="pt-4">
            <div className="relative">
              {/* Hero background in button */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-10">
                <img 
                  src="/hero.png" 
                  alt="" 
                  className="w-full h-full object-cover filter blur-md"
                />
              </div>
              
              <Button
                variant="primary"
                onClick={createBill}
                disabled={!canCreateBill || isCreating}
                className="relative z-10 w-full h-14 bg-gradient-to-r from-[var(--app-accent)] to-blue-600 hover:from-blue-600 hover:to-[var(--app-accent)] text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Creating Bill...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🚀</span>
                    Create Bill
                  </div>
                )}
              </Button>
            </div>
          </div>

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
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
