import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { SmartAILogo } from './Logo';
import { Mail, ArrowRight, ShieldCheck, RefreshCcw } from 'lucide-react';

export function AuthScreen({ onComplete }: { onComplete: () => void }) {
  const { sendLoginLink, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendLoginLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await sendLoginLink(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send login link. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,#000_100%)]">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex justify-center mb-12">
          <SmartAILogo size={100} />
        </div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="login-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Welcome</h2>
                <p className="text-white/60 text-sm">Sign in to your account securely.</p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 active:scale-[0.95] transition-all disabled:opacity-50 shadow-xl shadow-white/5"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Login with Google
                </button>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-500 text-xs text-center">{error}</p>
                    {(error.toLowerCase().includes('app wrapper') || error.toLowerCase().includes('disallowed')) && (
                      <p className="text-white/40 text-[10px] text-center mt-2 leading-tight">
                        Google prohibits login inside some mobile apps. Use the <strong>Email Login</strong> option below instead.
                      </p>
                    )}
                  </div>
                )}

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-4 text-white/20 text-[10px] uppercase tracking-widest font-bold">OR USE EMAIL LOGIN</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <form onSubmit={handleSendLoginLink} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-white/40 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-white placeholder:text-white/20 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-white text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? <RefreshCcw size={18} className="animate-spin" /> : <>Send Login Link <ArrowRight size={18} /></>}
                  </button>
                  <p className="text-[10px] text-white/20 text-center leading-relaxed px-4">
                    Email Login works everywhere, including mobile apps and mini-browsers.
                  </p>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sent-step"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-6 bg-white/5 border border-white/10 p-8 rounded-3xl"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={40} className="text-green-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Check your Email</h2>
                <p className="text-white/60 text-sm px-4">
                  We've sent a secure login link to <span className="text-white font-medium">{email}</span>.
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[11px] text-white/40 leading-relaxed">
                Click the link in your email to sign in instantly. You can close this window now or wait here.
              </div>
              <button 
                onClick={() => setSent(false)}
                className="text-white/40 text-xs hover:text-white transition-colors pt-4"
              >
                Use a different email
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="fixed bottom-8 text-[10px] tracking-widest text-white/20 uppercase">
        Securely powered by Smart AI Systems
      </div>
    </div>
  );
}
