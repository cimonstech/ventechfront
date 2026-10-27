import Image from 'next/image';
import Link from 'next/link';
import { Laptop, TrendingUp, Target, FileText, Share2, DollarSign, FolderOpen } from 'lucide-react';
import { JoinNowButton } from '@/components/affiliate/JoinNowButton';
import { fetchPublicAffiliateInfo, formatGhs, payoutMethodLabel } from '@/lib/affiliates';

export default async function AffiliatePage() {
  const info = await fetchPublicAffiliateInfo();
  const fee = info ? formatGhs(info.fee_pesewas) : null;
  const commission = info ? formatGhs(info.commission_pesewas) : null;
  const categories = info?.eligible_category_names?.filter(Boolean) || [];
  const minWithdrawal = info ? formatGhs(info.min_withdrawal_pesewas) : null;
  const payouts = (info?.payout_methods || ['momo', 'bank']).map(payoutMethodLabel);
  const payoutList = payouts.join(' or ');
  const categoryList = categories.length ? categories.join(', ') : 'selected product categories';

  const joinClass =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 text-lg px-6 py-3';

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-b from-[#FF7A19] via-[#FF8C3A] to-[#D2691E] text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/affiliate-.webp"
            alt="VENTECH Affiliate Program"
            fill
            className="object-cover opacity-30"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF7A19]/90 via-[#FF8C3A]/85 to-[#D2691E]/90"></div>
        </div>
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          ></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl md:max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 md:px-4 py-2 mb-6">
              <Laptop className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              <span className="text-xs md:text-sm font-semibold">Partner with VENTECH</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
              Crush It as a Ventech Gadgets Affiliate
            </h1>

            <p className="text-lg md:text-xl mb-8 leading-relaxed drop-shadow-md">
              Turn your following into income. Promote the tech everyone wants. Earn for every sale you make.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <JoinNowButton
                className={`${joinClass} bg-black hover:bg-gray-800 text-white border-none text-sm md:text-base`}
              />
              <a
                href="#how-it-works"
                className={`${joinClass} text-white border-2 border-white hover:bg-white/10 bg-transparent text-sm md:text-base`}
              >
                How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white rounded-t-3xl -mt-10 md:-mt-16 relative z-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            Why Partner with Ventech
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <TrendingUp className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Competitive Commissions</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                {commission
                  ? `Earn ${commission} on every eligible sale you refer.`
                  : 'Earn a fixed commission on every eligible sale you refer.'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Target className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">In-Demand Products</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Commission applies to {categoryList}.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <FileText className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Reliable Payouts</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Get paid by {payoutList}
                {minWithdrawal ? `. Minimum withdrawal is ${minWithdrawal}.` : '.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            How the Affiliate Program Works
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <FileText className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Join</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                {fee
                  ? `Apply, pay the one-time ${fee} fee, and get your referral link after approval.`
                  : 'Apply, pay the one-time fee, and get your referral link after approval.'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Share2 className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Promote</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Share your link and content. Drive traffic to ventechgadgets.com.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <DollarSign className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Earn</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                {commission
                  ? `Earn ${commission} for every verified eligible sale.`
                  : 'Earn a commission for every verified eligible sale.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="affiliate-form" className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#FF7A19]">Join as an Affiliate</h2>
            <p className="text-[#3A3A3A] mb-6 leading-relaxed">
              {fee
                ? `A one-time application fee of ${fee} applies. After payment your application is reviewed.`
                : 'A one-time application fee applies. After payment your application is reviewed.'}
            </p>
            <JoinNowButton
              className={`${joinClass} bg-[#FF7A19] hover:bg-[#e66a0f] text-white`}
            />
            <p className="mt-6">
              <Link href="/affiliate/terms" className="text-sm text-[#FF7A19] hover:underline">
                Read the affiliate terms
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-12 md:py-16 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/affiliatepageimage.webp"
            alt="Affiliate Benefits"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-white/60 z-10"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-[#1A1A1A]">
            Unlock Exclusive Benefits
          </h2>
          <p className="text-lg md:text-xl mb-8 md:mb-12 max-w-2xl mx-auto text-[#3A3A3A]">
            Get rewarded for sharing quality tech with your followers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
            <JoinNowButton
              className={`${joinClass} bg-[#FF7A19] hover:bg-[#e66a0f] text-white border-none`}
            />
            <a
              href="mailto:ventechgadgets@gmail.com"
              className={`${joinClass} border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white bg-transparent`}
            >
              Contact Support
              <FolderOpen className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
