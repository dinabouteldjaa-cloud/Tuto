import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { IconButton } from "@/components/IconButton";

function HeadingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <text x="3" y="18" fontSize="16" fontWeight="800" fill="currentColor" fontFamily="sans-serif">
        H
      </text>
    </svg>
  );
}

function BoldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <text x="6" y="18" fontSize="16" fontWeight="800" fill="currentColor" fontFamily="sans-serif">
        B
      </text>
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <text
        x="7"
        y="18"
        fontSize="16"
        fontWeight="700"
        fontStyle="italic"
        fill="currentColor"
        fontFamily="serif"
      >
        I
      </text>
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="4.5" cy="6" r="1.4" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.4" fill="currentColor" />
      <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <text x="1.5" y="8.5" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="sans-serif">
        1
      </text>
      <text x="1.5" y="14.5" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="sans-serif">
        2
      </text>
      <text x="1.5" y="20.5" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="sans-serif">
        3
      </text>
      <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 8l1.4 1.4L8.6 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3.5" y="14.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 8h7M13.5 18h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HighlightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 16.5 4.5 20M9.5 12.5l4.8-6.2a1.6 1.6 0 0 1 2.4-.2l1.2 1.2a1.6 1.6 0 0 1-.2 2.4l-6.2 4.8-2.9-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 20.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Minimal, mobile-first rich text editor with a fixed toolbar:
 * Heading, Bold, Italic, Bullet list, Numbered list, Checklist, Highlight.
 *
 * `content` is used only as the editor's initial value — callers should
 * only mount this once the real initial content is known (e.g. after an
 * async note load finishes), rather than trying to update it reactively.
 */
export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Highlight.configure({ HTMLAttributes: { class: "tuto-highlight" } }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tuto-rich-editor",
      },
    },
  });

  const activeState = useEditorState({
    editor,
    selector: (ctx) => ({
      heading: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
      bulletList: ctx.editor?.isActive("bulletList") ?? false,
      orderedList: ctx.editor?.isActive("orderedList") ?? false,
      taskList: ctx.editor?.isActive("taskList") ?? false,
      highlight: ctx.editor?.isActive("highlight") ?? false,
    }),
  });

  if (!editor) return null;

  const toolbarButtons = [
    {
      key: "heading",
      icon: <HeadingIcon />,
      label: "Heading",
      active: activeState?.heading,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "bold",
      icon: <BoldIcon />,
      label: "Bold",
      active: activeState?.bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      icon: <ItalicIcon />,
      label: "Italic",
      active: activeState?.italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: "bulletList",
      icon: <BulletListIcon />,
      label: "Bullet list",
      active: activeState?.bulletList,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: "orderedList",
      icon: <NumberedListIcon />,
      label: "Numbered list",
      active: activeState?.orderedList,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      key: "taskList",
      icon: <ChecklistIcon />,
      label: "Checklist",
      active: activeState?.taskList,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      key: "highlight",
      icon: <HighlightIcon />,
      label: "Highlight",
      active: activeState?.highlight,
      onClick: () => editor.chain().focus().toggleHighlight().run(),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "var(--space-2xs)",
          overflowX: "auto",
          paddingBottom: "var(--space-xs)",
          marginBottom: "var(--space-xs)",
          borderBottom: "1px solid var(--color-border)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {toolbarButtons.map((btn) => (
          <IconButton
            key={btn.key}
            icon={btn.icon}
            aria-label={btn.label}
            active={btn.active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={btn.onClick}
            style={{ flexShrink: 0 }}
          />
        ))}
      </div>

      <EditorContent editor={editor} />

      <style>{`
        .tuto-rich-editor {
          font-family: var(--font-body);
          font-size: var(--text-md);
          line-height: 1.6;
          color: var(--color-text-primary);
          min-height: 40vh;
          outline: none;
        }
        .tuto-rich-editor p {
          margin: 0 0 var(--space-sm) 0;
        }
        .tuto-rich-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--color-text-tertiary);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tuto-rich-editor h2 {
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: 700;
          margin: var(--space-sm) 0;
        }
        .tuto-rich-editor ul,
        .tuto-rich-editor ol {
          padding-left: var(--space-lg);
          margin: 0 0 var(--space-sm) 0;
        }
        .tuto-rich-editor li {
          margin-bottom: var(--space-2xs);
        }
        .tuto-rich-editor ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .tuto-rich-editor ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: var(--space-xs);
        }
        .tuto-rich-editor ul[data-type="taskList"] li > label {
          display: flex;
          align-items: center;
          margin-top: 3px;
        }
        .tuto-rich-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--color-primary);
        }
        .tuto-rich-editor ul[data-type="taskList"] li > div {
          flex: 1;
        }
        .tuto-rich-editor ul[data-type="taskList"] li[data-checked="true"] > div {
          color: var(--color-text-tertiary);
          text-decoration: line-through;
        }
        .tuto-highlight {
          background: var(--color-warning-surface);
          border-radius: 3px;
          padding: 0 2px;
        }
      `}</style>
    </div>
  );
}
