import { NextRequest, NextResponse } from "next/server";
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

    console.log("Processing image with OCR.space API...");

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // OCR.space API call
    const ocrFormData = new FormData();
    ocrFormData.append('base64Image', `data:${file.type};base64,${base64}`);
    ocrFormData.append('apikey', process.env.OCR_SPACE_API_KEY || 'helloworld'); // Free tier key
    ocrFormData.append('language', 'eng');
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('OCREngine', '2'); // Better for receipts

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: ocrFormData
    });

    if (!response.ok) {
      throw new Error(`OCR API failed: ${response.status}`);
    }

    const ocrData = await response.json();
    console.log("OCR.space response:", ocrData);

    if (ocrData.IsErroredOnProcessing) {
      throw new Error(ocrData.ErrorMessage || 'OCR processing failed');
    }

    const extractedText = ocrData.ParsedResults?.[0]?.ParsedText || '';
    console.log("Extracted text:", extractedText);

    // Extract amounts from the text
    const extractedAmounts = extractAmountsFromText(extractedText);
    
    const result: OCRResult = {
      extractedText: extractedText,
      detectedAmounts: extractedAmounts,
      suggestedAmount: extractedAmounts.length > 0 ? Math.max(...extractedAmounts) : undefined,
      confidence: ocrData.ParsedResults?.[0]?.TextOverlay?.HasResults ? 0.8 : 0.3,
      language: 'eng'
    };

    console.log("Real OCR completed:", result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Real OCR error:", error);
    
    // Fallback to simple OCR if real OCR fails
    return NextResponse.json(
      { error: "OCR processing failed, please try again or enter amount manually" },
      { status: 500 }
    );
  }
}

function extractAmountsFromText(text: string): number[] {
  const amounts: number[] = [];
  
  // Common patterns for money amounts
  const patterns = [
    // $12.34, $12,34, $12.3, $12
    /\$\s*(\d{1,4}(?:[,.]?\d{2,3})*(?:[.,]\d{2})?)/g,
    // 12.34, 12,34 (without currency symbol)
    /(?:^|\s)(\d{1,4}(?:[,.]?\d{2,3})*[.,]\d{2})(?:\s|$)/g,
    // Total: 12.34, TOTAL 12.34
    /(?:total|sum|amount|price)[\s:]*\$?\s*(\d{1,4}(?:[,.]?\d{2,3})*(?:[.,]\d{2})?)/gi,
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
        amounts.push(Math.round(amount * 100) / 100); // Round to 2 decimals
      }
    }
  }

  // Remove duplicates and sort
  return [...new Set(amounts)].sort((a, b) => b - a);
}

export async function GET() {
  return NextResponse.json({
    message: "Real OCR API endpoint using OCR.space",
    note: "Processes actual images and extracts real text"
  });
}
