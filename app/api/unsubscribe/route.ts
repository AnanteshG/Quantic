import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByEmail, unsubscribeByToken } from '@/lib/firestore';

// POST /api/unsubscribe - Unsubscribe by email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Unsubscribe using Firestore
    const result = await unsubscribeByEmail(email);

    if (result.success) {
      console.log(`Unsubscribed: ${email}`);
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      );
    } else {
      const status = result.message.includes('not found') ? 404 : 
                    result.message.includes('already unsubscribed') ? 409 : 400;
      return NextResponse.json(
        { error: result.message },
        { status }
      );
    }
  } catch (error) {
    console.error('Error processing unsubscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/unsubscribe?token=xxx&email=xxx - Unsubscribe via token (for email links)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing token or email parameter' },
        { status: 400 }
      );
    }

    // Unsubscribe using token and Firestore
    const result = await unsubscribeByToken(email, token);

    if (result.success) {
      console.log(`Unsubscribed via token: ${email}`);
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      );
    } else {
      const status = result.message.includes('Invalid token') ? 403 :
                    result.message.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { error: result.message },
        { status }
      );
    }
  } catch (error) {
    console.error('Error processing unsubscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
