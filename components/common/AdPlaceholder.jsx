export default function AdPlaceholder({ label = 'Advertisement', className = '' }) {
  return (
    <div className={`rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`.trim()}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        {label}
      </p>
      <div className="mt-3 rounded-[18px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,_#faf7f7_0%,_#ffffff_100%)] px-4 py-7 text-sm text-slate-500 dark:border-slate-700 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.88)_0%,_rgba(2,6,23,0.96)_100%)] dark:text-slate-400">
        Reserved placement for future monetization.
      </div>
    </div>
  )
}
