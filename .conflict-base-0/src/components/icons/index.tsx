import React from 'react';
import type { LucideProps } from 'lucide-react';

// Custom implementation of the Fingerprint icon that matches Lucide API
export function Fingerprint(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 13c0-2.96 2.172-5.444 5.02-5.901m6.034-.099A5.989 5.989 0 0 1 18 7a6 6 0 0 1 1 11.917M6 21v-2a4 4 0 0 1 4-4h1" />
      <path d="M15 21v-3.4c0-1.72 1.6-3.6 3-3.6m-9 2V9l.001-.028a2 2 0 1 1 3.995.028v4" />
      <path d="M12 14v1.5" />
    </svg>
  );
} 