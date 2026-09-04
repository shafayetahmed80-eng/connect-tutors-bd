import React from "react";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";

/**
 * The shell the Hire a tutor journey lives in — a thin caller of the shared
 * `<Modal>` at its widest tier.
 *
 * It carries a header and a scrolling body and nothing else: the journey brings
 * its own step tracker and its own Back / Continue / Send request row, so a
 * footer here would compete with them. That is why no `<ModalFooter>` is
 * rendered.
 *
 * Closing never discards anything. The journey saves its draft to session
 * storage as the Guardian types, so a sheet dismissed halfway reopens where it
 * was left.
 */
export function GuardianHireSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal size="lg" onClose={onClose}>
      <ModalHeader title={title} />
      <ModalBody>{children}</ModalBody>
    </Modal>
  );
}
