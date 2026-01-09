'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  X,
  LogOut,
  Package,
  Settings,
  Mail,
  Phone,
  ChevronDown,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout as logoutAction } from '@/store/authSlice';
import { Button } from '../ui/Button';
import { MegaMenu } from './MegaMenu';
import { SearchBar } from '../search/SearchBar';
import { signOut } from '@/services/auth.service';
import toast from 'react-hot-toast';

export const NavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isNoticeVisible, setIsNoticeVisible] = useState(false);

  // Check if notice was dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('customer-service-notice-dismissed');
    setIsNoticeVisible(!dismissed);
  }, []);

  const handleDismissNotice = () => {
    setIsNoticeVisible(false);
    localStorage.setItem('customer-service-notice-dismissed', 'true');
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileSearchOpen && !target.closest('.mobile-search-container')) {
        setIsMobileSearchOpen(false);
      }
    };

    if (isMobileSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobileSearchOpen]);
  
  const { itemCount } = useAppSelector((state) => state.cart);
  const { count: wishlistCount } = useAppSelector((state) => state.wishlist);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    // { href: '/deals', label: 'Deals' }, // Disabled for now
    { href: '/pre-order', label: 'Pre-Order' },
    { href: '/bulk-order', label: 'Bulk Order' },
    { href: '/affiliate', label: 'Affiliate' },
    { href: '/about', label: 'About' },
    { href: '/laptop-banking', label: '💰 Laptop Banking', highlight: true },
  ];

  const handleLogout = async () => {
    try {
      // Clear Redux state first
      dispatch(logoutAction());
      
      // Then sign out from Supabase
      await signOut();
      
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <>
      {/* Customer Service Notice */}
      {isNoticeVisible && (
        <div className="bg-black/80 backdrop-blur-sm border-b border-gray-700 px-4 py-3 w-full relative">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="text-center">
              <a 
                href="tel:+233551344310" 
                className="text-sm sm:text-base text-white hover:underline block"
              >
                Need advice or assistance to place an order? Contact us at +233 55 134 4310
              </a>
            </div>
            <button
              onClick={handleDismissNotice}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close notice"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>
      )}

    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="https://files.ventechgadgets.com/ventech_logo_1.png"
              alt="VENTECH"
              width={120}
              height={48}
              className="object-contain h-10 sm:h-12 md:h-14"
              priority
            />

          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <SearchBar
              placeholder="Search for products, brands, categories..."
              className="w-full"
            />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Contact Info */}
            <div className="flex flex-col gap-1 pr-4 border-r border-gray-200">
              <a 
                href="tel:+233551344310" 
                className="flex items-center gap-2 text-xs text-[#3A3A3A] hover:text-[#FF7A19] transition-colors"
                title="Call us"
              >
                <Phone size={16} />
                <span className="hidden xl:inline font-medium">+233 55 134 4310</span>
              </a>
              <a 
                href="mailto:ventechgadgets@gmail.com" 
                className="flex items-center gap-2 text-xs text-[#3A3A3A] hover:text-[#FF7A19] transition-colors"
                title="Email us"
              >
                <Mail size={16} />
                <span className="hidden xl:inline">ventechgadgets@gmail.com</span>
              </a>
            </div>

            {isAuthenticated ? (
              <>
                <Link href="/wishlist">
                  <Button variant="ghost" size="sm" className="relative">
                    <Heart size={20} />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#FF7A19] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                    Wishlist
                  </Button>
                </Link>

                <Link href="/cart">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart size={20} />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#FF7A19] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {itemCount}
                      </span>
                    )}
                    Cart
                  </Button>
                </Link>

                <div className="relative group">
                  <Link href="/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <User size={18} className="text-[#3A3A3A]" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-medium text-[#3A3A3A]">Account</span>
                      <span className="text-xs text-[#FF7A19] font-semibold">
                        {(user as any)?.first_name || user?.full_name?.split(' ')[0] || 'User'}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-[#3A3A3A]" />
                  </Link>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 rounded-t-lg text-sm">
                      <User size={16} />
                      <span>My Profile</span>
                    </Link>
                    <Link href="/orders" className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm">
                      <Package size={16} />
                      <span>My Orders</span>
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm">
                      <Heart size={16} />
                      <span>Wishlist</span>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-[#FF7A19] text-sm">
                        <Settings size={16} />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 rounded-b-lg text-red-600 w-full text-left text-sm"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/cart">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart size={20} />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#FF7A19] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {itemCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions - Search, Cart & Menu */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Search Icon */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className={`p-2 flex items-center justify-center transition-colors ${
                isMobileSearchOpen ? 'text-[#FF7A19]' : 'text-[#3A3A3A]'
              }`}
              aria-label="Search"
            >
              <Search size={22} />
            </button>

            {/* Mobile Cart Icon */}
            <Link href="/cart" className="relative p-2">
              <ShoppingCart size={22} className="text-[#3A3A3A]" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-[#FF7A19] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="p-2 flex items-center justify-center"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} className="text-[#3A3A3A]" /> : <Menu size={24} className="text-[#3A3A3A]" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {isMobileSearchOpen && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setIsMobileSearchOpen(false)}
            />
            {/* Search dropdown */}
            <div className="mobile-search-container fixed top-[56px] sm:top-[64px] left-0 right-0 bg-white shadow-xl border-b border-gray-200 z-50 md:hidden">
              <div className="container mx-auto px-3 sm:px-4 py-4">
                <SearchBar
                  placeholder="Search products, brands..."
                  className="w-full"
                  showSuggestions={true}
                  onSearch={(query) => {
                    setIsMobileSearchOpen(false);
                    router.push(`/search?q=${encodeURIComponent(query)}`);
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Desktop Navigation with Mega Menu */}
        <div className="hidden lg:flex items-center justify-between py-3 border-t border-gray-100">
          {/* Mega Menu */}
          <MegaMenu />

          {/* Quick Links */}
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  text-sm font-medium transition-colors
                  ${link.highlight 
                    ? 'bg-gradient-to-r from-[#FF7A19] to-[#FF8C3A] text-white px-4 py-2 rounded-lg hover:shadow-lg font-bold' 
                    : pathname === link.href 
                      ? 'text-[#FF7A19]' 
                      : 'text-[#3A3A3A] hover:text-[#FF7A19]'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay & Sidebar */}
      <>
        {/* Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sliding Sidebar Menu */}
        <div
          className={`
            fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 md:hidden
            transform transition-transform duration-300 ease-in-out overflow-y-auto
            ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
          style={{ maxWidth: '85vw', width: '320px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X size={24} className="text-[#3A3A3A]" />
            </button>
          </div>

          {/* Mobile Search */}
          <div className="p-4 border-b border-gray-200">
            <SearchBar
              placeholder="Search products, brands..."
              className="w-full"
            />
          </div>

          {/* Navigation Links */}
          <div className="py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  block px-4 py-3 text-base font-medium transition-colors
                  ${pathname === link.href 
                    ? 'text-[#FF7A19] bg-orange-50 border-r-2 border-[#FF7A19]' 
                    : 'text-[#3A3A3A] hover:text-[#FF7A19] hover:bg-gray-50'
                  }
                  ${link.highlight ? 'bg-gradient-to-r from-orange-50 to-orange-100' : ''}
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          {isAuthenticated ? (
            <>
              {/* Account Section */}
              <div className="border-t border-gray-200 py-4">
                <div className="px-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF7A19] rounded-full flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#1A1A1A]">
                        {user?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-[#3A3A3A]">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[#3A3A3A] hover:bg-gray-50 hover:text-[#FF7A19] transition-colors"
                >
                  <User size={16} className="inline mr-2" />
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[#3A3A3A] hover:bg-gray-50 hover:text-[#FF7A19] transition-colors"
                >
                  <Package size={16} className="inline mr-2" />
                  My Orders
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-[#FF7A19] hover:bg-orange-50 transition-colors font-medium"
                  >
                    <Settings size={16} className="inline mr-2" />
                    Admin Panel
                  </Link>
                )}
              </div>

              {/* Quick Actions */}
              <div className="border-t border-gray-200 px-4 py-4 space-y-2">
                <Link
                  href="/wishlist"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-[#FF7A19] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Heart size={20} className="text-[#FF7A19]" />
                    <span className="font-medium text-sm">Wishlist</span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="bg-[#FF7A19] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-[#FF7A19] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={20} className="text-[#FF7A19]" />
                    <span className="font-medium text-sm">Cart</span>
                  </div>
                  {itemCount > 0 && (
                    <span className="bg-[#FF7A19] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-200 px-4 py-2">
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="border-t border-gray-200 px-4 py-4 space-y-2">
              <Link
                href="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-[#FF7A19] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} className="text-[#FF7A19]" />
                  <span className="font-medium text-sm">Cart</span>
                </div>
                {itemCount > 0 && (
                  <span className="bg-[#FF7A19] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center py-3 border border-gray-200 rounded-lg hover:border-[#FF7A19] hover:text-[#FF7A19] transition-colors font-medium text-sm"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center py-3 bg-[#FF7A19] text-white rounded-lg hover:bg-[#FF8C3A] transition-colors font-medium text-sm"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Contact Info */}
          <div className="border-t border-gray-200 px-4 py-4 space-y-3 bg-gray-50">
            <a
              href="tel:+233551344310"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 text-sm text-[#3A3A3A] hover:text-[#FF7A19] transition-colors"
            >
              <Phone size={18} className="text-[#FF7A19]" />
              <span>+233 55 134 4310</span>
            </a>
            <a
              href="mailto:ventechgadgets@gmail.com"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 text-sm text-[#3A3A3A] hover:text-[#FF7A19] transition-colors"
            >
              <Mail size={18} className="text-[#FF7A19]" />
              <span>ventechgadgets@gmail.com</span>
            </a>
          </div>
        </div>
      </>
    </nav>
    </>
  );
};
