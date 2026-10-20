import type { ActorsMfeProps as PlatformActorsMfeProps } from '@sena/frontend-platform';

export interface ActorsMfeProps extends PlatformActorsMfeProps {
  getAccessToken?: () => string | null
}
