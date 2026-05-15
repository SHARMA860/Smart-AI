import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { SmartAILogo } from './Logo';
import { Mail, ArrowRight, ShieldCheck, RefreshCcw } from 'lucide-react';

export function AuthScreen({ onComplete }: { onComplete: () => void }) {
  const { sendOtp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const code = await sendOtp(email);
      setMockOtp(code);
      setStep('otp');
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    setLoading(true);
    setError('');
    
    // In this demo, we check against the mockOtp we received
    if (code === mockOtp) {
      setTimeout(() => {
        onComplete();
      }, 1000);
    } else {
      setError('Invalid code. Please check and try again.');
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
          {step === 'email' ? (
            <motion.div
              key="email-step"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
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
                    {error.toLowerCase().includes('pop-up') && (
                      <p className="text-white/40 text-[10px] text-center mt-2 leading-tight">
                        Tip: If you're using a mobile browser, look for a "Pop-up blocked" message in the address bar and tap "Always allow".
                      </p>
                    )}
                  </div>
                )}

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-4 text-white/20 text-[10px] uppercase tracking-widest font-bold">Alternative</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-white/40 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-white placeholder:text-white/20 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-white/5 border border-white/10 text-white/60 font-medium py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 text-sm"
                  >
                    {loading ? <RefreshCcw size={16} className="animate-spin" /> : <>Send OTP to Mail (Preview) <ArrowRight size={16} /></>}
                  </button>
                  <p className="text-[10px] text-white/20 text-center leading-relaxed px-4">
                    Note: Email OTP requires a production SMTP server. For instant real access, use Google Login above.
                  </p>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="otp-step"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
                  <ShieldCheck className="text-green-500" /> Verify Identity
                </h2>
                <p className="text-white/60 text-sm">We've sent a 6-digit code to <span className="text-white">{email}</span></p>
                <p className="text-[10px] text-white/20 font-mono">Authentication system active</p>
              </div>

              <div className="flex justify-between gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-xs text-center">{error}</p>}

              <button
                onClick={handleVerify}
                disabled={loading || otp.some(d => !d)}
                className="w-full bg-white text-black font-semibold py-4 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <button 
                onClick={() => setStep('email')}
                className="w-full text-white/40 text-sm hover:text-white transition-colors"
              >
                Back to email
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
