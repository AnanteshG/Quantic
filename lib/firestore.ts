// Firestore utilities for QuanticDaily newsletter
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import crypto from 'crypto';

export interface Subscriber {
  email: string;
  subscribedAt: Timestamp;
  active: boolean;
  unsubscribeToken: string;
  source?: string; // Optional: track where they subscribed from
}

const COLLECTION_NAME = 'quantic-emails';

// Generate unsubscribe token
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'development-secret-key';
  return crypto.createHash('sha256').update(email + secret).digest('hex');
}

// Add a new subscriber
export async function addSubscriber(email: string, source: string = 'website'): Promise<{ success: boolean; message: string; subscriber?: Subscriber }> {
  try {
    // Check if email already exists
    const existingSubscriber = await getSubscriberByEmail(email);
    
    if (existingSubscriber) {
      if (existingSubscriber.active) {
        return {
          success: false,
          message: 'This email is already subscribed'
        };
      } else {
        // Reactivate existing subscriber
        const updatedSubscriber: any = {
          active: true,
          subscribed: true, // Add for newsletter automation compatibility
          subscribedAt: Timestamp.now(),
          unsubscribeToken: generateUnsubscribeToken(email)
        };
        
        await updateDoc(doc(db, COLLECTION_NAME, existingSubscriber.id), updatedSubscriber);
        
        return {
          success: true,
          message: 'Successfully resubscribed to QuanticDaily!',
          subscriber: { ...existingSubscriber, ...updatedSubscriber } as Subscriber
        };
      }
    }
    
    // Add new subscriber
    const newSubscriber: any = {
      email,
      subscribedAt: Timestamp.now(),
      active: true,
      subscribed: true, // Add for newsletter automation compatibility
      unsubscribeToken: generateUnsubscribeToken(email),
      source
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newSubscriber);
    
    return {
      success: true,
      message: 'Successfully subscribed to QuanticDaily!',
      subscriber: { ...newSubscriber, id: docRef.id } as Subscriber & { id: string }
    };
    
  } catch (error) {
    console.error('Error adding subscriber:', error);
    return {
      success: false,
      message: 'Failed to subscribe. Please try again.'
    };
  }
}

// Get subscriber by email
export async function getSubscriberByEmail(email: string): Promise<(Subscriber & { id: string }) | null> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Subscriber & { id: string };
    
  } catch (error) {
    console.error('Error getting subscriber:', error);
    return null;
  }
}

// Unsubscribe a user by email
export async function unsubscribeByEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const subscriber = await getSubscriberByEmail(email);
    
    if (!subscriber) {
      return {
        success: false,
        message: 'Email address not found in our subscriber list'
      };
    }
    
    if (!subscriber.active) {
      return {
        success: false,
        message: 'This email is already unsubscribed'
      };
    }
    
    // Update subscriber to inactive
    await updateDoc(doc(db, COLLECTION_NAME, subscriber.id), {
      active: false,
      unsubscribedAt: Timestamp.now()
    });
    
    return {
      success: true,
      message: 'Successfully unsubscribed from QuanticDaily!'
    };
    
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return {
      success: false,
      message: 'Failed to unsubscribe. Please try again.'
    };
  }
}

// Unsubscribe using token
export async function unsubscribeByToken(email: string, token: string): Promise<{ success: boolean; message: string }> {
  try {
    // Verify token
    const expectedToken = generateUnsubscribeToken(email);
    if (token !== expectedToken) {
      return {
        success: false,
        message: 'Invalid unsubscribe token'
      };
    }
    
    const subscriber = await getSubscriberByEmail(email);
    
    if (!subscriber) {
      return {
        success: false,
        message: 'Email address not found in our subscriber list'
      };
    }
    
    if (!subscriber.active) {
      return {
        success: true,
        message: 'This email is already unsubscribed'
      };
    }
    
    // Update subscriber to inactive
    await updateDoc(doc(db, COLLECTION_NAME, subscriber.id), {
      active: false,
      unsubscribedAt: Timestamp.now()
    });
    
    return {
      success: true,
      message: 'Successfully unsubscribed from QuanticDaily!'
    };
    
  } catch (error) {
    console.error('Error unsubscribing with token:', error);
    return {
      success: false,
      message: 'Failed to unsubscribe. Please try again.'
    };
  }
}

// Get all active subscribers
export async function getActiveSubscribers(): Promise<Subscriber[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('active', '==', true));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data()
    } as Subscriber));
    
  } catch (error) {
    console.error('Error getting active subscribers:', error);
    return [];
  }
}

// Get subscriber stats
export async function getSubscriberStats(): Promise<{ total: number; active: number; inactive: number }> {
  try {
    const allQuery = query(collection(db, COLLECTION_NAME));
    const activeQuery = query(collection(db, COLLECTION_NAME), where('active', '==', true));
    
    const [allSnapshot, activeSnapshot] = await Promise.all([
      getDocs(allQuery),
      getDocs(activeQuery)
    ]);
    
    const total = allSnapshot.size;
    const active = activeSnapshot.size;
    const inactive = total - active;
    
    return { total, active, inactive };
    
  } catch (error) {
    console.error('Error getting subscriber stats:', error);
    return { total: 0, active: 0, inactive: 0 };
  }
}
