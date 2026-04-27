'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/use-permissions';
import {
  User,
  Lock,
  Key,
  CreditCard,
  MapPin,
  FileText,
  Receipt,
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function getHasStripe(): boolean {
  return !!process.env.NEXT_PUBLIC_STRIPE_KEY;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isSuperUser } = usePermissions();
  const hasStripe = getHasStripe();

  const groups: NavGroup[] = [
    {
      label: 'User',
      items: [
        {
          name: 'Profile',
          href: '/settings#profile',
          icon: User,
        },
        {
          name: 'Password',
          href: '/settings#account',
          icon: Lock,
        },
        ...(isSuperUser
          ? [
              {
                name: 'API Keys',
                href: '/settings#api-keys',
                icon: Key,
              },
            ]
          : []),
      ],
    },
    ...(hasStripe
      ? [
          {
            label: 'Billing',
            items: [
              {
                name: 'Subscription',
                href: '/settings/billing#subscription',
                icon: CreditCard,
              },
              {
                name: 'Payment',
                href: '/settings/billing#payment-methods',
                icon: CreditCard,
              },
              {
                name: 'Address',
                href: '/settings/billing#billing-address',
                icon: MapPin,
              },
              {
                name: 'Invoices',
                href: '/settings/billing#invoices',
                icon: Receipt,
              },
            ],
          },
        ]
      : []),
  ];

  // Track which section is in view via IntersectionObserver
  const [activeHash, setActiveHash] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isClickScrolling = useRef(false);

  // Collect hash IDs for the CURRENT page only
  const currentPageHashes = useMemo(() => {
    const hashes: string[] = [];
    groups.forEach((g) =>
      g.items.forEach((item) => {
        const [itemPath, itemHash] = item.href.split('#');
        if (
          itemHash &&
          (pathname === itemPath || pathname === itemPath + '/')
        ) {
          hashes.push(itemHash);
        }
      }),
    );
    return hashes;
  }, [groups, pathname]);

  // The first hash on the current page is the default active section
  const defaultHash = currentPageHashes[0] ?? null;

  useEffect(() => {
    // Reset active hash when navigating between pages
    setActiveHash(null);

    const elements = currentPageHashes
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveHash(visible[0].target.id);
        }
      },
      { rootMargin: '-60px 0px -40% 0px', threshold: 0 },
    );

    elements.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, [pathname, currentPageHashes.join(',')]);

  // Determine active link
  const isActive = (href: string) => {
    const [hrefPath, hrefHash] = href.split('#');
    const onThisPage = pathname === hrefPath || pathname === hrefPath + '/';

    if (!onThisPage) return false;

    if (!hrefHash) return false;

    // Use observed hash if available, otherwise fall back to default (first section)
    const effective = activeHash || defaultHash;
    return hrefHash === effective;
  };

  // Handle nav clicks — for hash links, scroll to the section
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    const [hrefPath, hash] = href.split('#');
    if (hash) {
      const onCorrectPage =
        pathname === hrefPath || pathname === hrefPath + '/';
      if (onCorrectPage) {
        e.preventDefault();
        isClickScrolling.current = true;
        setActiveHash(hash);
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          isClickScrolling.current = false;
        }, 800);
      }
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and billing
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar nav */}
        <nav className="flex shrink-0 flex-col gap-1 lg:sticky lg:top-[5rem] lg:h-fit lg:w-48">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <Link
                    key={`${group.label}-${item.name}`}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive(item.href)
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
