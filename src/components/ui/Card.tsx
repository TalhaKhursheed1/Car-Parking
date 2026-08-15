'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
  id?: string;
}

export default function Card({
  children,
  className = '',
  hover = false,
  style = {},
  id,
}: CardProps) {
  
  const baseClasses = `glass-card p-6 ${hover ? 'transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer hover:border-primary/50' : ''} ${className}`;

  return (
    <div
      id={id}
      className={baseClasses}
      style={style}
    >
      {/* Top subtle border highlight for depth */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0) 100%)',
        opacity: 0.8,
        borderTopLeftRadius: '1rem',
        borderTopRightRadius: '1rem',
      }} />
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
