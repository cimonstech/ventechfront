import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 40,
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 size={sizeMap[size]} className="animate-spin text-blue-600" />
    </div>
  );
};



