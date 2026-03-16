'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import StructuredData, { BreadcrumbSchema } from '@/components/seo/StructuredData'

export default function Breadcrumb({ items }) {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'
  
  const schemaItems = [
    { name: 'Home', url: siteUrl },
    ...items.map(item => ({ name: item.label, url: `${siteUrl}${item.href}` }))
  ]

  return (
    <>
      <StructuredData data={BreadcrumbSchema(schemaItems)} />
      <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
          <Home className="h-4 w-4" />
        </Link>
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4" />
            {index === items.length - 1 ? (
              <span className="font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-blue-600 dark:hover:text-blue-400">
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </>
  )
}

