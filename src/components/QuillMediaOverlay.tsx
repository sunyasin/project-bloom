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

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked on media element (img or video/iframe)
      if (target.tagName === "IMG" || target.tagName === "VIDEO" || target.tagName === "IFRAME") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedMedia(target);
        updateOverlayPosition(target);
        return;
      }
      
      // Check if clicked inside overlay
      if (overlayRef.current?.contains(target)) {
        return;
      }
      
      // Clicked elsewhere - deselect
      setSelectedMedia(null);
    };

    const handleScroll = () => {
      if (selectedMedia) {
        updateOverlayPosition(selectedMedia);
      }
    };

    const editorContent = editorContainer.querySelector(".ql-editor");
    if (editorContent) {
      editorContent.addEventListener("click", handleClick);
      editorContent.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (editorContent) {
        editorContent.removeEventListener("click", handleClick);
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
    if (!selectedMedia) return;
    
    setIsDragging(true);
    
    const mediaRect = selectedMedia.getBoundingClientRect();
    
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
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const ghostEl = document.getElementById("media-drag-ghost");
      if (ghostEl) {
        ghostEl.style.left = `${moveEvent.clientX - mediaRect.width / 2}px`;
        ghostEl.style.top = `${moveEvent.clientY - mediaRect.height / 2}px`;
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      const ghostEl = document.getElementById("media-drag-ghost");
      if (ghostEl) {
        ghostEl.remove();
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [selectedMedia]);

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
      {/* Toolbar */}
      <div className="absolute -top-9 left-0 flex gap-1 pointer-events-auto">
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