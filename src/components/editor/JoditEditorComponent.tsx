import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import JoditEditor from "jodit-react";
import { Jodit } from "jodit-react";
import { cn } from "@/lib/utils";
import { VideoUploadDropzone } from "./VideoUploadDropzone";
import { createPortal } from "react-dom";
import { X, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

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
  
  // Overlay delete button state
  const [hoveredMedia, setHoveredMedia] = useState<HTMLElement | null>(null);
  const [deleteButtonPos, setDeleteButtonPos] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const updateDeleteButtonPosition = useCallback((mediaEl: HTMLElement) => {
    if (!wrapperRef.current) return;

    const mediaRect = mediaEl.getBoundingClientRect();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();

    // Place toolbar at the top-left of the element so it doesn't go offscreen.
    setDeleteButtonPos({
      top: Math.max(8, mediaRect.top - wrapperRect.top + 8),
      left: Math.max(8, mediaRect.left - wrapperRect.left + 8),
    });
  }, []);

  useEffect(() => {
    console.log("JoditEditorComponent: onVideoUpload", {
      provided: typeof onVideoUpload === "function",
    });
  }, [onVideoUpload]);

  // Jodit ref becomes available asynchronously; stash the instance in state so effects run reliably.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const ed = editorRef.current?.editor;
      if (ed && ed !== editorInstance) {
        setEditorInstance(ed);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [editorInstance]);

  // Media hover detection for overlay toolbar
  useEffect(() => {
    const editor = editorInstance;
    if (!editor) return;

    const editorArea = (editor.editor as HTMLElement | null) || (editor.workplace as HTMLElement | null);
    if (!editorArea) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mediaEl = target.closest("img, video, iframe") as HTMLElement | null;
      
      if (mediaEl && editorArea.contains(mediaEl)) {
        setHoveredMedia(mediaEl);
        updateDeleteButtonPosition(mediaEl);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      // Don't hide if moving to delete button
      if (relatedTarget?.closest(".media-delete-overlay")) return;
      
      const target = e.target as HTMLElement;
      if (target.closest("img, video, iframe")) {
        // Check if we're still within the same media element
        if (!relatedTarget?.closest("img, video, iframe")) {
          setHoveredMedia(null);
        }
      }
    };

    editorArea.addEventListener("mouseover", handleMouseOver);
    editorArea.addEventListener("mouseout", handleMouseOut);

    return () => {
      editorArea.removeEventListener("mouseover", handleMouseOver);
      editorArea.removeEventListener("mouseout", handleMouseOut);
    };
  }, [editorInstance, updateDeleteButtonPosition]);

  const handleDeleteMedia = useCallback(() => {
    if (!hoveredMedia) return;
    
    const editor = editorRef.current?.editor;
    if (!editor) return;

    hoveredMedia.remove();
    editor.synchronizeValues();
    onChange?.(editor.value);
    setHoveredMedia(null);
  }, [hoveredMedia, onChange]);

  const handleResizeMedia = useCallback((widthPercent: number) => {
    if (!hoveredMedia) return;
    
    const editor = editorRef.current?.editor;
    if (!editor) return;

    hoveredMedia.style.width = `${widthPercent}%`;
    hoveredMedia.style.height = "auto";
    editor.synchronizeValues();
    onChange?.(editor.value);
    
    // Update overlay position after resize
    setTimeout(() => {
      if (hoveredMedia) {
        updateDeleteButtonPosition(hoveredMedia);
      }
    }, 10);
  }, [hoveredMedia, onChange, updateDeleteButtonPosition]);

  const handleAlignMedia = useCallback((align: "left" | "center" | "right") => {
    if (!hoveredMedia) return;
    
    const editor = editorRef.current?.editor;
    if (!editor) return;

    // Ensure block display for alignment to work
    hoveredMedia.style.display = "block";
    hoveredMedia.style.float = "none";

    switch (align) {
      case "left":
        hoveredMedia.style.marginLeft = "0";
        hoveredMedia.style.marginRight = "auto";
        break;
      case "center":
        // For centering: ensure element has reasonable width if it's too wide
        const currentWidth = hoveredMedia.style.width;
        if (!currentWidth || currentWidth === "100%" || currentWidth === "auto") {
          hoveredMedia.style.width = "60%";
          hoveredMedia.style.height = "auto";
        }
        hoveredMedia.style.marginLeft = "auto";
        hoveredMedia.style.marginRight = "auto";
        break;
      case "right":
        hoveredMedia.style.marginLeft = "auto";
        hoveredMedia.style.marginRight = "0";
        break;
    }
    
    editor.synchronizeValues();
    onChange?.(editor.value);
    
    // Update overlay position after alignment change
    setTimeout(() => {
      if (hoveredMedia) {
        updateDeleteButtonPosition(hoveredMedia);
      }
    }, 10);
  }, [hoveredMedia, onChange, updateDeleteButtonPosition]);

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
      
      // Enable resize on img, iframe, table, video - MUST be a Set, not array!
      allowResizeTags: new Set(["img", "iframe", "table", "video"]),
      allowResizeX: true,
      allowResizeY: true,
      
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
      
      // Inline popup for media elements when clicked
      popup: {
        img: Jodit.atom([
          {
            name: "bin",
            icon: "bin",
            tooltip: "Удалить",
            exec: (editor: any) => {
              const img = editor.s.current()?.closest?.("img") || editor.s.current();
              if (img?.nodeName === "IMG") {
                img.remove();
                editor.synchronizeValues();
              }
            },
          },
          "pencil",
          "|",
          "left",
          "center",
          "right",
        ]),
        video: Jodit.atom([
          {
            name: "bin",
            icon: "bin", 
            tooltip: "Удалить видео",
            exec: (editor: any) => {
              const video = editor.s.current()?.closest?.("video") || editor.s.current();
              if (video?.nodeName === "VIDEO") {
                video.remove();
                editor.synchronizeValues();
              }
            },
          },
          "|",
          "left",
          "center",
          "right",
        ]),
        iframe: Jodit.atom([
          {
            name: "bin",
            icon: "bin",
            tooltip: "Удалить",
            exec: (editor: any) => {
              const iframe = editor.s.current()?.closest?.("iframe") || editor.s.current();
              if (iframe?.nodeName === "IFRAME") {
                iframe.remove();
                editor.synchronizeValues();
              }
            },
          },
          "|",
          "left",
          "center",
          "right",
        ]),
      },
      
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
    <div ref={wrapperRef} className={cn("jodit-wrapper relative", className)}>
      <JoditEditor
        ref={editorRef}
        value={initialValue}
        config={config}
        onBlur={handleChange}
      />
      
      {/* Media overlay toolbar */}
      {hoveredMedia && (
        <div
          className="media-delete-overlay absolute z-50 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-1"
          style={{
            top: deleteButtonPos.top,
            left: deleteButtonPos.left,
          }}
          onMouseLeave={() => setHoveredMedia(null)}
        >
          {/* Width presets */}
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              onClick={() => handleResizeMedia(percent)}
              title={`Ширина ${percent}%`}
            >
              {percent}%
            </button>
          ))}
          
          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Alignment buttons */}
          <button
            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            onClick={() => handleAlignMedia("left")}
            title="По левому краю"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            onClick={() => handleAlignMedia("center")}
            title="По центру"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            onClick={() => handleAlignMedia("right")}
            title="По правому краю"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          
          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Delete button */}
          <button
            className="w-7 h-7 flex items-center justify-center bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded transition-all duration-150 hover:scale-110"
            onClick={handleDeleteMedia}
            title="Удалить"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
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
