"use server";

import { NextRequest, NextResponse } from "next/server";
import { OCRResult } from "@/lib/types";

// Import for Google Vision (will be conditionally used)
let ImageAnnotatorClient: any = null;
try {
  const { ImageAnnotatorClient: Client } = require('@google-cloud/vision');
  ImageAnnotatorClient = Client;
} catch (error) {
  console.log('Google Vision not available, using fallback methods');
}

// Import for Tesseract.js
let Tesseract: any = null;
try {
  Tesseract = require('tesseract.js');
} catch (error) {
  console.log('Tesseract.js not available');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    console.log("Processing image with advanced OCR...");

    const imageBuffer = Buffer.from(await file.arrayBuffer());
    
    // Try multiple OCR methods in order of preference
    let result: OCRResult | null = null;

    // Method 1: Google Vision API (most accurate)
    if (process.env.GOOGLE_CLOUD_PROJECT_ID && ImageAnnotatorClient) {
      console.log("Attempting Google Vision API...");
      try {
        result = await processWithGoogleVision(imageBuffer);
        console.log("✅ Google Vision OCR successful");
      } catch (error) {
        console.log("❌ Google Vision failed:", error.message);
      }
    } else {
      console.log("⏭️ Google Vision API not configured, skipping...");
    }

    // Method 2: Optimized Tesseract.js (fallback)
    if (!result && Tesseract) {
      console.log("Attempting optimized Tesseract.js...");
      try {
        result = await processWithOptimizedTesseract(imageBuffer);
        console.log("✅ Optimized Tesseract OCR successful");
      } catch (error) {
        console.log("❌ Tesseract failed:", error.message);
      }
    } else if (!result) {
      console.log("⏭️ Tesseract.js not available, skipping...");
    }

    // If no method worked, return error
    if (!result) {
      return NextResponse.json(
        { error: "OCR processing failed - no working methods available" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Advanced OCR error:", error);
    
    const fallbackResult: OCRResult = {
      extractedText: "OCR processing failed",
      detectedAmounts: [],
      suggestedAmount: undefined,
      confidence: 0,
      language: "eng",
    };

    return NextResponse.json(fallbackResult);
  }
}

async function processWithGoogleVision(imageBuffer: Buffer): Promise<OCRResult> {
  if (!ImageAnnotatorClient) {
    throw new Error("Google Vision client not available");
  }

  // Configure client based on available environment variables
  let clientConfig: any = {};
  
  if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    clientConfig.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  }
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    clientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  } else if (process.env.GOOGLE_CLOUD_KEY_JSON) {
    try {
      clientConfig.credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON);
    } catch (error) {
      console.error("Failed to parse GOOGLE_CLOUD_KEY_JSON:", error);
      throw new Error("Invalid Google Cloud credentials JSON");
    }
  }

  const client = new ImageAnnotatorClient(clientConfig);

  const [result] = await client.textDetection({
    image: { content: imageBuffer },
  });

  const detections = result.textAnnotations;
  const extractedText = detections && detections[0] ? detections[0].description : "";

  // Extract amounts from the text
  const amounts = extractAmountsFromText(extractedText || "");
  
  return {
    extractedText: extractedText || "",
    detectedAmounts: amounts,
    suggestedAmount: amounts.length > 0 ? Math.max(...amounts) : undefined,
    confidence: 0.95, // Google Vision typically has high confidence
    language: "eng",
  };
}

async function processWithOptimizedTesseract(imageBuffer: Buffer): Promise<OCRResult> {
  if (!Tesseract) {
    throw new Error("Tesseract not available");
  }

  // Optimized Tesseract configuration for numbers and receipts
  const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
    tessedit_char_whitelist: '0123456789.,$ \n\r\t', // Only digits, decimal points, dollar signs, and whitespace
    tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD, // Automatic page segmentation with orientation detection
    preserve_interword_spaces: '1',
  });

  const extractedText = data.text;
  const amounts = extractAmountsFromText(extractedText);

  return {
    extractedText,
    detectedAmounts: amounts,
    suggestedAmount: amounts.length > 0 ? Math.max(...amounts) : undefined,
    confidence: data.confidence / 100, // Convert to 0-1 scale
    language: "eng",
  };
}

function extractAmountsFromText(text: string): number[] {
  if (!text) return [];

  // Multiple regex patterns to catch different amount formats
  const patterns = [
    /\$\s*(\d+(?:\.\d{1,2})?)/g, // $XX.XX format
    /(\d+\.\d{2})\s*\$?/g, // XX.XX format (with optional $)
    /(\d+,\d{2})/g, // European format XX,XX
    /(?:^|\s)(\d{1,4}(?:\.\d{2})?)\s*(?=\s|$)/gm, // Standalone numbers that look like amounts
  ];

  const amounts: number[] = [];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amountStr = match[1].replace(',', '.'); // Handle European decimals
      const amount = parseFloat(amountStr);
      
      // Filter reasonable amounts (between $0.01 and $9999.99)
      if (amount >= 0.01 && amount <= 9999.99) {
        amounts.push(amount);
      }
    }
  });

  // Remove duplicates and sort
  const uniqueAmounts = [...new Set(amounts)].sort((a, b) => a - b);
  
  return uniqueAmounts;
}


export async function GET() {
  return NextResponse.json({
    message: "Advanced OCR API endpoint",
    methods: ["Google Vision API", "Optimized Tesseract.js"],
    note: "Uses multiple OCR methods with fallbacks for best accuracy",
  });
}
