import Link from 'next/link'

export default function CategoryFilterTabs({ items, activeLabel }) {
  return (
    <nav aria-label="News filters" className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const isActive = item.label === activeLabel

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-sans text-[12px] font-semibold ${
              isActive
                ? 'text-[var(--c-heading)] dark:text-white'
                : 'text-[#6b7280] hover:text-[var(--c-accent)] dark:text-slate-400'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
