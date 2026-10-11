import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import ModalSizePreview from "@/components/ModalSizePreview";
import SiteLimitEditor from "@/components/SiteLimitEditor";

/**
 * The pixel sizes of the one dialog shell every panel shares.
 *
 * They sit on their own screen rather than under Limits because they are not a
 * cap on anything a person may choose - nothing is refused for exceeding them.
 * They are the shape of a window, and an Owner looking for that will not look
 * under "Limits". The drawing beside the rows follows what is typed, so a size
 * can be judged before it is saved.
 */
export default function AdminDynamicModals() {
  return <AdminDynamicSectionPage
    title="Modals"
  >
    <SiteLimitEditor groups={["Modals"]} aside={limits => <ModalSizePreview limits={limits} />} />
  </AdminDynamicSectionPage>;
}
