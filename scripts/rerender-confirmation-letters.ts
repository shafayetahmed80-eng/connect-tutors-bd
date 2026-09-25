/**
 * Redraws every issued and superseded Confirmation Letter in the current
 * design, from the snapshot each was issued with - same content, Letter ID and
 * issue date. A letter's PDF is drawn once, when it is issued, so a design
 * change otherwise reaches only letters issued after it.
 *
 *   pnpm exec tsx scripts/rerender-confirmation-letters.ts
 *
 * Run it from the checkout whose `.local-storage` holds the letters (or with
 * LOCAL_STORAGE_DIR pointing there). Re-runnable.
 */
import "dotenv/config";
import { rerenderConfirmationLetters } from "../server/db";

const { redrawn, total } = await rerenderConfirmationLetters();
console.log(`Redrew ${redrawn} of ${total} confirmation letters.`);
process.exit(0);
