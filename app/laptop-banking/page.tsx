import type { Metadata } from 'next';
import LaptopBankingPage from './LaptopBankingClient';
import { generatePageMetadata } from '@/lib/seo.utils';
import { fetchPublicVlbPlans } from '@/lib/vlb';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = generatePageMetadata('laptopBanking');

export default async function Page() {
  const plans = await fetchPublicVlbPlans().catch(() => []);
  return <LaptopBankingPage plans={plans} />;
}
