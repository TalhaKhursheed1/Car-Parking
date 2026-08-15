'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', style, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label style={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.95)',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            letterSpacing: '0.025em',
          }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={className}
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(4px)',
            border: error ? '1px solid rgba(248, 113, 113, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'all 0.3s ease',
            ...style,
          }}
          onFocus={(e) => {
            if (error) {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(248, 113, 113, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 1)';
            } else {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = error ? 'rgba(248, 113, 113, 0.6)' : 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          {...props}
        />
        {error && (
          <p style={{
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            color: '#fecaca',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <AlertCircle className="inline-block h-4 w-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
