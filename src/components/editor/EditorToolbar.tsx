import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Image, Video, Heading2, List, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  onInsertImage: () => void;
  onInsertVideo: () => void;
  onInsertHeader: () => void;
  onInsertList: () => void;
  onInsertQuote: () => void;
  disabled?: boolean;
  className?: string;
}

export const EditorToolbar = ({
  onInsertImage,
  onInsertVideo,
  onInsertHeader,
  onInsertList,
  onInsertQuote,
  disabled = false,
  className,
}: EditorToolbarProps) => {
  const tools = [
    { icon: Image, label: "Изображение", onClick: onInsertImage },
    { icon: Video, label: "Видео", onClick: onInsertVideo },
    { icon: Heading2, label: "Заголовок", onClick: onInsertHeader },
    { icon: List, label: "Список", onClick: onInsertList },
    { icon: Quote, label: "Цитата", onClick: onInsertQuote },
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-1 p-2 bg-muted/50 border border-border rounded-t-lg",
        className
      )}
    >
      {tools.map((tool) => (
        <Tooltip key={tool.label}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={tool.onClick}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <tool.icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{tool.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
