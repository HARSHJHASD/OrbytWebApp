import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  fullWidth = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-2xl font-bold tracking-wide transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variants = {
    primary: "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:brightness-110 border border-primary-500/50",
    secondary: "bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 shadow-lg shadow-black/20",
    outline: "border-2 border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white",
    ghost: "text-slate-400 hover:bg-slate-800/50 hover:text-white",
  };

  const sizes = "h-14 px-6 text-base"; 
  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes} ${width} ${className} relative`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="absolute w-5 h-5 animate-spin" />}
      <span className={`flex items-center justify-center ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
    </button>
  );
};

export default Button;