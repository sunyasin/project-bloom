import { useEffect, useRef, useCallback, useState } from "react";
import EditorJS, { OutputData, API } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import Paragraph from "@editorjs/paragraph";
import DragDrop from "editorjs-drag-drop";
import { cn } from "@/lib/utils";
import { ResizableImage, ResizableImageData } from "./ResizableImageTool";

interface EditorJSComponentProps {
  initialData?: OutputData;
  onChange?: (data: OutputData) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  placeholder?: string;
  className?: string;
}

export const EditorJSComponent = ({
  initialData,
  onChange,
  onImageUpload,
  placeholder = "Начните вводить текст...",
  className,
}: EditorJSComponentProps) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Custom image uploader for the image tool
  const createImageUploader = useCallback(() => {
    return {
      uploadByFile: async (file: File) => {
        if (onImageUpload) {
          const url = await onImageUpload(file);
          if (url) {
            return {
              success: 1,
              file: { url },
            };
          }
        }
        return { success: 0 };
      },
      uploadByUrl: async (url: string) => {
        return {
          success: 1,
          file: { url },
        };
      },
    };
  }, [onImageUpload]);

  useEffect(() => {
    if (!holderRef.current || editorRef.current) return;

    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder,
      data: initialData,
      tools: {
        header: {
          class: Header as any,
          inlineToolbar: true,
          config: {
            levels: [1, 2, 3],
            defaultLevel: 2,
          },
        },
        list: {
          class: List as any,
          inlineToolbar: true,
        },
        quote: {
          class: Quote as any,
          inlineToolbar: true,
        },
        paragraph: {
          class: Paragraph as any,
          inlineToolbar: true,
        },
        image: {
          class: ResizableImage as any,
          config: {
            uploader: createImageUploader(),
          },
        },
      },
      onReady: () => {
        setIsReady(true);
        // Initialize drag-drop after editor is ready
        new DragDrop(editor);
      },
      onChange: async (api: API) => {
        if (onChange) {
          const data = await api.saver.save();
          onChange(data);
        }
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Handle external drag-and-drop for images
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/") && onImageUpload && editorRef.current && isReady) {
        const url = await onImageUpload(file);
        if (url) {
          // Insert image block at the end
          await editorRef.current.blocks.insert("image", {
            file: { url },
            caption: "",
            withBorder: false,
            withBackground: false,
            stretched: false,
            width: undefined,
          } as ResizableImageData);
        }
      }
    },
    [onImageUpload, isReady]
  );

  return (
    <div
      className={cn(
        "editorjs-wrapper rounded-lg border bg-background transition-all",
        isDragging ? "border-primary bg-primary/5" : "border-border",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div ref={holderRef} className="min-h-[300px] px-4 py-2" />
    </div>
  );
};

export default EditorJSComponent;
