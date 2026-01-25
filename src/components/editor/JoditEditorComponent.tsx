import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import JoditEditor from "jodit-react";
import { cn } from "@/lib/utils";
import { VideoUploadDropzone } from "./VideoUploadDropzone";
import { createPortal } from "react-dom";

interface JoditEditorComponentProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  onVideoUpload?: (file: File) => Promise<string | null>;
  placeholder?: string;
  className?: string;
}

export const JoditEditorComponent = ({
  initialValue = "",
  onChange,
  onVideoUpload,
  placeholder = "Начните вводить текст...",
  className,
}: JoditEditorComponentProps) => {
  const editorRef = useRef<any>(null);
  const [showVideoDropzone, setShowVideoDropzone] = useState(false);
  const [dropzonePosition, setDropzonePosition] = useState({ top: 0, left: 0 });
  const videoButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleVideoInsert = useCallback((videoHtml: string) => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.selection.insertHTML(videoHtml);
      onChange?.(editorRef.current.editor.value);
    }
    setShowVideoDropzone(false);
  }, [onChange]);

  const config = useMemo(
    () => ({
      readonly: false,
      placeholder,
      height: 400,
      language: "ru",
      
      // Custom buttons
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
        {
          name: "customVideo",
          iconURL: "",
          tooltip: "Вставить видео",
          exec: (editor: any) => {
            // Find the button element in toolbar
            const toolbar = editor.container.querySelector(".jodit-toolbar__box");
            const buttons = toolbar?.querySelectorAll(".jodit-toolbar-button");
            let buttonRect = { top: 100, left: 100 };
            
            buttons?.forEach((btn: HTMLElement) => {
              if (btn.querySelector('[aria-label="Вставить видео"]')) {
                buttonRect = btn.getBoundingClientRect();
              }
            });
            
            setDropzonePosition({
              top: buttonRect.top + 40,
              left: Math.max(10, buttonRect.left - 120),
            });
            setShowVideoDropzone(true);
          },
        },
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
      
      // Enable image resize on img, iframe, table, video
      allowResizeTags: new Set(["img", "iframe", "table", "jodit", "video"]),
      
      // Image uploader - insert as base64 (can be overridden)
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
      
      // Controls config for custom video button
      controls: {
        customVideo: {
          name: "customVideo",
          icon: "video",
          tooltip: "Вставить видео",
        },
      },
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

  // Close dropzone on click outside
  useEffect(() => {
    if (!showVideoDropzone) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".video-dropzone-container")) {
        setShowVideoDropzone(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVideoDropzone]);

  return (
    <div className={cn("jodit-wrapper relative", className)}>
      <JoditEditor
        ref={editorRef}
        value={initialValue}
        config={config}
        onBlur={handleChange}
      />
      
      {showVideoDropzone && createPortal(
        <div
          className="video-dropzone-container fixed z-[9999]"
          style={{
            top: dropzonePosition.top,
            left: dropzonePosition.left,
          }}
        >
          <VideoUploadDropzone
            onVideoInsert={handleVideoInsert}
            onUpload={onVideoUpload}
            onClose={() => setShowVideoDropzone(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default JoditEditorComponent;
