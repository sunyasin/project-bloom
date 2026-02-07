import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { DEFAULT_BUSINESS_IMAGE } from "../utils/dashboard-utils";

interface BusinessCard {
  id: string;
  name: string;
  content_json: { image?: string } | null;
  status: "published" | "moderation" | "draft";
}

interface BusinessCardsSectionProps {
  businesses: BusinessCard[];
  loading: boolean;
  mainCardId: string | null;
  onCardClick: (id: string) => void;
  onMainCardChange: (id: string, checked: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => Promise<void>;
}

export function BusinessCardsSection({
  businesses,
  loading,
  mainCardId,
  onCardClick,
  onMainCardChange,
  onStatusChange,
  onDelete,
  onCreate,
}: BusinessCardsSectionProps) {
  if (loading) {
    return (
      <div>
        <h2 className="section-title">Мои визитки</h2>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">Мои визитки</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <TooltipProvider>
          {businesses.map((card) => {
            const imageUrl = card.content_json?.image || DEFAULT_BUSINESS_IMAGE;
            return (
              <div key={card.id} className="flex flex-col">
                <button
                  onClick={() => onCardClick(card.id)}
                  className={`content-card hover:border-primary/30 transition-all hover:shadow-md group p-3 text-left relative ${
                    mainCardId === card.id ? "ring-2 ring-primary border-primary" : ""
                  }`}
                >
                  {/* Status badge */}
                  <div
                    className={`absolute top-1 right-1 px-1.5 py-0.5 text-xs rounded ${
                      card.status === "published"
                        ? "bg-green-500/20 text-green-700"
                        : card.status === "moderation"
                          ? "bg-yellow-500/20 text-yellow-700"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {card.status === "published"
                      ? "опубл."
                      : card.status === "moderation"
                        ? "модер."
                        : "черновик"}
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                    <img
                      src={imageUrl}
                      alt={card.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground text-center truncate">{card.name}</p>
                </button>
                <div className="flex items-center justify-between mt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={mainCardId === card.id}
                          onCheckedChange={(checked) => onMainCardChange(card.id, checked === true)}
                        />
                        <span className="text-xs text-muted-foreground">главная</span>
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отображать эту визитку в моей карточке</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newStatus = card.status === "published" ? "draft" : "published";
                            onStatusChange(card.id, newStatus);
                          }}
                        >
                          {card.status === "published" ? (
                            <Eye className="h-3 w-3 text-green-600" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {card.status === "published" ? "Скрыть (перевести в черновик)" : "Опубликовать"}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(card.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Удалить</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </TooltipProvider>
        {/* Create new business card */}
        <button
          onClick={onCreate}
          className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Создать</p>
        </button>
      </div>
    </div>
  );
}
