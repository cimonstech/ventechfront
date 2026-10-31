'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  FolderTree,
  Tag,
  Image,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  DollarSign,
  ShoppingCart,
  Heart,
  CreditCard,
  ChevronLeft,
  Percent,
  Star,
  Clock,
  Shield,
  FileText,
  Laptop,
  Wrench,
  Handshake,
  Landmark,
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import { getRoleLabel, hasAdminEntry } from '@/lib/roles';
import { canOpenAdminPath, canViewModule, isFullAdmin } from '@/lib/access';
import { AccessDenied, ErrorState, LoadingMessage } from '@/components/ui-states';
import { rememberRedirect } from '@/lib/safeRedirect';
import { useAccess } from '@/context/AccessContext';
import { AreaSwitcher } from '@/components/navigation/AreaSwitcher';
import { AdminHeadingProvider, useAdminHeadingValue } from '@/components/admin/AdminHeading';
import { AdminMobileDock } from '@/components/admin/AdminMobileDock';
import { deviceRequest, type TicketSummary } from '@/lib/ticketsAdmin';
import { affiliateQueueBadge } from '@/lib/affiliatesAdmin';
import toast from 'react-hot-toast';

interface MenuItem {
  icon: any;
  label: string;
  href?: string;
  badge?: number;
  children?: MenuItem[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['products', 'analytics']);
  const [mounted, setMounted] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number | undefined>(undefined);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number | undefined>(undefined);
  const [submittedTickets, setSubmittedTickets] = useState<number | undefined>(undefined);
  const [affiliateQueue, setAffiliateQueue] = useState<number | undefined>(undefined);
  const [pendingDevices, setPendingDevices] = useState<number | undefined>(undefined);
  const { access, loading: accessLoading } = useAccess();

  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  // Fetch badge counts
  useEffect(() => {
    if (!access) return;
    const includeOrders = canViewModule(access, 'orders');
    const includeNotifications = isFullAdmin(access.role);
    const includeTickets = canViewModule(access, 'tickets');
    const includeAffiliates = canViewModule(access, 'affiliates');
    const includeDevices = canViewModule(access, 'devices');
    if (!includeOrders && !includeNotifications && !includeTickets && !includeAffiliates && !includeDevices) return;

    const fetchBadgeCounts = async () => {
      try {
        if (includeOrders) {
          const { count: pendingCount, error: ordersError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

          if (!ordersError) {
            setPendingOrdersCount(pendingCount || 0);
          }
        }

        if (includeTickets) {
          try {
            const result = await deviceRequest<TicketSummary>('/api/admin/tickets/summary');
            setSubmittedTickets(result.data.counts?.submitted || 0);
          } catch {
            setSubmittedTickets(0);
          }
        }

        if (includeAffiliates) {
          try {
            setAffiliateQueue(await affiliateQueueBadge());
          } catch {
            setAffiliateQueue(0);
          }
        }

        if (includeDevices) {
          try {
            const result = await deviceRequest('/api/admin/devices?limit=1&page=1&status=pending');
            setPendingDevices(result.pending_count || 0);
          } catch {
            setPendingDevices(0);
          }
        }

        if (!includeNotifications) {
          setUnreadNotificationsCount(0);
          return;
        }

        // Fetch unread notifications count
        // Handle gracefully if notifications table doesn't exist
        try {
          const { count: unreadCount, error: notificationsError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);

          if (!notificationsError) {
            setUnreadNotificationsCount(unreadCount || 0);
          } else {
            // If table doesn't exist, set to 0 and don't show badge
            const errorCode = notificationsError.code || '';
            const errorMessage = notificationsError.message || '';
            
            if (
              errorCode === '42P01' || // Table doesn't exist
              errorCode === 'PGRST116' ||
              errorMessage.includes('does not exist') ||
              errorMessage.includes('relation') ||
              errorMessage.includes('not found')
            ) {
              setUnreadNotificationsCount(0); // Set to 0 so badge doesn't show
            }
          }
        } catch (err) {
          // Table doesn't exist or other error - set to 0
          setUnreadNotificationsCount(0);
        }
      } catch {
        // Badge counts are optional; leave the last known values.
      }
    };

    fetchBadgeCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [access]);

  useEffect(() => {
    // Wait for component to mount and auth state to finish loading before checking
    if (!mounted || isLoading) {
      return; // Still mounting or loading auth state, don't redirect yet
    }

    // Longer delay to ensure auth state is fully settled after INITIAL_SESSION
    // INITIAL_SESSION can cause temporary state where isLoading is false but user isn't loaded yet
    const timeoutId = setTimeout(() => {
      // Double-check: Wait a bit more if user is still null but we're not loading
      if (!user && !isLoading) {
        // Check session directly from Supabase as a fallback
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            if (pathname !== '/login' && pathname !== '/register') {
              rememberRedirect(pathname);
              router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            }
          }
        });
        return;
      }

      if (!isAuthenticated || !user) {
        if (pathname !== '/login' && pathname !== '/register') {
          rememberRedirect(pathname);
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }
      
      // User is authenticated and is admin - allow access
    }, 500); // Increased delay to handle INITIAL_SESSION

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, isLoading, mounted, router, pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const menuItems: MenuItem[] = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/admin',
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      children: [
        { icon: DollarSign, label: 'Revenue', href: '/admin/analytics/revenue' },
        { icon: ShoppingCart, label: 'Sales', href: '/admin/analytics/sales' },
        { icon: Users, label: 'Customers', href: '/admin/analytics/customers' },
      ],
    },
    {
      icon: ShoppingBag,
      label: 'Orders',
      href: '/admin/orders',
      badge: pendingOrdersCount !== undefined ? (pendingOrdersCount > 0 ? pendingOrdersCount : undefined) : undefined,
    },
    {
      icon: Laptop,
      label: 'Devices',
      href: '/admin/devices',
      badge: pendingDevices !== undefined ? (pendingDevices > 0 ? pendingDevices : undefined) : undefined,
    },
    {
      icon: Wrench,
      label: 'Service requests',
      href: '/admin/tickets',
      badge: submittedTickets !== undefined ? (submittedTickets > 0 ? submittedTickets : undefined) : undefined,
    },
    {
      icon: Handshake,
      label: 'Affiliates',
      href: '/admin/affiliates',
      badge: affiliateQueue !== undefined ? (affiliateQueue > 0 ? affiliateQueue : undefined) : undefined,
    },
    {
      icon: Landmark,
      label: 'Laptop Banking',
      href: '/admin/vlb',
    },
    {
      icon: Package,
      label: 'Products',
      children: [
        { icon: Package, label: 'All Products', href: '/admin/products' },
        { icon: FolderTree, label: 'Categories', href: '/admin/categories' },
        { icon: Tag, label: 'Brands', href: '/admin/brands' },
      ],
    },
    {
      icon: Clock,
      label: 'Pre-Orders',
      href: '/admin/pre-orders',
    },
    {
      icon: Users,
      label: 'Customers',
      href: '/admin/users',
    },
    {
      icon: Shield,
      label: 'Staff',
      href: '/admin/staff',
    },
    {
      icon: CreditCard,
      label: 'Transactions',
      href: '/admin/transactions',
    },
    {
      icon: Heart,
      label: 'Wishlist Insights',
      href: '/admin/wishlist-insights',
    },
    {
      icon: ShoppingCart,
      label: 'Cart Analytics',
      href: '/admin/cart-analytics',
    },
    {
      icon: Star,
      label: 'Reviews',
      href: '/admin/reviews',
    },
    {
      icon: Image,
      label: 'Media Library',
      href: '/admin/media',
    },
    {
      icon: FileText,
      label: 'Content',
      href: '/admin/content',
    },
    {
      icon: FileText,
      label: 'FAQs',
      href: '/admin/faqs',
    },
    {
      icon: FileText,
      label: 'Pages',
      href: '/admin/pages',
    },
    {
      icon: Image,
      label: 'Marketing',
      children: [
        { icon: Image, label: 'Banners', href: '/admin/banners' },
        { icon: Image, label: 'Sidebar Ads', href: '/admin/sidebar-ads' },
        { icon: Tag, label: 'Coupons', href: '/admin/coupons' },
      ],
    },
    {
      icon: FileText,
      label: 'Audit log',
      href: '/admin/audit-log',
    },
    {
      icon: Bell,
      label: 'Notifications',
      href: '/admin/notifications',
      badge: unreadNotificationsCount !== undefined ? (unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined) : undefined,
    },
    {
      icon: Settings,
      label: 'Settings',
      children: [
        { icon: Settings, label: 'Delivery Options', href: '/admin/settings' },
        { icon: DollarSign, label: 'Taxes', href: '/admin/taxes' },
        { icon: Percent, label: 'Discounts', href: '/admin/discounts' },
      ],
    },
  ];

  const visibleMenuItems = !access
    ? menuItems.filter((item) => item.href === '/admin')
    : menuItems
    .map((item) => {
      if (!item.children) return item;
      return {
        ...item,
        children: item.children.filter((child) => child.href && canOpenAdminPath(child.href, access)),
      };
    })
    .filter((item) => {
      if (item.children) return item.children.length > 0;
      return !!item.href && canOpenAdminPath(item.href, access);
    });

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
        <LoadingMessage label="Loading" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingMessage label="Verifying admin access" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingMessage label="Checking your session" />
      </div>
    );
  }

  if (!hasAdminEntry(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AccessDenied
          title="Admin only"
          description="This area is for VENTECH staff. Your account doesn't have admin access."
          primary={{ label: 'Go to your account', href: '/account' }}
          secondary={{ label: 'Back to shop', href: '/shop', variant: 'outline' }}
        />
      </div>
    );
  }

  return (
    <AdminHeadingProvider>
    <div className="flex h-screen bg-gray-50 print:block print:h-auto print:bg-white">
      {mobileNav ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden print:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      ) : null}
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'lg:w-64' : 'lg:w-20'
        } w-64 bg-[#1A1A1A] text-white transition-transform duration-300 lg:transition-[width] flex flex-col fixed h-full z-50 print:hidden max-lg:max-w-[18rem] ${
          mobileNav ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo & Toggle */}
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          <div className={`flex items-center gap-2 min-w-0 ${sidebarOpen ? '' : 'lg:hidden'}`}>
            <img
              src="/logo/ventech_logo-white.png"
              alt="VENTECH"
              className="h-8 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
                setSidebarOpen(!sidebarOpen);
              } else {
                setMobileNav(false);
              }
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <span className="lg:hidden"><ChevronLeft size={20} /></span>
            <span className="hidden lg:inline">{sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}</span>
          </button>
        </div>

        {/* Admin Info */}
        <div className={`p-4 border-b border-gray-700 ${sidebarOpen ? '' : 'lg:hidden'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF7A19] rounded-full flex items-center justify-center font-bold">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-semibold truncate">{user?.full_name || 'Admin'}</p>
                <span className="shrink-0 text-[10px] leading-none px-1.5 py-1 rounded bg-white/10 text-gray-200">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {visibleMenuItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                // Expandable menu item
                <div>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 min-h-11 hover:bg-gray-700 transition-colors ${
                      !sidebarOpen && 'lg:justify-center'
                    }`}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className={`flex-1 text-left text-sm ${sidebarOpen ? '' : 'lg:hidden'}`}>{item.label}</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>
                      {expandedMenus.includes(item.label) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </span>
                  </button>
                  {expandedMenus.includes(item.label) ? (
                    <div className={`bg-gray-800 ${sidebarOpen ? '' : 'lg:hidden'}`}>
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href || '#'}
                          className={`flex min-h-11 items-center gap-3 px-4 py-2 pl-12 hover:bg-gray-700 transition-colors text-sm ${
                            isActive(child.href) ? 'bg-gray-700 text-[#FF7A19]' : ''
                          }`}
                        >
                          <child.icon size={16} className="shrink-0" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                // Regular menu item
                <Link
                  href={item.href || '#'}
                  className={`flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors relative ${
                    !sidebarOpen ? 'lg:justify-center' : ''
                  } ${isActive(item.href) ? 'bg-gray-700 text-[#FF7A19]' : ''}`}
                >
                  <item.icon size={20} className="shrink-0" />
                  <span className={`flex-1 text-sm ${sidebarOpen ? '' : 'lg:hidden'}`}>{item.label}</span>
                  {item.badge ? (
                    <span className={`bg-[#FF7A19] text-white text-xs px-2 py-1 rounded-full ${sidebarOpen ? '' : 'lg:hidden'}`}>
                      {item.badge}
                    </span>
                  ) : null}
                  {!sidebarOpen && item.badge ? (
                    <span className="absolute -top-1 -right-1 hidden bg-[#FF7A19] text-white text-xs w-5 h-5 rounded-full lg:flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className={`w-full flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-red-600 rounded-lg transition-colors ${
              !sidebarOpen ? 'lg:justify-center' : ''
            }`}
          >
            <LogOut size={20} className="shrink-0" />
            <span className={`text-sm ${sidebarOpen ? '' : 'lg:hidden'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 min-w-0 overflow-y-auto overflow-x-clip scroll-pt-20 ml-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300 print:ml-0 print:overflow-visible`}
      >
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 lg:px-8 lg:py-4 sticky top-0 z-40 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 lg:hidden"
                aria-label="Open menu"
                onClick={() => setMobileNav(true)}
              >
                <Menu size={20} />
              </button>
              <AdminPageTitle
                pathname={pathname}
                welcome={user?.full_name?.split(' ')[0] || 'Admin'}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 lg:gap-4">
              <div className="hidden sm:block">
                <AreaSwitcher />
              </div>
              <button type="button" className="relative inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <Link
                href="/"
                className="hidden sm:inline-flex min-h-11 items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                View Store →
              </Link>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="max-w-full overflow-x-clip p-4 pb-24 print:p-0 md:pb-8 lg:p-8">
          {accessLoading ? (
            <LoadingMessage label="Checking what you can open" />
          ) : !access ? (
            <ErrorState
              title="We couldn't confirm your access"
              description="Refresh the page and try again."
              primary={{ label: 'Refresh', onClick: () => window.location.reload() }}
            />
          ) : canOpenAdminPath(pathname, access) ? (
            children
          ) : (
            <AccessDenied
              title="You don't have access to this section"
              description="Your role can't open this page. Pick another section from the sidebar, or ask an admin if you need it."
              primary={{ label: 'Admin home', href: '/admin' }}
            />
          )}
        </div>
      </main>
      <AdminMobileDock items={visibleMenuItems} pathname={pathname} />
    </div>
    </AdminHeadingProvider>
  );
}

function AdminPageTitle({ pathname, welcome }: { pathname: string; welcome: string }) {
  const heading = useAdminHeadingValue();
  const isDashboard = pathname === '/admin' || pathname === '/admin/dashboard';

  const copyId = async () => {
    if (!heading?.id) return;
    try {
      await navigator.clipboard.writeText(heading.id);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  if (!isDashboard && !heading?.id) {
    return <div className="min-w-0" />;
  }

  return (
    <div className="min-w-0">
      {isDashboard ? (
        <>
          <p className="truncate text-lg font-bold text-[#1A1A1A] lg:text-2xl">Dashboard</p>
          <p className="mt-1 text-sm text-[#3A3A3A]">Welcome back, {welcome}</p>
        </>
      ) : heading?.id ? (
        <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono break-all">{heading.id}</span>
          <button type="button" onClick={copyId} className="inline-flex min-h-11 shrink-0 items-center font-semibold text-[#FF7A19]">
            Copy
          </button>
        </p>
      ) : null}
    </div>
  );
}

