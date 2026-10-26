import LaptopBankingPage from './LaptopBankingClient';
import { fetchPublicPage } from '@/lib/publicContent';

export default async function Page() {
  const terms = await fetchPublicPage('laptop-banking-terms');
  return <LaptopBankingPage termsPublished={terms.state === 'published'} />;
}
