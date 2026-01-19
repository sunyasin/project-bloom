import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaOverlayProps {
  editorContainer: HTMLElement | null;
  onDeleteMedia: (element: HTMLElement) => void;
}

export const QuillMediaOverlay = ({ editorContainer, onDeleteMedia }: MediaOverlayProps) => {
  const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

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
    
    // Store original position for visual feedback
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

  if (!selectedMedia || !editorContainer) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        "absolute pointer-events-none z-50 border-2 border-primary rounded transition-all",
        isDragging && "opacity-50"
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
    </div>
  );
};
