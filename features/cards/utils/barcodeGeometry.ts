/**
 * The barcode renderer's own geometry
 * Story 22.3: Card Detail
 *
 * Two numbers `BarcodeRenderer` draws by, held here so a screen sizing a code around them reads the
 * same values rather than restating them: card detail fits its bars inside the white card from
 * these, and a renderer that changed either would otherwise overrun the card's hairline silently.
 */

/** The smallest QR code the renderer draws, whatever size it is asked for — a scanner's floor. */
export const MIN_QR_SIZE = 220;

/** The white padding the renderer adds each side of a drawn code, beyond the width it is given. */
export const RENDERER_SIDE_PADDING = 16;
