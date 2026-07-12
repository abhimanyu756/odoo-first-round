import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui/feedback';
import { Hammer } from 'lucide-react';

// Temporary placeholder used until each screen is implemented in its phase.
export default function Placeholder({ title, description }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState
          icon={Hammer}
          title="Coming together"
          description="This screen is being built out in an upcoming phase."
        />
      </div>
    </div>
  );
}
