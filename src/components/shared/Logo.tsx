import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const { theme } = useTheme();

  const sizeClasses = {
    sm: 'h-8 text-lg',
    md: 'h-10 text-xl',
    lg: 'h-12 text-2xl'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <motion.div 
      className="flex items-center gap-3"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className={`relative ${sizeClasses[size]} aspect-square`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer ring with gradient and glow */}
        <motion.div 
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 logo-shadow"
          animate={{ 
            rotate: 360,
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        
        {/* Inner circle with glass effect */}
        <div className="absolute inset-1 rounded-lg backdrop-blur-sm bg-black/30" />
        
        {/* Clock icon with animation */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <Clock className={`${iconSizes[size]} text-white transform -rotate-45`} />
        </motion.div>

        {/* Decorative elements */}
        <motion.div 
          className="absolute inset-0 rounded-xl border border-white/20"
          animate={{ 
            boxShadow: ['0 0 0 0 rgba(14, 165, 233, 0)', '0 0 20px 2px rgba(14, 165, 233, 0.3)', '0 0 0 0 rgba(14, 165, 233, 0)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {showText && (
        <motion.div 
          className="flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.span 
            className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent`}
            whileHover={{ scale: 1.12 }}
          >
            MIKA
            <span className="text-primary-400 font-bold bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent">DO</span>
          </motion.span>
          <span className="text-xs text-white/50 tracking-wider">WORKFORCE MANAGEMENT</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Logo;