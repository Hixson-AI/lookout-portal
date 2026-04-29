import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Users } from 'lucide-react';
import { api } from '../../lib/api';
import type { OperatorRole } from '../../lib/api/tenants';

interface Tenant {
  id: string;
  name: string;
}

interface TeamTabProps {
  tenant: Tenant;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500',
  operator: 'bg-blue-500',
  viewer: 'bg-gray-500',
};

export function TeamTab({ tenant }: TeamTabProps) {
  const [operators, setOperators] = useState<OperatorRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchOperators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const fetchOperators = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getOperators(tenant.id);
      setOperators(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.addOperator(tenant.id, email.trim(), role);
      setIsDialogOpen(false);
      setEmail('');
      setRole('operator');
      fetchOperators();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add operator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (operator: OperatorRole) => {
    if (!confirm(`Remove ${operator.email} from this tenant?`)) return;
    try {
      await api.removeOperator(tenant.id, operator.id);
      fetchOperators();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove operator');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading team...</div>;
  }

  if (error) {
    return <div className="text-center py-8" style={{ color: 'var(--accent)' }}>{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            Team
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage operator access to this tenant.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a new team member to this tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'operator' | 'viewer')}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="viewer">Viewer — read-only</option>
                <option value="operator">Operator — manage apps and keys</option>
                <option value="admin">Admin — full access including team</option>
              </select>
            </div>
            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}
            <Button onClick={handleAdd} disabled={isSubmitting || !email.trim()} className="w-full">
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {operators.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-lg font-semibold mb-2">No team members</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Add an operator to grant access to this tenant.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {operators.map((op) => (
            <Card key={op.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold uppercase">
                  {op.email[0]}
                </div>
                <div>
                  <p className="font-medium">{op.email}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Added {new Date(op.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${ROLE_COLORS[op.role]} text-white capitalize`}>
                  {op.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(op)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
