import { useState } from 'react';

export default function Tooltip({ content, children, position = 'top', className = '' }) {
  const [visible, setVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'top-1/2 -translate-y-1/2 left-full mr-2',
    left: 'top-1/2 -translate-y-1/2 right-full ml-2',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={`
            absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md
            shadow-md whitespace-nowrap pointer-events-none animate-fade-in
            ${positions[position]}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
}
