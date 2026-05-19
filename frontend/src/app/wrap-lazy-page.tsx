import { Suspense, type ComponentType } from 'react'

import { RouteFallback } from '@/app/RouteFallback'

export function wrapLazyPage(Component: ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  )
}
