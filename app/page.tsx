import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Produktübersicht',
  description: 'Übersicht aller Versicherungsprodukte im LeadMonster System',
}

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <Image src="/logo.png" alt="LeadMonster Logo" width={1024} height={1024} priority />
      <h1 className="font-heading text-4xl mt-8 mb-4 text-product-navy">
        LeadMonster — Ihre Versicherungsprodukte
      </h1>
      <p className="font-body text-brand-neutral-base max-w-2xl">
        Willkommen im LeadMonster Admin-System. Hier verwalten Sie alle Versicherungsprodukte,
        generieren SEO-optimierten Content und verfolgen eingehende Leads.
      </p>
    </main>
  )
}
