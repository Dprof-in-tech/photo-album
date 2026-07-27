import { createContext } from 'react';

/**
 * When true, ImageSlot/Spread render in print mode: no upload chrome, no dashed
 * placeholders, no page shadow/scale — just the photos and copy, one 16×8in
 * spread per sheet. The album provides this; Photo Drop never does.
 */
export const PrintContext = createContext(false);
