import { PageHeader } from '../components/layout/PageHeader';
import { PageState } from '../components/ui/page-state';
import { useTenantContext } from '../contexts/TenantContext';

interface ActivityEvent {
  id: string;
  type: 'run' | 'deploy' | 'secret' | 'user';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

export function ActivityFeed() {
  const { currentTenant } = useTenantContext();

  if (!currentTenant) {
    return <PageState variant="loading" />;
  }

  // Placeholder data - will be replaced with API call
  const events: ActivityEvent[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        breadcrumbs={[
          { label: currentTenant.name, to: `/${currentTenant.slug}` },
          { label: 'Activity' },
        ]}
      />

      {events.length === 0 ? (
        <PageState
          variant="empty"
          title="No activity yet"
          description="Recent activity will appear here"
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{event.description}</div>
                  {event.user && <div className="text-xs text-muted-foreground mt-2">by {event.user}</div>}
                </div>
                <div className="text-xs text-muted-foreground">{event.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
