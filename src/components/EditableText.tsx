import { memo, useContext, useEffect, useRef } from 'react';
import { getTextStore } from '@/lib/text';
import { PrintContext } from './PrintContext';

/**
 * User-editable copy block. All captions/quotes/names in the album are editable
 * content (README: playful default copy is intentional, kept as editable
 * defaults). Persisted to the shared R2-backed text store, so edits sync across
 * devices and show up in the print-to-PDF output.
 *
 * contentEditable and React's virtual DOM fight over the element's children, so
 * the content is rendered exactly ONCE (defaultText, for SSR + hydration) and
 * then owned imperatively: the saved value is written in on load, remote changes
 * are applied via subscription (unless the user is mid-edit), and edits are read
 * back on blur. Memoized so a parent re-render (e.g. toggling page numbers) never
 * reconciles the children and wipes an edit.
 */
function EditableTextImpl({
  id,
  defaultText,
  as: Tag = 'span',
  style,
  multiline = false,
}: {
  id: string;
  defaultText: string;
  as?: keyof HTMLElementTagNameMap;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const isPrint = useContext(PrintContext);

  useEffect(() => {
    const store = getTextStore();
    let alive = true;
    const apply = () => {
      const el = ref.current;
      if (!alive || !el) return;
      // Never clobber an in-progress edit on this element.
      if (document.activeElement === el) return;
      const v = store.get(id);
      el.textContent = v != null ? v : defaultText;
    };
    store.load().then(apply);
    const unsub = store.subscribe((changedId) => {
      if (changedId === id) apply();
    });
    return () => {
      alive = false;
      unsub();
    };
    // defaultText intentionally excluded: the child node already carries it, and
    // re-running would clobber a saved/edited value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const commit = () => {
    getTextStore().set(id, ref.current?.textContent ?? '');
  };

  // In print mode the copy is static (no editing, no affordance) so the PDF and
  // /print view stay clean.
  return (
    // @ts-expect-error dynamic tag name
    <Tag
      ref={ref}
      className={isPrint ? undefined : 'editable-text'}
      contentEditable={!isPrint}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={isPrint ? undefined : commit}
      onKeyDown={
        isPrint
          ? undefined
          : (e: React.KeyboardEvent) => {
              if (!multiline && e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }
      }
      style={{ outline: 'none', cursor: isPrint ? undefined : 'text', ...style }}
    >
      {defaultText}
    </Tag>
  );
}

// Memoized: parent re-renders with identical props must not reconcile the
// contentEditable children (which would erase in-progress edits).
const EditableText = memo(EditableTextImpl);
export default EditableText;
