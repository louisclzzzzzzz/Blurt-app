import { useState } from 'react'
import { CatalogueDomainScreen } from './CatalogueDomainScreen'
import type { DashboardButtonDef } from './DashboardScreen'
import { DashboardScreen } from './DashboardScreen'

export type CatalogueDomain = 'food' | 'exercise' | 'activity'

interface CatalogueScreenProps {
  onClose: () => void
}

const DOMAIN_LABELS: Record<CatalogueDomain, string> = {
  food: 'Aliments',
  exercise: 'Exercices',
  activity: 'Activités',
}

const DOMAIN_ICONS: Record<CatalogueDomain, string> = {
  food: '🍎',
  exercise: '🏋️',
  activity: '🏃',
}

export function CatalogueScreen({ onClose }: CatalogueScreenProps) {
  const [domain, setDomain] = useState<CatalogueDomain | null>(null)

  if (domain !== null) {
    return (
      <CatalogueDomainScreen domain={domain} title={DOMAIN_LABELS[domain]} onBack={() => setDomain(null)} />
    )
  }

  const buttons: DashboardButtonDef[] = (Object.keys(DOMAIN_LABELS) as CatalogueDomain[]).map((d) => ({
    key: d,
    label: DOMAIN_LABELS[d],
    icon: DOMAIN_ICONS[d],
    onClick: () => setDomain(d),
  }))

  return <DashboardScreen title="Catalogue" onBack={onClose} buttons={buttons} />
}
