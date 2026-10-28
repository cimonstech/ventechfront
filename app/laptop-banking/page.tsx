import LaptopBankingPage from './LaptopBankingClient';
import LaptopBankingProductionPage from './LaptopBankingProductionPage';
import { fetchPublicFeatures } from '@/lib/features';
import { fetchPublicPage } from '@/lib/publicContent';
import { fetchPublicVlbPlans } from '@/lib/vlb';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const flags = await fetchPublicFeatures();
  if (!flags.feature_vlb_v3_enabled) {
    return <LaptopBankingProductionPage />;
  }

  const [terms, plans] = await Promise.all([
    fetchPublicPage('laptop-banking-terms'),
    fetchPublicVlbPlans().catch(() => []),
  ]);
  return <LaptopBankingPage termsPublished={terms.state === 'published'} plans={plans} />;
}
