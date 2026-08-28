export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <div className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-teal-600">{eyebrow}</div>}<h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p></div>{action}</div>;
}
