import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { NewsFormData } from "@/hooks/use-news";

interface NewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: NewsFormData;
  onSave: () => Promise<void>;
  onFieldChange: (field: keyof NewsFormData, value: string | boolean) => void;
}

export function NewsDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
  onFieldChange,
}: NewsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData.title ? "Редактирование новости" : "Создание новости"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="news-title">Заголовок</Label>
            <Input
              id="news-title"
              value={initialData.title}
              onChange={(e) => onFieldChange("title", e.target.value)}
              placeholder="Заголовок новости"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="news-content">Содержание</Label>
            <Textarea
              id="news-content"
              value={initialData.content}
              onChange={(e) => onFieldChange("content", e.target.value)}
              placeholder="Текст новости..."
              rows={4}
            />
          </div>

          {/* Event Date */}
          <div className="space-y-2">
            <Label htmlFor="news-date">Дата события</Label>
            <Input
              id="news-date"
              type="date"
              value={initialData.event_date}
              onChange={(e) => onFieldChange("event_date", e.target.value)}
            />
          </div>

          {/* Is Event Flag */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="news-is-event"
              checked={initialData.is_event}
              onCheckedChange={(checked) => onFieldChange("is_event", checked === true)}
            />
            <Label htmlFor="news-is-event" className="cursor-pointer">
              Это событие
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
