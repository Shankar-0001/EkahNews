import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function SectionHeader({ title, href, children }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-[15px] dark:border-slate-800/90">
      <h2 className="font-sans text-[30px] font-bold leading-none tracking-[-0.03em] text-[var(--c-heading)] dark:text-white">
        {title}
      </h2>
      <div className="flex items-center gap-3">
        {children}
        {href ? (
          <Link
            href={href}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-2 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] hover:text-[var(--c-accent)] dark:text-slate-400"
          >
            More
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
