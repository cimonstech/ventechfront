'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function JoinNowButton({
  className,
  showIcon = true,
}: {
  className: string;
  showIcon?: boolean;
}) {
  return (
    <Link href="/affiliate/join" className={className}>
      Join Now
      {showIcon ? <ArrowRight className="w-[18px] h-[18px] md:w-5 md:h-5" /> : null}
    </Link>
  );
}
