import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: if Firebase never calls back, stop loading after 8s
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

  const logout = () => signOut(auth);

  return { user, loading, login, logout };
}
