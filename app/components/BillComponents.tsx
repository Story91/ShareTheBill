"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button, Icon } from "./DemoComponents";
import { SimpleCamera } from "./SimpleCamera";
import { OCRResult, UploadedReceipt, FarcasterFriend, SplitConfiguration } from "@/lib/types";

// BillUploader Component
interface BillUploaderProps {
  onReceiptUploaded: (receipt: UploadedReceipt) => void;
  isProcessing?: boolean;
}

export function BillUploader({ onReceiptUploaded, isProcessing = false }: BillUploaderProps) {
  const [uploadedReceipt, setUploadedReceipt] = useState<UploadedReceipt | null>(null);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if camera is supported
  useEffect(() => {
    const checkCameraSupport = () => {
      try {
        // Simple check if getUserMedia is available
        const isSupported = !!(
          navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia &&
          typeof navigator.mediaDevices.getUserMedia === 'function'
        );
        setCameraSupported(isSupported);
      } catch (error) {
        console.log('Camera not supported:', error);
        setCameraSupported(false);
      }
    };
    
    checkCameraSupport();
  }, []);

  const handleFiles = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);

    const receipt: UploadedReceipt = {
      file,
      preview,
      isProcessing: true
    };

    setUploadedReceipt(receipt);
    onReceiptUploaded(receipt);

    // Process OCR
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Try real OCR first, fallback to simple OCR
      let response = await fetch('/api/ocr-real', {
        method: 'POST',
        body: formData
      });

      // If real OCR fails, try simple OCR
      if (!response.ok) {
        console.log('Real OCR failed, trying simple OCR...');
        response = await fetch('/api/ocr-simple', {
          method: 'POST',
          body: formData
        });
      }

      if (response.ok) {
        const ocrResult: OCRResult = await response.json();
        const updatedReceipt = {
          ...receipt,
          ocrResult,
          isProcessing: false
        };
        setUploadedReceipt(updatedReceipt);
        onReceiptUploaded(updatedReceipt);
      } else {
        // Log the actual error response
        const errorText = await response.text();
        console.error('OCR API error:', response.status, errorText);
        throw new Error(`OCR processing failed: ${response.status}`);
      }
    } catch (error) {
      console.error('OCR error:', error);
      const updatedReceipt = {
        ...receipt,
        isProcessing: false,
        ocrResult: {
          extractedText: 'OCR processing failed',
          detectedAmounts: [],
          confidence: 0,
          language: 'eng'
        }
      };
      setUploadedReceipt(updatedReceipt);
      onReceiptUploaded(updatedReceipt);
      
      // Show a more user-friendly message
      console.log('OCR failed, but you can still enter the amount manually');
    }
  }, [onReceiptUploaded]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeReceipt = useCallback(() => {
    if (uploadedReceipt?.preview) {
      URL.revokeObjectURL(uploadedReceipt.preview);
    }
    setUploadedReceipt(null);
  }, [uploadedReceipt]);

  const handleCameraCapture = useCallback(async (file: File) => {
    // Create a FileList-like object
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => index === 0 ? file : null,
      [Symbol.iterator]: function* () {
        yield file;
      }
    } as FileList;
    
    await handleFiles(fileList);
  }, [handleFiles]);

  return (
    <div className="space-y-4">
      {showCamera && (
        <SimpleCamera
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      
      {!uploadedReceipt ? (
        <div className="space-y-6">
          {/* Camera Option */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center transition-colors border-[var(--app-card-border)] hover:border-[var(--app-accent)]">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-[var(--app-accent)] rounded-full flex items-center justify-center">
                  <Icon name="camera" size="lg" className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-[var(--app-foreground)] font-medium text-lg">
                  Take a photo of your receipt
                </p>
                <p className="text-[var(--app-foreground-muted)] text-sm">
                  We'll automatically extract the amount
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (cameraSupported) {
                    setShowCamera(true);
                  } else {
                    alert('Camera not supported on this device. Please use "Choose File" instead.');
                  }
                }}
                disabled={isProcessing}
                className="w-full h-12"
              >
                {cameraSupported ? 'Open Camera' : 'Camera Not Available'}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center">
            <div className="flex-1 border-t border-[var(--app-card-border)]"></div>
            <span className="px-4 text-[var(--app-foreground-muted)] text-sm">or</span>
            <div className="flex-1 border-t border-[var(--app-card-border)]"></div>
          </div>

          {/* Upload Option */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center transition-colors border-[var(--app-card-border)] hover:border-[var(--app-accent)]">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-[var(--app-gray)] rounded-full flex items-center justify-center">
                  <Icon name="upload" size="lg" className="text-[var(--app-foreground-muted)]" />
                </div>
              </div>
              <div>
                <p className="text-[var(--app-foreground)] font-medium text-lg">
                  Upload photo from gallery
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full h-12"
              >
                Choose File
              </Button>
            </div>
          </div>

          {/* Manual Entry Link */}
          <div className="text-center">
            <button
              onClick={() => {
                // This could trigger manual amount entry
                console.log('Manual entry clicked');
              }}
              className="text-[var(--app-accent)] text-sm hover:underline"
            >
              Enter amount manually
            </button>
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
        <div className="space-y-4">
          <div className="relative">
            <img
              src={uploadedReceipt.preview}
              alt="Receipt preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              onClick={removeReceipt}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          {uploadedReceipt.isProcessing && (
            <div className="text-center">
              <p className="text-[var(--app-foreground-muted)]">
                Extracting amount from receipt...
              </p>
            </div>
          )}

          {uploadedReceipt.ocrResult && (
            <div className="bg-[var(--app-card-bg)] p-4 rounded-lg">
              <h4 className="font-medium mb-2">Receipt Analysis:</h4>
              {uploadedReceipt.ocrResult.detectedAmounts.length > 0 ? (
                <div>
                  <p className="text-sm text-[var(--app-foreground-muted)]">
                    Found amounts: {uploadedReceipt.ocrResult.detectedAmounts.map(a => `$${a}`).join(', ')}
                  </p>
                  {uploadedReceipt.ocrResult.suggestedAmount && (
                    <p className="text-sm font-medium text-[var(--app-accent)]">
                      Suggested total: ${uploadedReceipt.ocrResult.suggestedAmount} USDC
                    </p>
                  )}
                </div>
              ) : uploadedReceipt.ocrResult.confidence === 0 ? (
                <div className="text-center py-2">
                  <p className="text-sm text-[var(--app-foreground-muted)] mb-2">
                    📱 Receipt uploaded successfully!
                  </p>
                  <p className="text-xs text-[var(--app-foreground-muted)]">
                    Please enter the amount manually below
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--app-foreground-muted)]">
                  No amounts detected. Please enter manually.
                </p>
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

export function FriendSelector({ selectedFriends, onFriendsSelected, currentUserFid }: FriendSelectorProps) {
  const [friends, setFriends] = useState<FarcasterFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSelector, setShowSelector] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/friends?fid=${currentUserFid}&search=${searchQuery}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserFid, searchQuery]);

  const toggleFriend = useCallback((friend: FarcasterFriend) => {
    const isSelected = selectedFriends.some(f => f.fid === friend.fid);
    if (isSelected) {
      onFriendsSelected(selectedFriends.filter(f => f.fid !== friend.fid));
    } else {
      onFriendsSelected([...selectedFriends, friend]);
    }
  }, [selectedFriends, onFriendsSelected]);

  const removeFriend = useCallback((fid: number) => {
    onFriendsSelected(selectedFriends.filter(f => f.fid !== fid));
  }, [selectedFriends, onFriendsSelected]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">Selected Friends ({selectedFriends.length})</h3>
        {selectedFriends.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedFriends.map((friend, index) => (
              <div
                key={`${friend.fid}-${friend.username}-${index}`}
                className="flex items-center space-x-2 bg-[var(--app-accent-light)] px-3 py-1 rounded-full"
              >
                <img
                  src={friend.pfpUrl || '/placeholder-avatar.png'}
                  alt={friend.displayName}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm">{friend.displayName}</span>
                <button
                  onClick={() => removeFriend(friend.fid)}
                  className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--app-foreground-muted)] text-sm">
            No friends selected yet
          </p>
        )}
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setShowSelector(!showSelector);
          if (!showSelector && friends.length === 0) {
            loadFriends();
          }
        }}
        icon={<Icon name="plus" size="sm" />}
      >
        Add Friends
      </Button>

      {showSelector && (
        <div className="bg-[var(--app-card-bg)] rounded-lg p-4 border border-[var(--app-card-border)]">
          <div className="mb-4">
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
              const isSelected = selectedFriends.some(f => f.fid === friend.fid);
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
                    src={friend.pfpUrl || '/placeholder-avatar.png'}
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
}

export function BillSplitter({ totalAmount, participants, splitConfig, onSplitConfigChange }: BillSplitterProps) {
  // Auto-update equal split when participants or totalAmount changes
  useEffect(() => {
    if (splitConfig.type === 'equal' && participants.length > 0) {
      const expectedAmountPerPerson = totalAmount / participants.length;
      
      // Only update if the current config doesn't match expected values
      const needsUpdate = splitConfig.participants.length !== participants.length ||
        splitConfig.participants.some(p => {
          const participant = participants.find(part => part.fid === p.fid);
          return !participant || (p.amount ?? 0) !== expectedAmountPerPerson;
        });
      
      if (needsUpdate) {
        const newConfig: SplitConfiguration = {
          type: 'equal',
          participants: participants.map(p => ({
            fid: p.fid,
            amount: expectedAmountPerPerson
          }))
        };
        onSplitConfigChange(newConfig);
      }
    }
  }, [participants, totalAmount, splitConfig.type, splitConfig.participants, onSplitConfigChange]);

  const updateSplitType = useCallback((type: 'equal' | 'custom' | 'percentage') => {
    const newConfig: SplitConfiguration = {
      type,
      participants: participants.map(p => {
        const existingConfig = splitConfig.participants.find(sp => sp.fid === p.fid);
        
        if (type === 'equal') {
          return {
            fid: p.fid,
            amount: totalAmount / participants.length
          };
        } else if (type === 'custom') {
          return {
            fid: p.fid,
            amount: existingConfig?.amount || 0
          };
        } else { // percentage
          return {
            fid: p.fid,
            percentage: existingConfig?.percentage || (100 / participants.length)
          };
        }
      })
    };
    
    onSplitConfigChange(newConfig);
  }, [totalAmount, participants, splitConfig, onSplitConfigChange]);

  const updateParticipantAmount = useCallback((fid: number, amount: number) => {
    const newConfig = {
      ...splitConfig,
      participants: splitConfig.participants.map(p =>
        p.fid === fid ? { ...p, amount } : p
      )
    };
    onSplitConfigChange(newConfig);
  }, [splitConfig, onSplitConfigChange]);

  const updateParticipantPercentage = useCallback((fid: number, percentage: number) => {
    const newConfig = {
      ...splitConfig,
      participants: splitConfig.participants.map(p =>
        p.fid === fid ? { ...p, percentage } : p
      )
    };
    onSplitConfigChange(newConfig);
  }, [splitConfig, onSplitConfigChange]);

  const totalCalculated = splitConfig.type === 'percentage' 
    ? (splitConfig.participants.reduce((sum, p) => sum + (p.percentage || 0), 0))
    : splitConfig.participants.reduce((sum, p) => sum + (p.amount || 0), 0);

  const isValid = splitConfig.type === 'percentage' 
    ? Math.abs(totalCalculated - 100) < 0.01
    : Math.abs(totalCalculated - totalAmount) < 0.01;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">How to split the bill?</h3>
        <div className="flex space-x-2">
          <Button
            variant={splitConfig.type === 'equal' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => updateSplitType('equal')}
          >
            Equal
          </Button>
          <Button
            variant={splitConfig.type === 'custom' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => updateSplitType('custom')}
          >
            Custom
          </Button>
          <Button
            variant={splitConfig.type === 'percentage' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => updateSplitType('percentage')}
          >
            Percentage
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {participants.map((participant, index) => {
          const config = splitConfig.participants.find(p => p.fid === participant.fid);
          
          return (
            <div key={`${participant.fid}-${participant.username}-${index}`} className="flex items-center space-x-3 p-3 bg-[var(--app-card-bg)] rounded-lg">
              <img
                src={participant.pfpUrl || '/placeholder-avatar.png'}
                alt={participant.displayName}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <p className="font-medium">{participant.displayName}</p>
                <p className="text-sm text-[var(--app-foreground-muted)]">@{participant.username}</p>
              </div>
              <div className="flex items-center space-x-2">
                {splitConfig.type === 'equal' ? (
                  <span className="font-medium">
                    ${(totalAmount / participants.length).toFixed(2)}
                  </span>
                ) : splitConfig.type === 'custom' ? (
                  <input
                    type="number"
                    value={config?.amount || 0}
                    onChange={(e) => updateParticipantAmount(participant.fid, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-right bg-[var(--app-background)] border border-[var(--app-card-border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                    step="0.01"
                    min="0"
                  />
                ) : (
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={config?.percentage || 0}
                      onChange={(e) => updateParticipantPercentage(participant.fid, parseFloat(e.target.value) || 0)}
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
          <span className={`font-medium ${isValid ? 'text-[var(--app-accent)]' : 'text-red-500'}`}>
            {splitConfig.type === 'percentage' 
              ? `${totalCalculated.toFixed(1)}%`
              : `$${totalCalculated.toFixed(2)}`
            }
          </span>
        </div>
        {!isValid && (
          <p className="text-red-500 text-sm mt-1">
            {splitConfig.type === 'percentage' 
              ? 'Percentages must add up to 100%'
              : `Amounts must add up to $${totalAmount}`
            }
          </p>
        )}
      </div>
    </div>
  );
}

