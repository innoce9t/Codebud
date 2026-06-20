import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Button, Modal } from './ui';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  function settle(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!pending} onClose={() => settle(false)} title={pending?.opts.title ?? ''}>
        {pending?.opts.message && <p className="mb-5 text-sm text-slate-600">{pending.opts.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={() => settle(false)}>
            {pending?.opts.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={pending?.opts.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
            {pending?.opts.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm used outside ConfirmProvider');
  return ctx;
}
