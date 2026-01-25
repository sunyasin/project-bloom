import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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

    const findMediaAtPoint = (x: number, y: number): HTMLElement | null => {
      const elAtPoint = document.elementFromPoint(x, y) as HTMLElement | null;
      const direct = elAtPoint?.closest("img, video, iframe") as HTMLElement | null;
      if (direct) return direct;

      const scope = editorContainer.querySelector(".ql-editor");
      if (!scope) return null;

      const mediaEls = scope.querySelectorAll<HTMLElement>("img, video, iframe");
      for (const m of mediaEls) {
        const r = m.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return m;
      }
      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (overlayRef.current?.contains(target)) return;

      const media = findMediaAtPoint(e.clientX, e.clientY);
      if (media) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedMedia(media);
        requestAnimationFrame(() => updateOverlayPosition(media));
        return;
      }

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

      let newWidth = initialSizeRef.current.width;
      let newHeight = initialSizeRef.current.height;

      switch (handle) {
        case "se":
        case "ne":
          newWidth = Math.max(50, initialSizeRef.current.width + deltaX);
          newHeight = newWidth / aspectRatio;
          break;
        case "sw":
        case "nw":
          newWidth = Math.max(50, initialSizeRef.current.width - deltaX);
          newHeight = newWidth / aspectRatio;
          break;
      }

      selectedMedia.style.width = `${newWidth}px`;
      selectedMedia.style.height = `${newHeight}px`;
      
      updateOverlayPosition(selectedMedia);
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      onContentChange?.();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [selectedMedia, updateOverlayPosition, onContentChange]);

  if (!selectedMedia || !editorContainer) return null;

  const toolbarHeight = 36;
  const showToolbarBelow = overlayPosition.top < toolbarHeight;

  const resizeHandleClass = "absolute w-3 h-3 bg-primary border-2 border-background rounded-sm pointer-events-auto";

  return (
    <div
      ref={overlayRef}
      className={cn(
        "absolute pointer-events-none z-50 border-2 border-primary rounded transition-all",
        isResizing && "opacity-70"
      )}
      style={{
        top: overlayPosition.top,
        left: overlayPosition.left,
        width: overlayPosition.width,
        height: overlayPosition.height,
      }}
    >
      {/* Toolbar - delete only */}
      <div 
        className={cn(
          "absolute left-0 flex gap-1 pointer-events-auto",
          showToolbarBelow ? "top-full mt-1" : "-top-9"
        )}
      >
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
