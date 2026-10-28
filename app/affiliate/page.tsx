import AffiliateProductionPage from './AffiliateProductionPage';
import AffiliateProgramPage from './AffiliateProgramPage';
import { fetchPublicFeatures } from '@/lib/features';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const flags = await fetchPublicFeatures();
  if (flags.feature_affiliates_enabled) {
    return <AffiliateProgramPage />;
  }
  return <AffiliateProductionPage />;
}
