"use client";

import * as React from "react";
import { Dialog } from "@headlessui/react";
import { Button } from "@/components/ui/Button";

type Options = {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  /** Red confirm button, for deletes and other actions that can't be undone. */
  danger?: boolean;
  /** Ask for the admin password before confirming. */
  password?: boolean;
};

type Pending = Options & { resolve: (value: string | null) => void };

/**
 * Promise-based replacement for window.confirm / window.prompt.
 *
 *   const { confirm, askPassword, dialog } = useConfirm();
 *   if (!(await confirm({ title: "Delete invoice?", danger: true }))) return;
 *   ...
 *   return <>{page}{dialog}</>;
 */
export function useConfirm() {
  const [pending, setPending] = React.useState<Pending | null>(null);

  const open = React.useCallback(
    (options: Options) => new Promise<string | null>((resolve) => setPending({ ...options, resolve })),
    []
  );

  const confirm = React.useCallback(
    async (options: Omit<Options, "password">) => (await open(options)) !== null,
    [open]
  );
  const askPassword = React.useCallback(
    (options: Omit<Options, "password">) => open({ ...options, password: true }),
    [open]
  );

  const close = (value: string | null) => {
    pending?.resolve(value);
    setPending(null);
  };

  const dialog = <ConfirmDialog pending={pending} onClose={close} />;
  return { confirm, askPassword, dialog };
}

function ConfirmDialog({ pending, onClose }: { pending: Pending | null; onClose: (value: string | null) => void }) {
  const [password, setPassword] = React.useState("");
  const inputId = React.useId();
  const titleId = React.useId();

  React.useEffect(() => {
    if (pending) setPassword("");
  }, [pending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending?.password && !password) return;
    onClose(pending?.password ? password : "");
  };

  return (
    <Dialog open={!!pending} onClose={() => onClose(null)} className="relative z-[60]" aria-labelledby={titleId}>
      <div className="fixed inset-0 bg-[#1A1428]/40 backdrop-blur-[2px]" aria-hidden />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
          {pending ? (
            <form onSubmit={submit}>
              <Dialog.Title id={titleId} className="font-heading text-lg font-semibold text-purple-dark">
                {pending.title}
              </Dialog.Title>
              {pending.body ? <div className="mt-2 text-sm leading-relaxed text-gray-dark/80">{pending.body}</div> : null}
              {pending.password ? (
                <div className="mt-4">
                  <label htmlFor={inputId} className="block text-sm font-semibold text-gray-dark">
                    Your password
                  </label>
                  <input
                    id={inputId}
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-medium px-3 py-2 outline-none transition focus:border-purple-dark focus:ring-2 focus:ring-purple-dark/15"
                  />
                </div>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => onClose(null)} autoFocus={!pending.password}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={pending.danger ? "danger" : "primary"}
                  size="sm"
                  disabled={pending.password ? !password : false}
                >
                  {pending.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            </form>
          ) : null}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
