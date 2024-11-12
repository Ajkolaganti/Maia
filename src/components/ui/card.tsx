import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`bg-glass-medium/95 backdrop-blur-xl border border-white/10 rounded-xl ${className}`}>
    {children}
  </div>
);

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', children }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className = '', children }) => (
  <h2 className={`text-2xl font-semibold ${className}`}>
    {children}
  </h2>
);

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className = '', children }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
); 