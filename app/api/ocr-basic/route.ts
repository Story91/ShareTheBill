import { NextRequest, NextResponse } from "next/server";
import { OCRResult } from "@/lib/types";

// Basic OCR endpoint that tries to extract numbers from image
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

    console.log("Processing image with basic OCR...");

    // For now, let's create a simple pattern matcher
    // In a real implementation, you'd use a proper OCR library
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to extract numbers from filename or create a simple pattern
    const fileName = file.name.toLowerCase();
    const extractedAmounts: number[] = [];
    
    // Look for common patterns in filename
    const numberPattern = /(\d+(?:\.\d{2})?)/g;
    const matches = fileName.match(numberPattern);
    
    if (matches) {
      matches.forEach(match => {
        const num = parseFloat(match);
        if (num > 0 && num < 10000) { // Reasonable range for receipts
          extractedAmounts.push(num);
        }
      });
    }

    // If no numbers found in filename, try some common receipt amounts
    if (extractedAmounts.length === 0) {
      // You could add more sophisticated logic here
      // For now, let's just return empty and let user enter manually
    }

    const result: OCRResult = {
      extractedText: `Image processed: ${file.name}`,
      detectedAmounts: extractedAmounts,
      suggestedAmount: extractedAmounts.length > 0 ? Math.max(...extractedAmounts) : undefined,
      confidence: extractedAmounts.length > 0 ? 0.7 : 0,
      language: 'eng'
    };

    console.log("Basic OCR completed:", result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Basic OCR error:", error);
    
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

export async function GET() {
  return NextResponse.json({
    message: "Basic OCR API endpoint",
    note: "Extracts numbers from image filename as a simple demo"
  });
}

