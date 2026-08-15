import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const classes = [
    'btn-base',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
