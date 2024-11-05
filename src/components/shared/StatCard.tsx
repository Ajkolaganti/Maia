import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  link?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  prefix,
  suffix,
  loading,
  link,
  onClick
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (link) {
      navigate(link);
    }
  };

  return (
    <motion.div
      whileHover={link || onClick ? { scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' } : {}}
      whileTap={link || onClick ? { scale: 0.98 } : {}}
      onClick={handleClick}
      className={`glass-card p-6 ${(link || onClick) ? 'cursor-pointer transition-colors duration-200' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary-500/10 rounded-lg">
          <Icon className="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h3 className="text-sm text-white/70">{title}</h3>
          {loading ? (
            <div className="h-8 w-24 bg-glass-light animate-pulse rounded mt-1" />
          ) : (
            <p className="text-2xl font-semibold">
              {prefix}{value.toLocaleString()}{suffix}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;