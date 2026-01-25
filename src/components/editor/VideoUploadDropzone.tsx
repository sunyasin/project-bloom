import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Video, Upload, Link, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VideoUploadDropzoneProps {
  onVideoInsert: (videoHtml: string) => void;
  onUpload?: (file: File) => Promise<string | null>;
  onClose: () => void;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

export const VideoUploadDropzone = ({
  onVideoInsert,
  onUpload,
  onClose,
}: VideoUploadDropzoneProps) => {
  // Debug: helps confirm whether upload callback is actually wired from the parent
  console.log("VideoUploadDropzone: mounted", { hasOnUpload: typeof onUpload === "function" });

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateVideo = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { valid: false, error: "Неподдерживаемый формат. Используйте MP4, WebM или OGG" };
    }
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: "Файл слишком большой. Максимум 50MB" };
    }
    return { valid: true };
  };

  const handleUpload = async (file: File) => {
    console.log("VideoUploadDropzone: handleUpload called", { fileName: file.name, fileSize: file.size, fileType: file.type });
    
    const validation = validateVideo(file);
    if (!validation.valid) {
      console.log("VideoUploadDropzone: validation failed", validation.error);
      setError(validation.error || "Ошибка валидации");
      return;
    }

    if (!onUpload) {
      console.error("VideoUploadDropzone: onUpload callback is not provided");
      setError("Функция загрузки не настроена");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      console.log("VideoUploadDropzone: starting upload...");
      const url = await onUpload(file);
      console.log("VideoUploadDropzone: upload result", url);
      
      if (url) {
        const videoHtml = `<p><video controls style="display: block; max-width: 100%; height: auto; margin: 16px 0;"><source src="${url}" type="${file.type}">Ваш браузер не поддерживает видео.</video></p>`;
        onVideoInsert(videoHtml);
        onClose();
      } else {
        setError("Не удалось загрузить видео");
      }
    } catch (err) {
      console.error("Video upload error:", err);
      setError("Ошибка при загрузке видео");
    } finally {
      setIsUploading(false);
    }
  };

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
      if (file && file.type.startsWith("video/")) {
        await handleUpload(file);
      } else {
        setError("Перетащите видео файл");
      }
    },
    [onUpload]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const parseVideoUrl = (url: string): string | null => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Rutube
    const rutubeMatch = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
    if (rutubeMatch) {
      return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
    }

    // Direct video URL
    if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
      return url;
    }

    return null;
  };

  const handleUrlInsert = () => {
    if (!videoUrl.trim()) {
      setError("Введите URL видео");
      return;
    }

    const embedUrl = parseVideoUrl(videoUrl.trim());
    if (!embedUrl) {
      setError("Неподдерживаемый URL. Используйте YouTube, Vimeo, Rutube или прямую ссылку на видео");
      return;
    }

    let videoHtml: string;
    if (embedUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
      videoHtml = `<p><video controls style="display: block; max-width: 100%; height: auto; margin: 16px 0;"><source src="${embedUrl}">Ваш браузер не поддерживает видео.</video></p>`;
    } else {
      videoHtml = `<p><iframe src="${embedUrl}" frameborder="0" allowfullscreen style="display: block; width: 100%; height: 315px; max-width: 560px; margin: 16px 0;"></iframe></p>`;
    }

    onVideoInsert(videoHtml);
    onClose();
  };

  return (
    <div className="w-80 p-4 bg-popover border border-border rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Вставить видео</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="h-3 w-3 mr-1" />
            Загрузка
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs">
            <Link className="h-3 w-3 mr-1" />
            По ссылке
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Загрузка...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Video className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Перетащите видео сюда
                </p>
                <p className="text-xs text-muted-foreground/70">
                  или нажмите для выбора
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  MP4, WebM, OGG • до 50MB
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-3 space-y-3">
          <Input
            placeholder="https://youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              setError("");
            }}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            YouTube, Vimeo, Rutube или прямая ссылка
          </p>
          <Button onClick={handleUrlInsert} className="w-full" size="sm">
            Вставить
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </div>
  );
};

export default VideoUploadDropzone;
