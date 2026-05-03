"use client"

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function ArticleSummaryToggles({ summaryPoints = [] }) {
  const [openSection, setOpenSection] = useState(null)

  const hasSummary = summaryPoints.length > 0

  if (!hasSummary) return null

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-stretch gap-3">
        {hasSummary && (
          <button
            type="button"
            className="inline-flex h-[40px] min-w-[185px] items-center justify-between gap-2 rounded-xl border-2 border-pink-700 bg-pink-700 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
            aria-expanded={openSection === 'summary'}
            onClick={() => setOpenSection(openSection === 'summary' ? null : 'summary')}
          >
            <span>60 Second Summary</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openSection === 'summary' ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {hasSummary && openSection === 'summary' && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-base text-blue-900/90 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100/90">
          <ul className="list-disc pl-5 space-y-1.5">
            {summaryPoints.map((point, idx) => (
              <li key={`${point}-${idx}`}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
