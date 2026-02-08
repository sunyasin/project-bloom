import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import JoditEditor from "jodit-react";
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
    // Initial video upload check
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

    // Disable Jodit popup on media element click
    const handleMediaClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("img, video, iframe")) {
        // Prevent Jodit's default popup behavior
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const handleMediaMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("img, video, iframe")) {
        // Prevent popup on mousedown as well
        e.stopPropagation();
      }
    };

    editorArea.addEventListener("click", handleMediaClick);
    editorArea.addEventListener("mousedown", handleMediaMouseDown);

    // Disable Jodit popup by intercepting window events
    const handleWindowPopup = (e: any) => {
      // Check if this is Jodit popup creation
      if (e.detail && e.detail.args && Array.isArray(e.detail.args)) {
        const args = e.detail.args;
        // Check if popup is being created for image/video/iframe
        const hasImagePopup = args.some((arg: any) => 
          arg && typeof arg === 'object' && 
          (arg.img !== undefined || arg.tag === 'IMG' || arg.nodeName === 'IMG')
        );
        if (hasImagePopup) {
          e.stopImmediatePropagation();
        }
      }
    };

    // Use MutationObserver to hide any Jodit popups that appear (except our custom media-delete-overlay)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const el = node as Element;
            // Check for Jodit popup classes, but NOT our custom media-delete-overlay
            if ((el.classList?.contains('jodit-popup') || 
                 el.querySelector?.('.jodit-popup__content')) &&
                !el.classList?.contains('media-delete-overlay')) {
              console.log("[Jodit] Found Jodit popup node, hiding it");
              el.remove();
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also use interval to catch any popups that might be created in shadow DOM or with different classes
    const intervalId = setInterval(() => {
      // Since Jodit popup is in shadow DOM, we can't access it directly
      // This interval is kept for any regular DOM elements
    }, 100); // Check every 100ms
    
    // Intercept clicks at window level to prevent Jodit popup from showing
    const handleWindowEvent = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Handle both mouse and touch events
      let img = null;
      if (e.type === 'touchstart' || e.type === 'touchend') {
        const touch = (e as TouchEvent).touches?.[0] || (e as TouchEvent).changedTouches?.[0];
        if (touch) {
          img = document.elementFromPoint(touch.clientX, touch.clientY);
        }
      } else {
        img = target.closest('img');
      }
      
      if (img && img.closest('.jodit-wysiwyg')) {
        // Can't prevent default easily from here, but we can track it
      }
    };
    
    window.addEventListener('click', handleWindowEvent);
    window.addEventListener('mousedown', handleWindowEvent);

    return () => {
      editorArea.removeEventListener("mouseover", handleMouseOver);
      editorArea.removeEventListener("mouseout", handleMouseOut);
      editorArea.removeEventListener("click", handleMediaClick);
      editorArea.removeEventListener("mousedown", handleMediaMouseDown);
      observer.disconnect();
      clearInterval(intervalId);
      window.removeEventListener('click', handleWindowEvent);
      window.removeEventListener('mousedown', handleWindowEvent);
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

    // Get the actual media element (not a wrapper)
    const actualMedia = hoveredMedia.tagName === "IMG" || hoveredMedia.tagName === "VIDEO" || hoveredMedia.tagName === "IFRAME" 
      ? hoveredMedia 
      : hoveredMedia.querySelector("img, video, iframe") as HTMLElement;

    if (!actualMedia) return;

    // Strategy: Wrap image in a <p> block with text-align for reliable centering
    let wrapper = actualMedia.parentElement;
    
    // Check if already wrapped in a suitable block element
    const isAlreadyWrapped = wrapper && (wrapper.tagName === "P" || wrapper.tagName === "DIV") && wrapper.contains(actualMedia);
    
    if (!isAlreadyWrapped) {
      // Create a new wrapper paragraph for the image
      const newWrapper = editor.create.element("p");
      newWrapper.style.textAlign = align;
      newWrapper.style.margin = "0 auto";
      newWrapper.style.padding = "8px 0";
      
      // Insert wrapper before the media element and move media into it
      actualMedia.parentNode?.insertBefore(newWrapper, actualMedia);
      newWrapper.appendChild(actualMedia);
      wrapper = newWrapper;
    } else {
      // Update existing wrapper's text-align
      wrapper.style.textAlign = align;
      
      // Reset margin for centered alignment
      if (align === "center") {
        wrapper.style.margin = "0 auto";
        actualMedia.style.marginLeft = "auto";
        actualMedia.style.marginRight = "auto";
      } else if (align === "left") {
        wrapper.style.margin = "0";
        actualMedia.style.marginLeft = "0";
        actualMedia.style.marginRight = "auto";
      } else if (align === "right") {
        wrapper.style.margin = "0";
        actualMedia.style.marginLeft = "auto";
        actualMedia.style.marginRight = "0";
      }
    }

    // For non-centered alignments, also set float on the media element
    if (align === "left") {
      actualMedia.style.float = "left";
      actualMedia.style.clear = "both";
    } else if (align === "right") {
      actualMedia.style.float = "right";
      actualMedia.style.clear = "both";
    } else {
      actualMedia.style.float = "none";
      actualMedia.style.clear = "none";
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
      
      // Inline popup for media elements when clicked - DISABLED
      // popup: {
      //   img: Jodit.atom([...]),
      //   video: Jodit.atom([...]),
      //   iframe: Jodit.atom([...]),
      // },
      
      controls: {
        video: {
          popup: (editor: any, _current: any, close: () => void) => {
            handleVideoButtonClick(editor, close);
            return false;
          },
          tooltip: "Вставить видео",
        },
      },
      
      // Events to block default popup behavior
      events: {
        beforeOpenPopup: (editor: any, popupType: string, ...args: any[]) => {
          // Block popup for images
          if (popupType === 'image' || 
              popupType === 'Image' || 
              popupType === 'single-image' ||
              popupType === 'imageProperties' ||
              popupType === 'image-properties' ||
              String(popupType).toLowerCase().includes('image')) {
            return false; // Block this popup
          }
        },
        'openPopup.popup': (editor: any) => {
          // Try to close any popup that opens
          setTimeout(() => {
            if (editor.popup && typeof editor.popup.close === 'function') {
              editor.popup.close();
            }
          }, 0);
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
          className="media-delete-overlay jodit-popup absolute z-50 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-1"
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
