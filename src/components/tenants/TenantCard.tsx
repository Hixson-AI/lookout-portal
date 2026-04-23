import type { Tenant } from '../../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Building2, Calendar, Activity } from 'lucide-react';

interface TenantCardProps {
  tenant: Tenant;
  onClick: () => void;
}

export function TenantCard({ tenant, onClick }: TenantCardProps) {
  return (
    <Card
      className="cursor-pointer card-hover card-elevated"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{tenant.name}</CardTitle>
          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
            <Activity className="h-3 w-3 mr-1" />
            {tenant.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="capitalize">{tenant.tier}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
