'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Users,
  Bike,
  Navigation,
  DollarSign,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/lib/store/adminStore';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Live Map', href: '/live-map', icon: Map },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Riders', href: '/riders', icon: Bike },
  { label: 'Rides', href: '/rides', icon: Navigation },
  { label: 'Pricing', href: '/pricing', icon: DollarSign },
  { label: 'Promo Codes', href: '/promos', icon: Tag },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser, logout } = useAdminStore();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-dark flex flex-col z-30 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">Ride &amp; Chill</p>
          <p className="text-gray-500 text-xs mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              )}
            >
              <Icon
                size={18}
                className={cn(isActive ? 'text-white' : 'text-gray-500')}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-2">
        {adminUser && (
          <div className="px-3 py-2">
            <p className="text-white text-sm font-medium truncate">
              {adminUser.name}
            </p>
            <p className="text-gray-500 text-xs truncate">{adminUser.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all duration-150"
        >
          <LogOut size={18} className="text-gray-500" />
          Logout
        </button>
      </div>
    </aside>
  );
}
