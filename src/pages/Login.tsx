import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, UserCircle } from 'lucide-react';

const Login = () => {
  const [userType, setUserType] = useState<'employer' | 'employee' | null>(null);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userType) {
      navigate(`/${userType}/dashboard`);
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
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-bold text-white text-center mb-8"
          >
            Welcome to EMS
          </motion.h1>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setUserType('employer')}
                className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
                  userType === 'employer'
                    ? 'bg-primary-600 text-white'
                    : 'bg-glass-light text-white/80 hover:bg-glass-medium'
                }`}
              >
                <Building2 className="w-8 h-8" />
                <span>Employer</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setUserType('employee')}
                className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
                  userType === 'employee'
                    ? 'bg-primary-600 text-white'
                    : 'bg-glass-light text-white/80 hover:bg-glass-medium'
                }`}
              >
                <UserCircle className="w-8 h-8" />
                <span>Employee</span>
              </motion.button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-xl bg-glass-light text-white placeholder-white/50 border border-glass-light focus:outline-none focus:border-primary-400"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-xl bg-glass-light text-white placeholder-white/50 border border-glass-light focus:outline-none focus:border-primary-400"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-500 transition-colors"
              >
                Login
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;