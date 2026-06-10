import { useState, useEffect } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  signInWithPopup, GoogleAuthProvider, type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);
    const unsub = onAuthStateChanged(
      auth,
      u => { clearTimeout(timeout); setUser(u); setLoading(false); },
      err => { clearTimeout(timeout); console.error('Auth error:', err); setLoading(false); }
    );
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

  const logout = () => signOut(auth);

  return { user, loading, login, loginWithGoogle, logout };
}
