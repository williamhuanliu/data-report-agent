'use client';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated';
}

export function Card({
  variant = 'default',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-lg border border-border
        bg-surface
        ${variant === 'elevated' ? 'shadow-sm' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title?: string;
  description?: string;
  className?: string;
}

export function CardHeader({
  title,
  description,
  className = '',
}: CardHeaderProps) {
  return (
    <div className={`px-5 pt-5 pb-2 ${className}`}>
      {title && (
        <h3 className="text-base font-semibold text-foreground">
          {title}
        </h3>
      )}
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}

export function CardContent({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 ${className}`} {...props} />;
}
