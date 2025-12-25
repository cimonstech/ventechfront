import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affiliate Program - Join & Earn | VENTECH Gadgets',
  description: 'Join the VENTECH Gadgets Affiliate Program. Earn competitive commissions by promoting smartphones, accessories, and the latest tech gadgets. Open to affiliates worldwide.',
  keywords: 'affiliate program, earn money, tech gadgets, commission, referral program, VENTECH',
};

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

