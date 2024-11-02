import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Header = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end items-center gap-4 mb-8"
    >
      <button className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors relative">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
      </button>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </motion.header>
  );
};

export default Header;