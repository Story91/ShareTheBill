import { NextRequest, NextResponse } from "next/server";
import { OCRResult } from "@/lib/types";

// Simple OCR endpoint that always works (for demo purposes)
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

    console.log("Processing image with simple OCR...");

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock amounts based on file name or random
    const mockAmounts = generateMockAmounts(file.name);
    
    // Generate realistic receipt text
    const receiptText = generateReceiptText(mockAmounts, file.name);
    
    const result: OCRResult = {
      extractedText: receiptText,
      detectedAmounts: mockAmounts,
      suggestedAmount: mockAmounts.length > 0 ? Math.max(...mockAmounts) : undefined,
      confidence: 0.85,
      language: 'eng'
    };

    console.log("Simple OCR completed:", result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Simple OCR error:", error);
    
    // Always return a successful response for demo
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

function generateMockAmounts(fileName: string): number[] {
  // Try to extract numbers from filename first
  const numberPattern = /(\d+(?:\.\d{2})?)/g;
  const matches = fileName.match(numberPattern);
  
  if (matches) {
    const amounts = matches.map(match => parseFloat(match)).filter(num => num > 0 && num < 10000);
    if (amounts.length > 0) {
      return amounts;
    }
  }
  
  // Fallback to random amounts
  const possibleAmounts = [
    [15.99, 2.50, 18.49], // Restaurant bill
    [45.67], // Single item
    [12.50, 8.25, 3.75, 24.50], // Multiple items
    [89.99], // Expensive item
    [7.99, 12.99, 5.49, 26.47], // Grocery items
  ];
  
  const randomIndex = Math.floor(Math.random() * possibleAmounts.length);
  return possibleAmounts[randomIndex];
}

function generateReceiptText(amounts: number[], fileName: string): string {
  const restaurantNames = [
    "Mario's Pizza", "Green Café", "City Bistro", "The Local Diner", "Fresh Market"
  ];
  const items = [
    "Margherita Pizza", "Caesar Salad", "Grilled Chicken", "Coffee", "Pasta", 
    "Burger", "French Fries", "Soda", "Dessert", "Soup"
  ];
  
  const restaurant = restaurantNames[Math.floor(Math.random() * restaurantNames.length)];
  let receipt = `${restaurant.toUpperCase()}\n`;
  receipt += `Date: ${new Date().toLocaleDateString()}\n`;
  receipt += `Time: ${new Date().toLocaleTimeString()}\n\n`;
  
  // Add items with amounts
  amounts.slice(0, -1).forEach((amount, index) => {
    const item = items[index % items.length];
    receipt += `${item}: $${amount.toFixed(2)}\n`;
  });
  
  if (amounts.length > 1) {
    const subtotal = amounts.slice(0, -1).reduce((sum, amt) => sum + amt, 0);
    const total = amounts[amounts.length - 1];
    const tax = total - subtotal;
    
    receipt += `\nSubtotal: $${subtotal.toFixed(2)}\n`;
    if (tax > 0) {
      receipt += `Tax: $${tax.toFixed(2)}\n`;
    }
    receipt += `TOTAL: $${total.toFixed(2)}\n`;
  } else {
    receipt += `\nTOTAL: $${amounts[0].toFixed(2)}\n`;
  }
  
  receipt += `\nThank you for your visit!`;
  return receipt;
}

export async function GET() {
  return NextResponse.json({
    message: "Simple OCR API endpoint (demo)",
    note: "This endpoint generates mock data for demonstration purposes"
  });
}
