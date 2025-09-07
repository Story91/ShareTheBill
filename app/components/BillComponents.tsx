"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button, Icon } from "./DemoComponents";
import { SimpleCamera } from "./SimpleCamera";
import {
  OCRResult,
  UploadedReceipt,
  FarcasterFriend,
  SplitConfiguration,
} from "@/lib/types";

// BillUploader Component
interface BillUploaderProps {
  onReceiptUploaded: (receipt: UploadedReceipt) => void;
  isProcessing?: boolean;
  onAmountSelected?: (amount: number) => void;
}

export function BillUploader({
  onReceiptUploaded,
  isProcessing = false,
  onAmountSelected,
}: BillUploaderProps) {
  const [uploadedReceipt, setUploadedReceipt] =
    useState<UploadedReceipt | null>(null);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if camera is supported
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        // Check if getUserMedia is supported and can be used
        if (
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getUserMedia === "function"
        ) {
          // Try to get available devices to verify camera access
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = devices.some(
            (device) => device.kind === "videoinput",
          );
          setCameraSupported(hasVideoInput);
        } else {
          setCameraSupported(false);
        }
      } catch (error) {
        console.log("Camera not supported:", error);
        setCameraSupported(false);
      }
    };

    checkCameraSupport();
  }, []);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const file = files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);

      const receipt: UploadedReceipt = {
        file,
        preview,
        isProcessing: true,
      };

      setUploadedReceipt(receipt);
      onReceiptUploaded(receipt);

      // Process OCR
      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/ocr-advanced", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const ocrResult: OCRResult = await response.json();
          const updatedReceipt = {
            ...receipt,
            ocrResult,
            isProcessing: false,
          };
          setUploadedReceipt(updatedReceipt);
          onReceiptUploaded(updatedReceipt);
        } else {
          // Log the actual error response
          const errorText = await response.text();
          console.error("OCR API error:", response.status, errorText);
          throw new Error(`OCR processing failed: ${response.status}`);
        }
      } catch (error) {
        console.error("OCR error:", error);
        const updatedReceipt = {
          ...receipt,
          isProcessing: false,
          ocrResult: {
            extractedText: "OCR processing failed",
            detectedAmounts: [],
            confidence: 0,
            language: "eng",
          },
        };
        setUploadedReceipt(updatedReceipt);
        onReceiptUploaded(updatedReceipt);

        // Show a more user-friendly message
        console.log("OCR failed, but you can still enter the amount manually");
      }
    },
    [onReceiptUploaded],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  const removeReceipt = useCallback(() => {
    if (uploadedReceipt?.preview) {
      URL.revokeObjectURL(uploadedReceipt.preview);
    }
    setUploadedReceipt(null);
  }, [uploadedReceipt]);

  const handleCameraCapture = useCallback(
    async (file: File) => {
      // Create a FileList-like object
      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null),
        [Symbol.iterator]: function* () {
          yield file;
        },
      } as FileList;

      await handleFiles(fileList);
    },
    [handleFiles],
  );


  return (
    <div className="space-y-4">
      {showCamera && (
        <SimpleCamera
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {!uploadedReceipt ? (
        <div className="space-y-8">
          {/* Modern Camera/Upload Section */}
          <div className="glass-effect rounded-3xl p-8 text-center">
            <div className="space-y-6">
              {/* Modern Button Row */}
              <div className="flex justify-center items-center space-x-8">
                {/* Camera Button */}
                <div className="text-center">
                  <button
                    className="modern-camera-button"
                    onClick={() => {
                      if (cameraSupported) {
                        setShowCamera(true);
                      } else {
                        alert(
                          'Camera not supported on this device. Please use gallery instead.',
                        );
                      }
                    }}
                    disabled={isProcessing}
                    title="Take photo"
                  >
                    <Icon name="camera" size="lg" className="text-white" />
                  </button>
                  <p className="text-xs text-[var(--app-foreground-muted)] mt-2">
                    Camera
                  </p>
                </div>

                {/* Upload Button */}
                <div className="text-center">
                  <button
                    className="modern-upload-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    title="Choose from gallery"
                  >
                    <Icon name="upload" size="lg" className="text-white" />
                  </button>
                  <p className="text-xs text-[var(--app-foreground-muted)] mt-2">
                    Gallery
                  </p>
                </div>
              </div>


            </div>
          </div>

          {/* Camera Input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* File Upload Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Modern Receipt Preview */}
          <div className="glass-effect rounded-2xl p-4 relative overflow-hidden">
            <img
              src={uploadedReceipt.preview}
              alt="Receipt preview"
              className="w-full h-56 object-cover rounded-xl shadow-lg"
            />
            <button
              onClick={removeReceipt}
              className="absolute top-6 right-6 bg-red-500/90 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all backdrop-blur-sm border border-white/20"
            >
              <span className="text-white text-xl font-bold">×</span>
            </button>
            
            {/* Processing Overlay */}
            {uploadedReceipt.isProcessing && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="font-medium">Analyzing receipt...</p>
                  <p className="text-sm opacity-75">Using AI to extract amounts</p>
                </div>
              </div>
            )}
          </div>

          {/* OCR Results */}
          {uploadedReceipt.ocrResult && (
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🤖</span>
                <h4 className="font-semibold text-[var(--app-foreground)]">AI Analysis</h4>
              </div>
              
              {uploadedReceipt.ocrResult.detectedAmounts.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 mb-3">
                      💰 Tap an amount to use it:
                    </p>
                    
                    {/* Clickable amount buttons */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {uploadedReceipt.ocrResult.detectedAmounts.map((amount, index) => (
                        <button
                          key={index}
                          onClick={() => onAmountSelected?.(amount)}
                          className="px-3 py-1 bg-white border border-green-300 rounded-lg text-green-700 hover:bg-green-100 hover:border-green-400 transition-colors text-sm font-medium"
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                    
                    {uploadedReceipt.ocrResult.suggestedAmount && (
                      <p className="text-xs text-green-600 opacity-75">
                        Suggested total: ${uploadedReceipt.ocrResult.suggestedAmount} USDC
                      </p>
                    )}
                  </div>
                </div>
              ) : uploadedReceipt.ocrResult.confidence === 0 ? (
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-medium mb-1">📱 Receipt uploaded successfully!</p>
                  <p className="text-blue-600 text-sm">Please enter the amount manually below</p>
                </div>
              ) : (
                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800">⚠️ No amounts detected. Please enter manually.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// FriendSelector Component
interface FriendSelectorProps {
  selectedFriends: FarcasterFriend[];
  onFriendsSelected: (friends: FarcasterFriend[]) => void;
  currentUserFid: number;
}

export function FriendSelector({
  selectedFriends,
  onFriendsSelected,
  currentUserFid,
}: FriendSelectorProps) {
  const [friends, setFriends] = useState<FarcasterFriend[]>([]);
  const [recentFriends, setRecentFriends] = useState<FarcasterFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSelector, setShowSelector] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/friends?fid=${currentUserFid}&search=${searchQuery}&limit=20`,
      );
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserFid, searchQuery]);

  // Load recent friends on component mount
  const loadRecentFriends = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/friends?fid=${currentUserFid}&limit=6`, // Get 6 recent friends
      );
      if (response.ok) {
        const data = await response.json();
        // Take first 6 friends as "recent" and filter out already selected
        const recent = data.friends.slice(0, 6).filter(
          (friend: FarcasterFriend) => !selectedFriends.some(sf => sf.fid === friend.fid)
        );
        setRecentFriends(recent);
      }
    } catch (error) {
      console.error("Error loading recent friends:", error);
    }
  }, [currentUserFid, selectedFriends]);

  // Load recent friends on mount and when selectedFriends changes
  useEffect(() => {
    loadRecentFriends();
  }, [loadRecentFriends]);

  const toggleFriend = useCallback(
    (friend: FarcasterFriend) => {
      const isSelected = selectedFriends.some((f) => f.fid === friend.fid);
      if (isSelected) {
        onFriendsSelected(selectedFriends.filter((f) => f.fid !== friend.fid));
      } else {
        onFriendsSelected([...selectedFriends, friend]);
      }
    },
    [selectedFriends, onFriendsSelected],
  );

  const removeFriend = useCallback(
    (fid: number) => {
      onFriendsSelected(selectedFriends.filter((f) => f.fid !== fid));
    },
    [selectedFriends, onFriendsSelected],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          Friends ({selectedFriends.length})
        </h3>
      </div>

      {/* Compact friend avatars display */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Show selected friends first (max 3) */}
        {selectedFriends.slice(0, 3).map((friend, index) => (
          <div
            key={`selected-${friend.fid}-${friend.username}-${index}`}
            className="relative group"
          >
            <img
              src={friend.pfpUrl || "/placeholder-avatar.png"}
              alt={friend.displayName}
              className="w-10 h-10 rounded-full border-2 border-[var(--app-accent)] hover:border-[var(--app-accent)]"
              title={friend.displayName}
            />
            <button
              onClick={() => removeFriend(friend.fid)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        
        {/* Show "more selected" indicator if there are more than 3 selected friends */}
        {selectedFriends.length > 3 && (
          <div 
            className="w-10 h-10 rounded-full bg-[var(--app-accent)]/10 border-2 border-[var(--app-accent)] flex items-center justify-center cursor-pointer hover:bg-[var(--app-accent)]/20"
            onClick={() => {
              setShowSelector(!showSelector);
              if (!showSelector && friends.length === 0) {
                loadFriends();
              }
            }}
            title={`+${selectedFriends.length - 3} more selected friends`}
          >
            <span className="text-sm font-medium text-[var(--app-accent)]">+{selectedFriends.length - 3}</span>
          </div>
        )}

        {/* Show recent friends (when selectedFriends < 3) */}
        {selectedFriends.length < 3 && recentFriends.slice(0, 3 - selectedFriends.length).map((friend, index) => (
          <div
            key={`recent-${friend.fid}-${friend.username}-${index}`}
            className="relative group"
          >
            <img
              src={friend.pfpUrl || "/placeholder-avatar.png"}
              alt={friend.displayName}
              className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 hover:border-[var(--app-accent)] cursor-pointer opacity-60 hover:opacity-100 transition-all"
              title={`Quick add: ${friend.displayName}`}
              onClick={() => toggleFriend(friend)}
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">
              +
            </div>
          </div>
        ))}
        
        {/* Add friends button */}
        <button
          onClick={() => {
            setShowSelector(!showSelector);
            if (!showSelector && friends.length === 0) {
              loadFriends();
            }
          }}
          className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--app-accent)] bg-[var(--app-accent)]/10 hover:bg-[var(--app-accent)]/20 flex items-center justify-center transition-colors"
          title="Add friends to this bill"
        >
          <Icon name="plus" size="sm" className="text-[var(--app-accent)]" />
        </button>
      </div>

      {selectedFriends.length === 0 && recentFriends.length === 0 && (
        <p className="text-[var(--app-foreground-muted)] text-sm">
          Click ➕ to add friends to split the bill
        </p>
      )}
      
      {selectedFriends.length === 0 && recentFriends.length > 0 && (
        <p className="text-[var(--app-foreground-muted)] text-sm">
          Click on suggested friends or ➕ to add more
        </p>
      )}

      {showSelector && (
        <div className="bg-[var(--app-card-bg)] rounded-lg p-4 border border-[var(--app-card-border)]">
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2 text-[var(--app-foreground-muted)]">
              Add friends to this bill
            </h4>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--app-background)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={loadFriends}
              disabled={loading}
              className="mt-2"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {friends.map((friend, index) => {
              const isSelected = selectedFriends.some(
                (f) => f.fid === friend.fid,
              );
              return (
                <div
                  key={`${friend.fid}-${friend.username}-${index}`}
                  className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--app-accent-light)]"
                      : "hover:bg-[var(--app-gray)]"
                  }`}
                  onClick={() => toggleFriend(friend)}
                >
                  <img
                    src={friend.pfpUrl || "/placeholder-avatar.png"}
                    alt={friend.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{friend.displayName}</p>
                    <p className="text-sm text-[var(--app-foreground-muted)]">
                      @{friend.username}
                    </p>
                  </div>
                  {isSelected && (
                    <Icon name="check" className="text-[var(--app-accent)]" />
                  )}
                </div>
              );
            })}
          </div>

          {friends.length === 0 && !loading && (
            <p className="text-center text-[var(--app-foreground-muted)] py-4">
              No friends found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// BillSplitter Component
interface BillSplitterProps {
  totalAmount: number;
  participants: FarcasterFriend[];
  splitConfig: SplitConfiguration;
  onSplitConfigChange: (config: SplitConfiguration) => void;
  showWarning?: (message: string) => void;
}

export function BillSplitter({
  totalAmount,
  participants,
  splitConfig,
  onSplitConfigChange,
  showWarning,
}: BillSplitterProps) {
  // Auto-update equal split when participants or totalAmount changes
  useEffect(() => {
    if (splitConfig.type === "equal" && participants.length > 0) {
      const baseAmountPerPerson = Math.floor((totalAmount * 100) / participants.length) / 100; // Round down to cents
      const remainder = totalAmount - (baseAmountPerPerson * participants.length);
      
      // Only update if the current config doesn't match expected values
      const needsUpdate =
        splitConfig.participants.length !== participants.length ||
        splitConfig.participants.some((p) => {
          const participant = participants.find((part) => part.fid === p.fid);
          return !participant;
        });

      if (needsUpdate) {
        const newConfig: SplitConfiguration = {
          type: "equal",
          participants: participants.map((p, index) => ({
            fid: p.fid,
            // First participant (creator) gets the remainder to make sum exact
            amount: index === 0 ? baseAmountPerPerson + remainder : baseAmountPerPerson,
          })),
        };
        onSplitConfigChange(newConfig);
      }
    }
  }, [
    participants,
    totalAmount,
    splitConfig.type,
    splitConfig.participants,
    onSplitConfigChange,
  ]);

  const updateSplitType = useCallback(
    (type: "equal" | "custom" | "percentage") => {
      const newConfig: SplitConfiguration = {
        type,
        participants: participants.map((p, index) => {
          const existingConfig = splitConfig.participants.find(
            (sp) => sp.fid === p.fid,
          );

          if (type === "equal") {
            const baseAmountPerPerson = Math.floor((totalAmount * 100) / participants.length) / 100;
            const remainder = totalAmount - (baseAmountPerPerson * participants.length);
            return {
              fid: p.fid,
              // First participant (creator) gets the remainder to make sum exact
              amount: index === 0 ? baseAmountPerPerson + remainder : baseAmountPerPerson,
            };
          } else if (type === "custom") {
            return {
              fid: p.fid,
              amount: existingConfig?.amount || 0,
            };
          } else {
            // percentage
            return {
              fid: p.fid,
              percentage:
                existingConfig?.percentage || 100 / participants.length,
            };
          }
        }),
      };

      onSplitConfigChange(newConfig);
    },
    [totalAmount, participants, splitConfig, onSplitConfigChange],
  );

  const updateParticipantAmount = useCallback(
    (fid: number, amount: number) => {
      const newConfig = {
        ...splitConfig,
        participants: splitConfig.participants.map((p) =>
          p.fid === fid ? { ...p, amount } : p,
        ),
      };
      onSplitConfigChange(newConfig);
    },
    [splitConfig, onSplitConfigChange],
  );

  const updateParticipantPercentage = useCallback(
    (fid: number, percentage: number) => {
      const newConfig = {
        ...splitConfig,
        participants: splitConfig.participants.map((p) =>
          p.fid === fid ? { ...p, percentage } : p,
        ),
      };
      onSplitConfigChange(newConfig);
    },
    [splitConfig, onSplitConfigChange],
  );

  const totalCalculated =
    splitConfig.type === "percentage"
      ? splitConfig.participants.reduce(
          (sum, p) => sum + (p.percentage || 0),
          0,
        )
      : splitConfig.participants.reduce((sum, p) => sum + (p.amount || 0), 0);

  const isValid =
    splitConfig.type === "percentage"
      ? Math.abs(totalCalculated - 100) < 0.01
      : Math.abs(totalCalculated - totalAmount) < 0.01;

  // Show warning toast only for significant differences (for custom/percentage modes)
  useEffect(() => {
    if (splitConfig.participants.length > 0 && showWarning && splitConfig.type !== "equal") {
      const difference = Math.abs(totalCalculated - (splitConfig.type === "percentage" ? 100 : totalAmount));
      
      if (difference > 0.01) {
        // Only show warning for custom/percentage modes where user controls the amounts
        if (splitConfig.type === "percentage") {
          showWarning(`Percentages add up to ${totalCalculated.toFixed(1)}% instead of 100%`);
        } else {
          showWarning(`Amounts add up to $${totalCalculated.toFixed(2)} instead of $${totalAmount.toFixed(2)}`);
        }
      }
    }
  }, [totalCalculated, totalAmount, splitConfig, showWarning]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">How to split the bill?</h3>
        <div className="flex space-x-2">
          <Button
            variant={splitConfig.type === "equal" ? "primary" : "outline"}
            size="sm"
            onClick={() => updateSplitType("equal")}
          >
            Equal
          </Button>
          <Button
            variant={splitConfig.type === "custom" ? "primary" : "outline"}
            size="sm"
            onClick={() => updateSplitType("custom")}
          >
            Custom
          </Button>
          <Button
            variant={splitConfig.type === "percentage" ? "primary" : "outline"}
            size="sm"
            onClick={() => updateSplitType("percentage")}
          >
            Percentage
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {participants.map((participant, index) => {
          const config = splitConfig.participants.find(
            (p) => p.fid === participant.fid,
          );

          return (
            <div
              key={`${participant.fid}-${participant.username}-${index}`}
              className="flex items-center space-x-3 p-3 bg-[var(--app-card-bg)] rounded-lg"
            >
              <img
                src={participant.pfpUrl || "/placeholder-avatar.png"}
                alt={participant.displayName}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <p className="font-medium">{participant.displayName}</p>
                <p className="text-sm text-[var(--app-foreground-muted)]">
                  @{participant.username}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {splitConfig.type === "equal" ? (
                  <span className="font-medium">
                    ${(totalAmount / participants.length).toFixed(2)}
                  </span>
                ) : splitConfig.type === "custom" ? (
                  <input
                    type="number"
                    value={config?.amount || 0}
                    onChange={(e) =>
                      updateParticipantAmount(
                        participant.fid,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-20 px-2 py-1 text-right bg-[var(--app-background)] border border-[var(--app-card-border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                    step="0.01"
                    min="0"
                  />
                ) : (
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={config?.percentage || 0}
                      onChange={(e) =>
                        updateParticipantPercentage(
                          participant.fid,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-16 px-2 py-1 text-right bg-[var(--app-background)] border border-[var(--app-card-border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <span>%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--app-gray)] p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total:</span>
          <span
            className={`font-medium ${isValid ? "text-[var(--app-accent)]" : "text-red-500"}`}
          >
            {splitConfig.type === "percentage"
              ? `${totalCalculated.toFixed(1)}%`
              : `$${totalCalculated.toFixed(2)}`}
          </span>
        </div>
        {!isValid && (
          <p className="text-red-500 text-sm mt-1">
            {splitConfig.type === "percentage"
              ? "Percentages must add up to 100%"
              : `Amounts must add up to $${totalAmount}`}
          </p>
        )}
      </div>
    </div>
  );
}
