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

    // Check if Google Cloud Vision API key is available
    if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      return NextResponse.json(
        { error: "Google Cloud Vision API key not configured" },
        { status: 503 }
      );
    }

    console.log("Processing image with Google Cloud Vision API...");

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Google Cloud Vision API call
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API failed: ${response.status}`);
    }

    const visionData = await response.json();
    console.log("Google Vision response:", visionData);

    const extractedText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
    console.log("Extracted text:", extractedText);

    if (!extractedText) {
      throw new Error('No text detected in image');
    }

    // Extract amounts from the text using advanced patterns
    const extractedAmounts = extractAmountsFromText(extractedText);
    
    const result: OCRResult = {
      extractedText: extractedText,
      detectedAmounts: extractedAmounts,
      suggestedAmount: extractedAmounts.length > 0 ? Math.max(...extractedAmounts) : undefined,
      confidence: visionData.responses?.[0]?.fullTextAnnotation ? 0.95 : 0.3,
      language: 'eng'
    };

    console.log("Google Vision OCR completed:", result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Google Vision OCR error:", error);
    
    return NextResponse.json(
      { error: "Google Vision OCR processing failed" },
      { status: 500 }
    );
  }
}

function extractAmountsFromText(text: string): number[] {
  const amounts: number[] = [];
  
  // Advanced patterns for receipt text
  const patterns = [
    // Currency symbols: $12.34, €12.34, £12.34
    /[$€£¥₹]\s*(\d{1,4}(?:[,\s]?\d{3})*(?:[.,]\d{2})?)/g,
    // Total patterns
    /(?:total|sum|amount|subtotal|balance|due|pay)[\s:]*[$€£¥₹]?\s*(\d{1,4}(?:[,\s]?\d{3})*(?:[.,]\d{2}))/gi,
    // Price patterns on separate lines
    /(?:^|\n)\s*(\d{1,4}(?:[,\s]?\d{3})*[.,]\d{2})\s*(?:$|\n)/gm,
    // Item price patterns
    /\d+\s*x\s*[$€£¥₹]?\s*(\d{1,4}(?:[,\s]?\d{3})*(?:[.,]\d{2}))/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amountStr = match[1];
      
      // Normalize the amount string
      const normalizedAmount = amountStr
        .replace(/[\s,]/g, '') // Remove spaces and commas (thousand separators)
        .replace(/[,](\d{2})$/, '.$1'); // Replace comma with dot for decimal
      
      const amount = parseFloat(normalizedAmount);
      
      // Validate amount (reasonable range for receipts)
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        amounts.push(Math.round(amount * 100) / 100); // Round to 2 decimals
      }
    }
  }

  // Remove duplicates and sort by value (largest first)
  return [...new Set(amounts)].sort((a, b) => b - a);
}

export async function GET() {
  return NextResponse.json({
    message: "Google Cloud Vision OCR API endpoint",
    note: "Requires GOOGLE_CLOUD_VISION_API_KEY environment variable"
  });
}
