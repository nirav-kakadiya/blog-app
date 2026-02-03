'use client';

import { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ImageBubbleMenuProps {
  editor: Editor;
}

export function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const [showAltInput, setShowAltInput] = useState(false);
  const [altText, setAltText] = useState('');
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      const { state, view } = editor;
      const { selection } = state;

      if (selection instanceof NodeSelection && selection.node?.type.name === 'image') {
        setIsImageSelected(true);

        // Get the DOM node for the selected image
        const domNode = view.nodeDOM(selection.from) as HTMLElement;
        if (domNode) {
          const rect = domNode.getBoundingClientRect();
          const editorRect = view.dom.getBoundingClientRect();
          
          setMenuPosition({
            top: rect.top - editorRect.top - 50,
            left: rect.left - editorRect.left + rect.width / 2,
          });
        }
      } else {
        setIsImageSelected(false);
        setShowAltInput(false);
      }
    };

    updateMenu();

    editor.on('selectionUpdate', updateMenu);
    editor.on('update', updateMenu);

    return () => {
      editor.off('selectionUpdate', updateMenu);
      editor.off('update', updateMenu);
    };
  }, [editor]);

  const deleteImage = useCallback(() => {
    editor.chain().focus().deleteSelection().run();
  }, [editor]);

  const updateAlt = useCallback(() => {
    const { state } = editor;
    const { selection } = state;

    if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
      const node = selection.node;
      const pos = selection.from;
      const newAttrs = {
        ...node.attrs,
        alt: altText,
      };
      
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, newAttrs);
          return true;
        })
        .run();
      
      setShowAltInput(false);
      setAltText('');
    }
  }, [editor, altText]);

  const openAltInput = useCallback(() => {
    const { state } = editor;
    const { selection } = state;

    if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
      const node = selection.node;
      setAltText(node.attrs.alt || '');
      setShowAltInput(true);
    }
  }, [editor]);

  if (!editor || !isImageSelected) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 pointer-events-none"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-2 flex items-center gap-2 pointer-events-auto">
        {!showAltInput ? (
          <>
            <button
              onClick={openAltInput}
              className="px-3 py-1.5 rounded hover:bg-gray-700 transition-colors text-sm flex items-center gap-1"
              title="Edit alt text"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Alt Text
            </button>
            
            <div className="w-px h-6 bg-gray-700" />
            
            <button
              onClick={deleteImage}
              className="px-3 py-1.5 rounded hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
              title="Delete image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  updateAlt();
                } else if (e.key === 'Escape') {
                  setShowAltInput(false);
                  setAltText('');
                }
              }}
              placeholder="Alt text..."
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={updateAlt}
              className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowAltInput(false);
                setAltText('');
              }}
              className="px-2 py-1 text-gray-400 hover:text-gray-200 text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
