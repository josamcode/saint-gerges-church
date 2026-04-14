export default function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
            ${checked ? '-translate-x-1' : '-translate-x-6'}
          `}
        />
      </button>
      {label && <span className="text-sm text-base">{label}</span>}
    </label>
  );
}
