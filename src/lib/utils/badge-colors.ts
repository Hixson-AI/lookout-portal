export function getProviderBadgeColor(provider: string): string {
  return provider === 'openrouter' ? 'bg-blue-500' : 'bg-purple-500';
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-500';
    case 'disabled': return 'bg-yellow-500';
    case 'revoked': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}
