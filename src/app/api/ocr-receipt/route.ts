import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('receipt') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Call OpenAI GPT-4 Vision API
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this receipt image and extract the following information in JSON format:
                {
                  "vendor": "merchant/vendor name",
                  "subtotal": "subtotal amount before tax as a number (no currency symbols)",
                  "tax_amount": "tax amount as a number (no currency symbols), use 0 if no tax shown",
                  "tax_rate": "tax rate as a percentage number if shown (e.g., 8.25), otherwise null",
                  "amount": "total amount including tax as a number (no currency symbols)",
                  "date": "date in YYYY-MM-DD format",
                  "description": "brief description of purchase",
                  "items": ["list of purchased items if visible"],
                  "payment_method": "payment method if visible (credit, debit, cash, etc.), otherwise null"
                }

                If any field is not clearly visible, use null. Be precise with the amounts and date.
                The subtotal should be the amount before tax, and amount should be the final total.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to process receipt with AI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Could not parse receipt data' },
        { status: 500 }
      );
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: extractedData,
    });

  } catch (error: any) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process receipt' },
      { status: 500 }
    );
  }
}
