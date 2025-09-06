// TypeScript interfaces for ShareTheBill application

export interface BillParticipant {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  amountOwed: number;
  paidAt?: string;
  paymentHash?: string;
  status: 'pending' | 'paid' | 'failed';
}

export interface Bill {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  creatorFid: number;
  creatorUsername?: string;
  participants: BillParticipant[];
  status: 'draft' | 'pending' | 'collecting' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  receiptImage?: string;
  receiptImageUrl?: string;
  currency: 'USDC' | 'ETH';
  splitType: 'equal' | 'custom' | 'percentage';
  tags?: string[];
}

export interface OCRResult {
  extractedText: string;
  detectedAmounts: number[];
  suggestedAmount?: number;
  confidence: number;
  language: string;
}

export interface PaymentRequest {
  billId: string;
  participantFid: number;
  amount: number;
  currency: 'USDC' | 'ETH';
  recipientAddress: string;
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  timestamp: string;
}

export interface FarcasterFriend {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount?: number;
  followingCount?: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export interface NotificationPayload {
  type: 'bill_created' | 'payment_request' | 'payment_received' | 'bill_completed' | 'payment_reminder';
  billId: string;
  title: string;
  body: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

export interface BillSummary {
  id: string;
  title: string;
  totalAmount: number;
  yourShare: number;
  status: Bill['status'];
  createdAt: string;
  participantCount: number;
  isCreator: boolean;
}

export interface SplitConfiguration {
  type: 'equal' | 'custom' | 'percentage';
  participants: {
    fid: number;
    amount?: number;
    percentage?: number;
  }[];
}

export interface UploadedReceipt {
  file: File;
  preview: string;
  ocrResult?: OCRResult;
  isProcessing: boolean;
}


