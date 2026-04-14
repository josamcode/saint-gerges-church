import { forwardRef } from 'react';
import { Loader } from 'lucide-react';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
  secondary: 'bg-secondary text-white hover:opacity-90 focus:ring-secondary',
  outline: 'border border-border bg-transparent text-base hover:bg-surface-alt focus:ring-primary',
  ghost: 'bg-transparent text-base hover:bg-surface-alt focus:ring-primary',
  destructive: 'bg-danger text-white hover:opacity-90 focus:ring-danger',
  success: 'bg-success text-white hover:opacity-90 focus:ring-success',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon: Icon,
      iconPosition = 'start',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 rounded-md font-medium
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-60 disabled:cursor-not-allowed
          ${variants[variant]} ${sizes[size]} ${className}
        `}
        {...props}
      >
        {loading && <Loader className="w-4 h-4 animate-spin" />}
        {!loading && Icon && iconPosition === 'start' && <Icon className="w-4 h-4" />}
        {children}
        {!loading && Icon && iconPosition === 'end' && <Icon className="w-4 h-4" />}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
