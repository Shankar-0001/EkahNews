export default function ContentUnavailableNotice({
  title = 'Content is temporarily unavailable',
  message = 'Please check back shortly while we refresh this section.',
  className = '',
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 ${className}`.trim()}>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {message}
      </p>
    </div>
  )
}
