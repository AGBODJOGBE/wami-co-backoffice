"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { ToastViewport } from "./toast";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof sizeClasses;
  children: ReactNode;
  footer?: ReactNode;
  hideCloseButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  hideCloseButton = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function handleClick(e: MouseEvent) {
      if (e.target === dialog) onClose();
    }
    function handleCancel(e: Event) {
      e.preventDefault();
      onClose();
    }
    dialog.addEventListener("click", handleClick);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("click", handleClick);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 m-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-0 text-[color:var(--foreground)] shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "open:animate-[modal-in_180ms_ease-out]",
        "backdrop:open:animate-[backdrop-in_180ms_ease-out]",
        "max-h-[90vh] w-[calc(100vw-2rem)]",
        sizeClasses[size],
      )}
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] px-6 py-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {description}
              </p>
            ) : null}
          </div>
          {!hideCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] bg-[color:var(--muted)]/30 px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>

      {/* The browser top-layer (open <dialog>) hides every fixed element
          rendered outside of it, including the global ToastViewport. We
          mount a second viewport here so toasts triggered by Server Actions
          inside the modal stay visible. */}
      {open ? <ToastViewport insideTopLayer /> : null}
    </dialog>
  );
}
