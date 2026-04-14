const variantStyles = {
  default: 'bg-surface-alt/70 text-base border-border/45',
  primary: 'bg-primary/10 text-primary border-primary/15',
  success: 'bg-success-light text-success border-success/15',
  danger: 'bg-danger-light text-danger border-danger/15',
  warning: 'bg-warning-light text-warning border-warning/15',
  secondary: 'bg-secondary/10 text-secondary border-secondary/15',
};

export default function Badge({ children, variant = 'default', removable, onRemove, className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${variantStyles[variant]} ${className}
      `}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="mr-1 hover:opacity-70 transition-opacity"
          aria-label="إزالة"
        >
          &times;
        </button>
      )}
    </span>
  );
}
