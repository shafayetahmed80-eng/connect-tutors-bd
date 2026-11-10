import React from "react";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { ExpressTutorRequestCard } from "./ExpressTutorRequestCard";
import type { ExpressRequestSource } from "@shared/express-tutor-request";

export interface ExpressTutorRequestModalProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  source?: ExpressRequestSource;
}

export function ExpressTutorRequestModal({
  open,
  onClose,
  onOpenChange,
  source = "floating_action",
}: ExpressTutorRequestModalProps) {
  if (!open) return null;

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  return (
    <Modal
      onClose={handleClose}
      size="dialog"
      kind="express-tutor-request"
    >
      <ModalHeader
        title="১৫-সেকেন্ডে শিক্ষক খুঁজুন (Express Request)"
      />
      <ModalBody className="p-0 sm:p-2">
        <ExpressTutorRequestCard
          source={source}
          compact
          className="border-0 shadow-none"
          onSuccess={() => {
            // keep open so user sees confirmation or let them close
          }}
        />
      </ModalBody>
    </Modal>
  );
}
