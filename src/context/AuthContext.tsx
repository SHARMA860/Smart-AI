import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  sendLoginLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log('[FIREBASE] Connection verified successfully.');
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('[FIREBASE] Please check your Firebase configuration or internet connection.');
        }
      }
    };
    testConnection();

    // Handle Email Link Sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            console.log('[AUTH] Email link sign-in successful');
          })
          .catch((error) => {
            console.error('[AUTH] Email link error:', error);
          });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: serverTimestamp(),
              settings: { theme: 'dark', accentColor: 'default' }
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('[AUTH] Initiating Google Sign-in...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Standard popup approach
      const result = await signInWithPopup(auth, provider);
      console.log('[AUTH] Sign-in successful:', result.user.email);
    } catch (error: any) {
      console.error('[AUTH] Google Sign-in Error:', error.code, error.message);
      
      // Handle the "Requested action is invalid" error which often relates to configuration or domain
      if (error.code === 'auth/invalid-auth-event' || error.message?.includes('requested action is invalid')) {
        throw new Error('Invalid Action: This usually happens if your Vercel domain is not added to "Authorized Domains" in Firebase Console, or if the login is blocked by your app wrapper.');
      }

      if (error.code === 'auth/popup-blocked') {
        throw new Error('Your browser or app blocked the login window. Please allow pop-ups.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error(`Domain "${window.location.hostname}" is not authorized. Please add it to your Firebase Console under Authentication > Settings.`);
      } else if (error.code === 'auth/disallowed-user-agent' || /wv|WebView/i.test(navigator.userAgent)) {
        throw new Error('Login blocked: Google does not allow logins inside "App Wrappers". Please open the link directly in Chrome or Safari browser.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Login window was closed.');
      }
      
      throw new Error(error.message || 'Login failed. Please check your internet and try again.');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const sendLoginLink = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
    } catch (error: any) {
      console.error('[AUTH] Login Link Error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email Link login is not enabled in Firebase. Go to Authentication > Sign-in method > Click Email/Password > Toggle "Email link (passwordless sign-in)" ON and Save.');
      }
      throw new Error(error.message || 'Failed to send login link.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, sendLoginLink, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
