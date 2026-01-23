import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaOverlayProps {
  editorContainer: HTMLElement | null;
  onDeleteMedia: (element: HTMLElement) => void;
  onContentChange?: () => void;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se" | null;

export const QuillMediaOverlay = ({ editorContainer, onDeleteMedia, onContentChange }: MediaOverlayProps) => {
  const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const initialSizeRef = useRef({ width: 0, height: 0, x: 0, y: 0 });

  const updateOverlayPosition = useCallback((element: HTMLElement) => {
    if (!editorContainer) return;
    
    const rect = element.getBoundingClientRect();
    const containerRect = editorContainer.getBoundingClientRect();
    
    setOverlayPosition({
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [editorContainer]);

  useEffect(() => {
    if (!editorContainer) return;

    let editorContent: Element | null = null;
    let rafId: number | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If pressed inside overlay controls — keep selection
      if (overlayRef.current?.contains(target)) return;

      // Quill иногда перехватывает click на img, поэтому ловим pointerdown в capture
      const media = target.closest("img, video, iframe") as HTMLElement | null;
      if (media) {
        // Prevent Quill selection weirdness on media interaction
        e.preventDefault();
        e.stopPropagation();
        setSelectedMedia(media);
        // Defer to ensure layout is stable
        requestAnimationFrame(() => updateOverlayPosition(media));
        return;
      }

      // Pressed elsewhere — deselect
      setSelectedMedia(null);
    };

    const handleScroll = () => {
      if (selectedMedia) updateOverlayPosition(selectedMedia);
    };

    const attach = () => {
      editorContent = editorContainer.querySelector(".ql-editor");
      if (!editorContent) {
        rafId = window.requestAnimationFrame(attach);
        return;
      }

       // Use capture phase to ensure we get the event before Quill
       editorContent.addEventListener("pointerdown", handlePointerDown, true);
      editorContent.addEventListener("scroll", handleScroll);
    };

    attach();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (editorContent) {
        editorContent.removeEventListener("pointerdown", handlePointerDown, true);
        editorContent.removeEventListener("scroll", handleScroll);
      }
    };
  }, [editorContainer, selectedMedia, updateOverlayPosition]);

  // Update position on window resize
  useEffect(() => {
    if (!selectedMedia) return;

    const handleResize = () => {
      updateOverlayPosition(selectedMedia);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedMedia, updateOverlayPosition]);

  const handleDelete = useCallback(() => {
    if (selectedMedia) {
      onDeleteMedia(selectedMedia);
      setSelectedMedia(null);
    }
  }, [selectedMedia, onDeleteMedia]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedMedia || !editorContainer) return;

    setIsDragging(true);

    const editorContent = editorContainer.querySelector(".ql-editor");
    if (!editorContent) return;

    const mediaRect = selectedMedia.getBoundingClientRect();
    const offsetX = e.clientX - mediaRect.left;
    const offsetY = e.clientY - mediaRect.top;

    // Create a drag ghost
    const ghost = selectedMedia.cloneNode(true) as HTMLElement;
    ghost.style.position = "fixed";
    ghost.style.left = `${mediaRect.left}px`;
    ghost.style.top = `${mediaRect.top}px`;
    ghost.style.width = `${mediaRect.width}px`;
    ghost.style.height = `${mediaRect.height}px`;
    ghost.style.opacity = "0.7";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.id = "media-drag-ghost";
    document.body.appendChild(ghost);

    // Create drop indicator
    const indicator = document.createElement("div");
    indicator.id = "media-drop-indicator";
    indicator.style.cssText = `
      position: absolute;
      height: 3px;
      background: hsl(var(--primary));
      border-radius: 2px;
      pointer-events: none;
      z-index: 100;
      display: none;
    `;
    editorContent.appendChild(indicator);

    // Hide original image during drag
    selectedMedia.style.opacity = "0.3";

    const getDropTarget = (x: number, y: number): { element: Element | null; position: "before" | "after" } => {
      const elements = editorContent.querySelectorAll("p, img, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, div:not(#media-drop-indicator)");
      
      for (const el of elements) {
        if (el === selectedMedia || el.contains(selectedMedia)) continue;
        
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          const midY = rect.top + rect.height / 2;
          return { element: el, position: y < midY ? "before" : "after" };
        }
      }
      
      // If below all elements, append at end
      const lastElement = elements[elements.length - 1];
      if (lastElement) {
        const rect = lastElement.getBoundingClientRect();
        if (y > rect.bottom) {
          return { element: lastElement, position: "after" };
        }
      }
      
      return { element: null, position: "before" };
    };

    let currentDropTarget: { element: Element | null; position: "before" | "after" } = { element: null, position: "before" };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const ghostEl = document.getElementById("media-drag-ghost");
      if (ghostEl) {
        ghostEl.style.left = `${moveEvent.clientX - offsetX}px`;
        ghostEl.style.top = `${moveEvent.clientY - offsetY}px`;
      }

      // Find drop target
      currentDropTarget = getDropTarget(moveEvent.clientX, moveEvent.clientY);
      
      const indicatorEl = document.getElementById("media-drop-indicator");
      if (indicatorEl && currentDropTarget.element) {
        const targetRect = currentDropTarget.element.getBoundingClientRect();
        const containerRect = editorContent.getBoundingClientRect();
        
        indicatorEl.style.display = "block";
        indicatorEl.style.left = "0";
        indicatorEl.style.width = `${containerRect.width}px`;
        
        if (currentDropTarget.position === "before") {
          indicatorEl.style.top = `${targetRect.top - containerRect.top - 2}px`;
        } else {
          indicatorEl.style.top = `${targetRect.bottom - containerRect.top - 1}px`;
        }
      } else if (indicatorEl) {
        indicatorEl.style.display = "none";
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      // Restore original visibility
      if (selectedMedia) {
        selectedMedia.style.opacity = "1";
      }

      // Remove ghost and indicator
      document.getElementById("media-drag-ghost")?.remove();
      document.getElementById("media-drop-indicator")?.remove();

      // Move the element if we have a valid drop target
      if (currentDropTarget.element && selectedMedia) {
        // Wrap img in a <p> if it's not already wrapped
        let elementToMove: HTMLElement = selectedMedia;
        const parent = selectedMedia.parentElement;
        
        if (parent?.tagName !== "P" || parent.children.length > 1) {
          // Create a new paragraph wrapper
          const wrapper = document.createElement("p");
          wrapper.appendChild(selectedMedia.cloneNode(true));
          elementToMove = wrapper;
          selectedMedia.remove();
        } else {
          // Move the whole paragraph
          elementToMove = parent;
        }

        if (currentDropTarget.position === "before") {
          currentDropTarget.element.parentNode?.insertBefore(elementToMove, currentDropTarget.element);
        } else {
          currentDropTarget.element.parentNode?.insertBefore(elementToMove, currentDropTarget.element.nextSibling);
        }

        // Update selected media reference and position
        const newMedia = elementToMove.tagName === "IMG" ? elementToMove : elementToMove.querySelector("img, video, iframe");
        if (newMedia) {
          setSelectedMedia(newMedia as HTMLElement);
          setTimeout(() => updateOverlayPosition(newMedia as HTMLElement), 0);
        } else {
          setSelectedMedia(null);
        }

        // Notify parent of content change
        onContentChange?.();
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [selectedMedia, editorContainer, updateOverlayPosition, onContentChange]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedMedia) return;

    setIsResizing(handle);
    
    const rect = selectedMedia.getBoundingClientRect();
    initialSizeRef.current = {
      width: rect.width,
      height: rect.height,
      x: e.clientX,
      y: e.clientY,
    };

    const aspectRatio = rect.width / rect.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectedMedia) return;

      const deltaX = moveEvent.clientX - initialSizeRef.current.x;
      const deltaY = moveEvent.clientY - initialSizeRef.current.y;

      let newWidth = initialSizeRef.current.width;
      let newHeight = initialSizeRef.current.height;

      // Calculate new size based on handle position
      switch (handle) {
        case "se":
          newWidth = Math.max(50, initialSizeRef.current.width + deltaX);
          newHeight = newWidth / aspectRatio;
          break;
        case "sw":
          newWidth = Math.max(50, initialSizeRef.current.width - deltaX);
          newHeight = newWidth / aspectRatio;
          break;
        case "ne":
          newWidth = Math.max(50, initialSizeRef.current.width + deltaX);
          newHeight = newWidth / aspectRatio;
          break;
        case "nw":
          newWidth = Math.max(50, initialSizeRef.current.width - deltaX);
          newHeight = newWidth / aspectRatio;
          break;
      }

      // Apply size to the element
      selectedMedia.style.width = `${newWidth}px`;
      selectedMedia.style.height = `${newHeight}px`;
      
      // Update overlay position
      updateOverlayPosition(selectedMedia);
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      // Notify parent that content changed (for saving resized dimensions)
      onContentChange?.();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [selectedMedia, updateOverlayPosition, onContentChange]);

  if (!selectedMedia || !editorContainer) return null;

  // Auto-position toolbar: if not enough space at top, show at bottom
  const toolbarHeight = 36; // ~9 * 4px (h-7 + gap)
  const showToolbarBelow = overlayPosition.top < toolbarHeight;

  const resizeHandleClass = "absolute w-3 h-3 bg-primary border-2 border-background rounded-sm pointer-events-auto";

  return (
    <div
      ref={overlayRef}
      className={cn(
        "absolute pointer-events-none z-50 border-2 border-primary rounded transition-all",
        (isDragging || isResizing) && "opacity-70"
      )}
      style={{
        top: overlayPosition.top,
        left: overlayPosition.left,
        width: overlayPosition.width,
        height: overlayPosition.height,
      }}
    >
      {/* Toolbar - auto-positioned above or below */}
      <div 
        className={cn(
          "absolute left-0 flex gap-1 pointer-events-auto",
          showToolbarBelow ? "top-full mt-1" : "-top-9"
        )}
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 cursor-grab active:cursor-grabbing shadow-md"
          onMouseDown={handleDragStart}
          title="Перетащить"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-7 w-7 shadow-md"
          onClick={handleDelete}
          title="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Resize handles */}
      <div
        className={cn(resizeHandleClass, "top-[-6px] left-[-6px] cursor-nw-resize")}
        onMouseDown={(e) => handleResizeStart(e, "nw")}
      />
      <div
        className={cn(resizeHandleClass, "top-[-6px] right-[-6px] cursor-ne-resize")}
        onMouseDown={(e) => handleResizeStart(e, "ne")}
      />
      <div
        className={cn(resizeHandleClass, "bottom-[-6px] left-[-6px] cursor-sw-resize")}
        onMouseDown={(e) => handleResizeStart(e, "sw")}
      />
      <div
        className={cn(resizeHandleClass, "bottom-[-6px] right-[-6px] cursor-se-resize")}
        onMouseDown={(e) => handleResizeStart(e, "se")}
      />
    </div>
  );
};