import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface ProductBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

/** Shared breadcrumb for product sub-pages (FAQ, Ratgeber, Tarife, …). */
export function ProductBreadcrumb({ items, className = '' }: ProductBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`mb-6 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted font-body">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-[#cbd5e0]">
                  /
                </span>
              )}
              {isLast || !item.href ? (
                <span aria-current="page" className="text-navy font-medium">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-body hover:text-accent transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
