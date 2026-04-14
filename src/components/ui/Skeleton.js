export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'animate-pulse bg-surface-alt rounded';
  const variants = {
    rect: '',
    circle: '!rounded-full',
    text: 'h-4',
  };
  return <div className={`${base} ${variants[variant]} ${className}`} />;
}

export function SkeletonRow({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
