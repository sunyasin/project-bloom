import { useRef, useMemo, useCallback } from "react";
import JoditEditor from "jodit-react";
import { cn } from "@/lib/utils";

interface JoditEditorComponentProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  placeholder?: string;
  className?: string;
}

export const JoditEditorComponent = ({
  initialValue = "",
  onChange,
  placeholder = "Начните вводить текст...",
  className,
}: JoditEditorComponentProps) => {
  const editorRef = useRef<any>(null);

  const config = useMemo(
    () => ({
      readonly: false,
      placeholder,
      height: 400,
      language: "ru",
      
      // Toolbar buttons
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "|",
        "font",
        "fontsize",
        "paragraph",
        "|",
        "image",
        "video",
        "link",
        "|",
        "align",
        "|",
        "undo",
        "redo",
        "|",
        "hr",
        "eraser",
        "fullsize",
      ],
      
      // Image settings with resize
      imageDefaultWidth: 300,
      resizer: {
        showSize: true,
        hideSizeTimeout: 2000,
        useAspectRatio: true,
        forImageChangeAttributes: true,
        min_width: 50,
        min_height: 50,
      },
      
      // Enable image resize on img, iframe, table
      allowResizeTags: new Set(["img", "iframe", "table", "jodit"]),
      
      // Image uploader - insert as base64
      uploader: {
        insertImageAsBase64URI: true,
        imagesExtensions: ["jpg", "png", "jpeg", "gif", "svg", "webp"],
      },
      
      // Drag and drop settings
      enableDragAndDropFileToEditor: true,
      
      // Disable some features
      askBeforePasteFromWord: false,
      askBeforePasteHTML: false,
      defaultActionOnPaste: "insert_clear_html" as const,
      
      // Custom CSS for the editor
      editorClassName: "jodit-editor-content",
    }),
    [placeholder]
  );

  const handleChange = useCallback(
    (newContent: string) => {
      if (onChange) {
        onChange(newContent);
      }
    },
    [onChange]
  );

  return (
    <div className={cn("jodit-wrapper", className)}>
      <JoditEditor
        ref={editorRef}
        value={initialValue}
        config={config}
        onBlur={handleChange}
      />
    </div>
  );
};

export default JoditEditorComponent;
