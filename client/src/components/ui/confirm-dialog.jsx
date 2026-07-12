import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/feedback';

// Controlled confirmation dialog. Pass `open`, `onOpenChange`, and `onConfirm`.
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
