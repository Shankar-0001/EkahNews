'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import StructuredData, { BreadcrumbSchema } from '@/components/seo/StructuredData'
import { SITE_URL } from '@/lib/site-config'

export default function Breadcrumb({ items }) {
  const schemaItems = [
    { name: 'Home', url: SITE_URL },
    ...items.map((item) => ({ name: item.label, url: `${SITE_URL}${item.href}` })),
  ]

  return (
    <>
      <StructuredData data={BreadcrumbSchema(schemaItems)} />
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
        <Link href="/" aria-label="Go to homepage" className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:text-blue-600 dark:hover:text-blue-400">
          <Home className="h-4 w-4" />
        </Link>
        {items.map((item, index) => (
          <div key={index} className="flex min-w-0 items-center gap-x-2">
            <ChevronRight className="h-4 w-4" />
            {index === items.length - 1 ? (
              <span aria-current="page" className="min-w-0 break-words font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
            ) : (
              <Link href={item.href} className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:text-blue-600 dark:hover:text-blue-400">
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </>
  )
}
