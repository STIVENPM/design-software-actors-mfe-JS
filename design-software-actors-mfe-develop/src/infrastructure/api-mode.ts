export function demoModeEnabled(): boolean {
  return (import.meta.env.VITE_ACTORS_API_MODE || 'mock') === 'mock'
}
