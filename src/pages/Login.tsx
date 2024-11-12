import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Building2, UserCircle, Loader } from 'lucide-react';
import { auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import Modal from '../components/shared/Modal';
import Logo from '../components/shared/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Navigation will be handled by the auth state change in App.tsx
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setResetLoading(true);
      // Configure actionCodeSettings for password reset
      const actionCodeSettings = {
        url: `${window.location.origin}/login`, // Redirect back to login page after reset
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      
      toast.success('Password reset email sent! Please check your inbox and spam folder.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      let errorMessage = 'Failed to send reset email';
      
      // Handle specific Firebase error codes
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later';
          break;
        default:
          errorMessage = error.message || 'Failed to send reset email';
      }
      
      toast.error(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="backdrop-blur-lg bg-glass-medium rounded-2xl p-8 shadow-xl border border-glass-light">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm text-white/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-glass-light rounded-lg text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-white/70">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-glass-light rounded-lg text-white"
                required
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setResetEmail(email); // Pre-fill with login email if available
                setShowForgotPassword(true);
              }}
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Forgot Password?
            </button>

            <button
              type="submit"
              className="w-full btn-primary py-3"
              disabled={loading}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        title="Reset Password"
      >
        <form onSubmit={handleForgotPassword} className="space-y-6">
          <p className="text-white/70">
            Enter your email address and we'll send you instructions to reset your password.
            Please check both your inbox and spam folder.
          </p>

          <div>
            <label className="block text-sm text-white/70 mb-2">Email Address</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="input-field"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="px-4 py-2 bg-glass-light rounded-lg hover:bg-glass-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={resetLoading}
            >
              {resetLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Login;