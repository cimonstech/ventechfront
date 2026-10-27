import LaptopBankingPage from './LaptopBankingClient';
import { fetchPublicPage } from '@/lib/publicContent';
import { fetchPublicVlbPlans } from '@/lib/vlb';

export default async function Page() {
  const [terms, plans] = await Promise.all([
    fetchPublicPage('laptop-banking-terms'),
    fetchPublicVlbPlans().catch(() => []),
  ]);
  return <LaptopBankingPage termsPublished={terms.state === 'published'} plans={plans} />;
}
