import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber, getActiveSubscribers } from '@/lib/firestore';

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

    // Add subscriber using Firestore
    const result = await addSubscriber(email, 'website');

    if (result.success) {
      console.log(`New subscriber: ${email}`);
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      );
    } else {
      const status = result.message.includes('already subscribed') ? 409 : 400;
      return NextResponse.json(
        { error: result.message },
        { status }
      );
    }
  } catch (error) {
    console.error('Error processing subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const activeSubscribers = await getActiveSubscribers();
    
    return NextResponse.json({
      total: activeSubscribers.length,
      subscribers: activeSubscribers.map(sub => ({
        email: sub.email,
        subscribedAt: sub.subscribedAt.toDate().toISOString()
      }))
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
