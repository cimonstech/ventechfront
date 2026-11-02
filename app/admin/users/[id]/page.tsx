'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { AdminPageHeader } from '@/components/admin/list';
import { AccessDenied, ErrorState, LoadingMessage } from '@/components/ui-states';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { ApiError } from '@/lib/httpErrors';
import { applyQueryFail } from '@/lib/queryState';
import { useAccess } from '@/context/AccessContext';
import {
  AFFILIATE_STATUS_LABEL,
  affiliateStatusVariant,
  customerName,
  deviceRequest,
  type CustomerDetail,
} from '@/lib/adminCustomers';
import { formatWhen } from '@/lib/affiliatesAdmin';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { canView } = useAccess();
  const [row, setRow] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useSetAdminHeading(row ? customerName(row) : 'Customer');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = await deviceRequest<CustomerDetail>(`/api/admin/customers/${id}`);
        if (cancelled) return;
        setRow(result.data);
        setFailed(false);
        setForbidden(false);
        setNotFound(false);
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && (error.status === 404 || error.kind === 'not_found')) {
            setNotFound(true);
          } else {
            applyQueryFail(error, { setForbidden, setFailed });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Customers', href: '/admin/users' }}
      />
    );
  }

  if (notFound) {
    return (
      <ErrorState
        title="Customer not found"
        description="This account isn't in the customers list."
        primary={{ label: 'Customers', href: '/admin/users' }}
      />
    );
  }

  if (failed && !row) {
    return (
      <ErrorState
        title="We couldn't load this customer"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => window.location.reload() }}
      />
    );
  }

  if (loading && !row) {
    return <LoadingMessage label="Loading customer" />;
  }

  if (!row) return null;

  const showAffiliate = canView('affiliates') && row.affiliate;
  const showInvestor = canView('vlb') && row.investor;

  return (
    <div className="min-w-0 max-w-3xl space-y-6">
      <AdminPageHeader
        title={customerName(row)}
        subtitle={row.email}
        backHref="/admin/users"
        backLabel="Customers"
        secondary={[{ label: 'View orders', href: `/admin/users/${row.id}/orders` }]}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-[#1A1A1A]">Account</h2>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-[#3A3A3A]">Phone</dt>
          <dd className="text-right font-medium text-[#1A1A1A]">{row.phone || '—'}</dd>
          <dt className="text-[#3A3A3A]">Joined</dt>
          <dd className="text-right font-medium text-[#1A1A1A]">{formatWhen(row.created_at)}</dd>
          <dt className="text-[#3A3A3A]">Newsletter</dt>
          <dd className="text-right">
            {row.newsletter_subscribed ? (
              <Badge size="sm" variant="success">Subscribed</Badge>
            ) : (
              <Badge size="sm" variant="default">Not subscribed</Badge>
            )}
          </dd>
        </dl>
      </section>

      {showAffiliate ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Affiliate</h2>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt className="text-[#3A3A3A]">Number</dt>
            <dd className="text-right font-medium text-[#1A1A1A]">{row.affiliate?.affiliate_no || '—'}</dd>
            <dt className="text-[#3A3A3A]">Status</dt>
            <dd className="text-right">
              <Badge size="sm" variant={affiliateStatusVariant(row.affiliate?.status || '')}>
                {AFFILIATE_STATUS_LABEL[row.affiliate?.status || ''] || row.affiliate?.status}
              </Badge>
            </dd>
            <dt className="text-[#3A3A3A]">Joined</dt>
            <dd className="text-right font-medium text-[#1A1A1A]">{formatWhen(row.affiliate?.created_at)}</dd>
          </dl>
          <Link
            href={`/admin/affiliates/${row.affiliate?.id}`}
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#FF7A19] hover:underline"
          >
            Open affiliate page
          </Link>
        </section>
      ) : null}

      {showInvestor ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Laptop Banking</h2>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt className="text-[#3A3A3A]">Investor number</dt>
            <dd className="text-right font-medium text-[#1A1A1A]">{row.investor?.investor_no || '—'}</dd>
            <dt className="text-[#3A3A3A]">Active investments</dt>
            <dd className="text-right font-medium text-[#1A1A1A]">{row.investor?.active_investments_count ?? 0}</dd>
          </dl>
          <Link
            href={`/admin/vlb/investors/${row.investor?.id}`}
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#FF7A19] hover:underline"
          >
            Open investor page
          </Link>
        </section>
      ) : null}
    </div>
  );
}
