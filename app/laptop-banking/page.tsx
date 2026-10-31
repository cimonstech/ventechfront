import type { Metadata } from 'next';
import LaptopBankingPage from './LaptopBankingClient';
import { generatePageMetadata } from '@/lib/seo.utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = generatePageMetadata('laptopBanking');

export default async function Page() {
  return <LaptopBankingPage />;
}
