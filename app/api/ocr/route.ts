import { NextRequest, NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { OCRResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file
    if (!isValidImageFile(file)) {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 }
      );
    }

    console.log("Starting OCR processing...");

    try {
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Perform OCR with English language support
      const { data: { text, confidence } } = await Tesseract.recognize(
        buffer,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          // Use default worker configuration
          workerBlobURL: false,
          gzip: false
        }
      );

      console.log("OCR completed. Extracted text:", text);

      // Extract amounts from text
      const extractedAmounts = extractAmountsFromText(text);
      
      const result: OCRResult = {
        extractedText: text,
        detectedAmounts: extractedAmounts,
        suggestedAmount: extractedAmounts.length > 0 ? Math.max(...extractedAmounts) : undefined,
        confidence: confidence / 100, // Convert to 0-1 range
        language: 'eng'
      };

      return NextResponse.json(result);

    } catch (ocrError) {
      console.error("Tesseract OCR error:", ocrError);
      
      // Return a mock result if OCR fails
      const fallbackResult: OCRResult = {
        extractedText: "OCR processing temporarily unavailable",
        detectedAmounts: [],
        suggestedAmount: undefined,
        confidence: 0,
        language: 'eng'
      };

      return NextResponse.json(fallbackResult);
    }

  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process image", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

function extractAmountsFromText(text: string): number[] {
  const amounts: number[] = [];
  
  // Various currency patterns for USDC/USD and international formats
  const patterns = [
    // USD/USDC formats: "$123.45", "123.45 USD", "123.45 USDC"
    /(?:[$])\s*(\d{1,3}(?:[\s,]\d{3})*\.?\d{0,2})/gi,
    /(\d{1,3}(?:[\s,]\d{3})*\.?\d{0,2})\s*(?:USD|USDC|usd|usdc)/gi,
    
    // International formats: "€123.45", "£123.45"
    /(?:[€£])\s*(\d{1,3}(?:[\s,]\d{3})*[,\.]\d{2})/gi,
    /(\d{1,3}(?:[\s,]\d{3})*[,\.]\d{2})\s*(?:[€£])/gi,
    
    // Simple number patterns (as fallback): "123.45", "123,45", "150"
    /(?:^|\s)(\d{1,4}[,\.]\d{2})(?:\s|$)/gi,
    /(?:^|\s)(\d{2,4})(?:\s|$)/gi, // Integers like "150", "39", etc.
    
    // Total/Sum indicators with amounts
    /(?:total|sum|amount|subtotal|grand\s*total)[\s:]*[\$]?(\d{1,3}(?:[\s,]\d{3})*[,\.]\d{2})/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amountStr = match[1];
      
      // Normalize the amount string
      const normalizedAmount = amountStr
        .replace(/\s/g, '') // Remove spaces
        .replace(',', '.'); // Replace comma with dot for parsing
      
      const amount = parseFloat(normalizedAmount);
      
      // Validate amount (reasonable range for receipts)
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        amounts.push(amount);
      }
    }
  }

  // Remove duplicates and sort
  const uniqueAmounts = [...new Set(amounts)].sort((a, b) => b - a);
  
  console.log("Extracted amounts:", uniqueAmounts);
  
  return uniqueAmounts;
}

// Helper function to validate image file
function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
}

export async function GET() {
  return NextResponse.json({
    message: "OCR API endpoint",
    supportedFormats: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: "10MB",
    languages: ["English (eng)"],
    supportedCurrencies: ["USD", "USDC", "EUR", "GBP"]
  });
}

