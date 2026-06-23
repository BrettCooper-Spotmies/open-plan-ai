import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

/** Renders the OpenPlan AI mark inline so its stroke inherits `currentColor` —
 *  same convention as the lucide-react icons it replaced (text-primary,
 *  text-primary-foreground, etc. all just work, in any theme). */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="OpenPlan AI"
    >
      <path d="M64.1499 10.9C62.8471 10.3058 61.4318 9.99823 59.9999 9.99823C58.5679 9.99823 57.1527 10.3058 55.8499 10.9L12.9999 30.4C12.1126 30.7912 11.3583 31.432 10.8287 32.2443C10.2991 33.0566 10.0172 34.0053 10.0172 34.975C10.0172 35.9447 10.2991 36.8934 10.8287 37.7057C11.3583 38.518 12.1126 39.1588 12.9999 39.55L55.8999 59.1C57.2027 59.6943 58.6179 60.0018 60.0499 60.0018C61.4818 60.0018 62.8971 59.6943 64.1999 59.1L107.1 39.6C107.987 39.2088 108.741 38.568 109.271 37.7557C109.801 36.9434 110.083 35.9947 110.083 35.025C110.083 34.0553 109.801 33.1066 109.271 32.2943C108.741 31.482 107.987 30.8412 107.1 30.45L64.1499 10.9Z" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M110 88.25L64.1499 109.05C62.8471 109.644 61.4319 109.952 59.9999 109.952C58.568 109.952 57.1528 109.644 55.8499 109.05L9.99994 88.25" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M110 63.25L64.1499 84.05C62.8471 84.6443 61.4319 84.9518 59.9999 84.9518C58.568 84.9518 57.1528 84.6443 55.8499 84.05L9.99994 63.25" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
