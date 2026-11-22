"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
export function Dialog({
  open,
  onClose,
  title,
  drawer = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  drawer?: boolean;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={
            drawer
              ? "filter-drawer accessible-drawer"
              : "modal accessible-modal"
          }
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
