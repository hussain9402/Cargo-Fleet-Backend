"use client";

import { useEffect } from 'react';
import type { AdminUser } from '../lib/api';

const PLATFORM_NAME = 'FleetFlow';
const PLATFORM_FAVICON = '/favicon.png';
const PLATFORM_LOGO = '/brand/logo-dark.png';

export function getBrand(user: AdminUser | null) {
  if (user?.company?.name) {
    return {
      name: user.company.name,
      logoUrl: user.company.logoUrl || PLATFORM_LOGO,
      faviconUrl: user.company.logoUrl || PLATFORM_FAVICON,
      isPlatform: false,
    };
  }
  return {
    name: PLATFORM_NAME,
    logoUrl: PLATFORM_LOGO,
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
  const brand = getBrand(user);
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
  const brand = getBrand(user);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt={brand.name} className={className} />
  );
}
