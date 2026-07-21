"use client";

import { useEffect } from 'react';
import type { AdminUser } from '../lib/api';
import { useAdminTheme } from './AdminThemeProvider';

const PLATFORM_NAME = 'FleetFlow';
const PLATFORM_FAVICON = '/favicon.png';
const PLATFORM_LOGO_DARK = '/brand/logo-dark.png';
const PLATFORM_LOGO_LIGHT = '/brand/logo-light.png';

export function getBrand(user: AdminUser | null, theme: 'light' | 'dark' = 'dark') {
  const platformLogo = theme === 'light' ? PLATFORM_LOGO_LIGHT : PLATFORM_LOGO_DARK;
  if (user?.company?.name) {
    return {
      name: user.company.name,
      logoUrl: user.company.logoUrl || platformLogo,
      faviconUrl: user.company.logoUrl || PLATFORM_FAVICON,
      isPlatform: false,
    };
  }
  return {
    name: PLATFORM_NAME,
    logoUrl: platformLogo,
    faviconUrl: PLATFORM_FAVICON,
    isPlatform: true,
  };
}

function applyDocumentBrand(name: string, faviconUrl: string) {
  // Tab shows company name only.
  document.title = name;

  const selectors = ["link[rel='icon']", "link[rel='shortcut icon']", "link[rel='apple-touch-icon']"];
  for (const sel of selectors) {
    let link = document.querySelector<HTMLLinkElement>(sel);
    if (!link) {
      link = document.createElement('link');
      link.rel = sel.includes('apple') ? 'apple-touch-icon' : sel.includes('shortcut') ? 'shortcut icon' : 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }
}

/** Sets document title + favicon from the signed-in company brand. */
export function useCompanyBrand(user: AdminUser | null, _pageTitle?: string) {
  const { resolved } = useAdminTheme();
  const brand = getBrand(user, resolved);
  const companyKey = user?.company?.id ?? 'platform';
  const companyName = user?.company?.name ?? null;
  const logoUrl = user?.company?.logoUrl ?? null;

  useEffect(() => {
    applyDocumentBrand(brand.name, brand.faviconUrl);

    // Next.js metadata can overwrite the title shortly after hydration — re-apply.
    const t1 = window.setTimeout(() => applyDocumentBrand(brand.name, brand.faviconUrl), 50);
    const t2 = window.setTimeout(() => applyDocumentBrand(brand.name, brand.faviconUrl), 300);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [brand.name, brand.faviconUrl, companyKey, companyName, logoUrl]);

  return brand;
}

export function BrandMark({
  user,
  className = 'h-10 w-auto object-contain',
}: {
  user: AdminUser | null;
  className?: string;
}) {
  const { resolved } = useAdminTheme();
  const brand = getBrand(user, resolved);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt={brand.name} className={className} />
  );
}
