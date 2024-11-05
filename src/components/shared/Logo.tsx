import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import logoImage from '../../assets/ximble-logo.png'; // Make sure to add your logo image to assets folder

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const { theme } = useTheme();

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  return (
    <div className="flex items-center justify-center">
      <img 
        src={logoImage} 
        alt="XIMBLE" 
        className={`${sizeClasses[size]} object-contain ${
          theme === 'dark' ? 'brightness-100' : 'brightness-90'
        }`}
      />
    </div>
  );
};

export default Logo; 