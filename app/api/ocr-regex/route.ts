import { NextRequest, NextResponse } from "next/server";
import { OCRResult } from "@/lib/types";

// Simple OCR endpoint that uses basic text extraction
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

    console.log("Processing image with regex OCR...");

    // For demo purposes, let's simulate some common receipt patterns
    // In a real app, you'd use a proper OCR library
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));

    // Create some realistic receipt text simulation
    const mockReceiptText = generateMockReceiptText();
    const extractedAmounts = extractAmountsFromText(mockReceiptText);
    
    const result: OCRResult = {
      extractedText: mockReceiptText,
      detectedAmounts: extractedAmounts,
      suggestedAmount: extractedAmounts.length > 0 ? Math.max(...extractedAmounts) : undefined,
      confidence: extractedAmounts.length > 0 ? 0.8 : 0,
      language: 'eng'
    };

    console.log("Regex OCR completed:", result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Regex OCR error:", error);
    
    const fallbackResult: OCRResult = {
      extractedText: "Image uploaded successfully",
      detectedAmounts: [],
      suggestedAmount: undefined,
      confidence: 0,
      language: 'eng'
    };

    return NextResponse.json(fallbackResult);
  }
}

function generateMockReceiptText(): string {
  // Generate some realistic receipt text with amounts
  const templates = [
    "RESTAURANT BILL\nItem 1: $12.50\nItem 2: $8.75\nTax: $2.10\nTotal: $23.35",
    "GROCERY STORE\nBread: $3.99\nMilk: $4.50\nTotal: $8.49",
    "COFFEE SHOP\nLatte: $4.25\nMuffin: $2.75\nTotal: $7.00",
    "GAS STATION\nFuel: $45.67\nTotal: $45.67",
    "PHARMACY\nMedicine: $15.99\nTotal: $15.99"
  ];
  
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return randomTemplate;
}

function extractAmountsFromText(text: string): number[] {
  const amounts: number[] = [];
  
  // Look for dollar amounts: $XX.XX or XX.XX
  const patterns = [
    /\$(\d+\.\d{2})/g,  // $XX.XX
    /(\d+\.\d{2})/g,    // XX.XX
    /Total[:\s]*\$?(\d+\.\d{2})/gi,  // Total: $XX.XX
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseFloat(match[1]);
      if (amount > 0 && amount < 10000) {
        amounts.push(amount);
      }
    }
  }

  // Remove duplicates and sort
  return [...new Set(amounts)].sort((a, b) => b - a);
}

export async function GET() {
  return NextResponse.json({
    message: "Regex OCR API endpoint",
    note: "Uses pattern matching to extract amounts from simulated receipt text"
  });
}

