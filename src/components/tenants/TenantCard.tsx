import { Tenant } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Building2, Calendar } from 'lucide-react';

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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{tenant.name}</CardTitle>
          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
            {tenant.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{tenant.tier}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
