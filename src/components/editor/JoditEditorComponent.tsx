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
  const savedSelectionRef = useRef<unknown>(null);
  const savedContentRef = useRef<string>("");
  const [showVideoDropzone, setShowVideoDropzone] = useState(false);
  const [dropzonePosition, setDropzonePosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Debug: helps catch cases where onVideoUpload becomes undefined unexpectedly
    console.log("JoditEditorComponent: onVideoUpload", {
      provided: typeof onVideoUpload === "function",
    });
  }, [onVideoUpload]);

  const handleVideoInsert = useCallback(
    (videoHtml: string) => {
      const editor = editorRef.current?.editor;

      if (!editor) {
        console.error("JoditEditorComponent: editor instance is missing");
        setShowVideoDropzone(false);
        return;
      }

      console.log("JoditEditorComponent: handleVideoInsert called", { videoHtml: videoHtml.substring(0, 100) });

      // When interacting with a portal, the editor loses focus and selection becomes undefined.
      // The most reliable approach is to append to editor.value directly.
      try {
        // Try to focus and restore selection first
        if (typeof editor.focus === "function") {
          editor.focus();
        }

        // Attempt to restore saved selection
        let insertedViaSelection = false;
        try {
          const restore = editor?.selection?.restore;
          if (typeof restore === "function" && savedSelectionRef.current) {
            restore.call(editor.selection, savedSelectionRef.current);
          }
          
          // Try insertion via selection
          const insertViaS = editor?.s?.insertHTML;
          if (typeof insertViaS === "function") {
            insertViaS.call(editor.s, videoHtml);
            insertedViaSelection = true;
            console.log("JoditEditorComponent: inserted via s.insertHTML");
          }
        } catch (e) {
          console.warn("JoditEditorComponent: selection-based insertion failed", e);
        }

        // Fallback: append to end of content if selection insertion didn't work
        if (!insertedViaSelection) {
          // Use saved content (before portal opened) to avoid losing existing content
          const currentValue = savedContentRef.current || editor.value || "";
          editor.value = currentValue + videoHtml;
          console.log("JoditEditorComponent: appended to editor.value");
        }

        onChange?.(editor.value);
        console.log("JoditEditorComponent: video inserted successfully");
      } catch (e) {
        console.error("JoditEditorComponent: failed to insert video HTML", e);
      } finally {
        setShowVideoDropzone(false);
      }
    },
    [onChange]
  );

  // Video button handler - outside useMemo to avoid stale closures
  const handleVideoButtonClick = useCallback((editor: any, close: () => void) => {
    // Save content BEFORE opening portal; otherwise editor may lose content on focus loss
    savedContentRef.current = editor?.value || "";
    console.log("JoditEditorComponent: saved content length", savedContentRef.current.length);

    // Save selection BEFORE opening portal; otherwise editor may lose selection
    try {
      const save = editor?.selection?.save;
      if (typeof save === "function") {
        savedSelectionRef.current = save.call(editor.selection);
      } else {
        savedSelectionRef.current = null;
      }
    } catch (e) {
      savedSelectionRef.current = null;
      console.warn("JoditEditorComponent: selection save failed", e);
    }

    const toolbar = editor.container.querySelector(".jodit-toolbar__box");
    const videoBtn = toolbar?.querySelector('[data-ref="video"]') 
      || toolbar?.querySelector('.jodit-toolbar-button_video');
    
    let buttonRect = { top: 100, left: 100 };
    if (videoBtn) {
      buttonRect = videoBtn.getBoundingClientRect();
    }
    
    setDropzonePosition({
      top: buttonRect.top + 40,
      left: Math.max(10, buttonRect.left - 120),
    });
    setShowVideoDropzone(true);
    close();
  }, []);

  const config = useMemo(
    () => ({
      readonly: false,
      placeholder,
      height: 400,
      language: "ru",
      
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
      
      controls: {
        video: {
          popup: (editor: any, _current: any, close: () => void) => {
            handleVideoButtonClick(editor, close);
            return false;
          },
          tooltip: "Вставить видео",
        },
      },
    }),
    [placeholder, handleVideoButtonClick]
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
