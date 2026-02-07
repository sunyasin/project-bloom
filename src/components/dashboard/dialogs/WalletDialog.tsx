import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  History,
  Key,
  Image,
  ChevronRight,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from "lucide-react";
import { KASSA_PAYMENT_INSTRUCTION } from "@/config/kassa_payment";
import type { WalletMode, UserOption, TransactionHistoryItem, TransactionViewMode } from "../types/dashboard-types";

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  profileId: string | null;
  allUsers: UserOption[];
  transactionHistory: TransactionHistoryItem[];
  transactionsLoading: boolean;
  transactionViewMode: TransactionViewMode;
  onTransfer: (recipientId: string, amount: number, message: string) => Promise<void>;
  onReceiveCoinRequest: (amount: number, message: string, imageFile: File | null) => Promise<void>;
  onLoadTransactions: (mode: TransactionViewMode) => Promise<void>;
  onTransactionViewModeChange: (mode: TransactionViewMode) => void;
  onDecodeHash: (hash: string) => Promise<void>;
  hashInput: string;
  setHashInput: (value: string) => void;
  decodedResult: string | null;
  hashError: string;
  decoding: boolean;
  onViewTransactionHash: (hash: string | null) => void;
  selectedTransactionHash: string | null;
}

export function WalletDialog({
  open,
  onOpenChange,
  balance,
  profileId,
  allUsers,
  transactionHistory,
  transactionsLoading,
  transactionViewMode,
  onTransfer,
  onReceiveCoinRequest,
  onLoadTransactions,
  onTransactionViewModeChange,
  onDecodeHash,
  hashInput,
  setHashInput,
  decodedResult,
  hashError,
  decoding,
  onViewTransactionHash,
  selectedTransactionHash,
}: WalletDialogProps) {
  const [walletMode, setWalletMode] = useState<WalletMode>("transfer");
  const [showReceiveInstruction, setShowReceiveInstruction] = useState(false);
  const [receiveImageFile, setReceiveImageFile] = useState<File | null>(null);
  const [receiveImagePreview, setReceiveImagePreview] = useState<string | null>(null);
  const [receiveImageError, setReceiveImageError] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [showHashDialog, setShowHashDialog] = useState(false);
  const receiveImageInputRef = useRef<HTMLInputElement>(null);

  const handleTransfer = async () => {
    setTransferError("");
    const amount = parseInt(transferAmount, 10);
    if (!amount || amount <= 0) {
      setTransferError("Введите корректную сумму");
      return;
    }
    if (amount > balance) {
      setTransferError("Недостаточно средств на балансе");
      return;
    }
    if (!selectedRecipient) {
      setTransferError("Выберите получателя");
      return;
    }
    if (!profileId) {
      setTransferError("Профиль не найден");
      return;
    }

    setTransferring(true);
    await onTransfer(selectedRecipient, amount, transferMessage);
    setTransferAmount("");
    setTransferMessage("");
    setSelectedRecipient("");
    setTransferring(false);
  };

  const handleReceiveCoinRequest = async () => {
    setTransferError("");
    const amount = parseInt(transferAmount, 10);
    if (!amount || amount <= 0) {
      setTransferError("Введите корректную сумму");
      return;
    }
    if (!receiveImageFile) {
      setTransferError("Прикрепите скриншот квитанции");
      return;
    }
    if (!profileId) {
      setTransferError("Профиль не найден");
      return;
    }

    setTransferring(true);
    await onReceiveCoinRequest(amount, transferMessage, receiveImageFile);
    setTransferAmount("");
    setTransferMessage("");
    setReceiveImageFile(null);
    setReceiveImagePreview(null);
    setWalletMode("transfer");
    setTransferring(false);
  };

  const handleReceiveImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setReceiveImageError(null);
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setReceiveImageError("Допустимые форматы: JPEG, PNG, WebP, GIF");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setReceiveImageError("Максимальный размер файла: 10MB");
      return;
    }

    setReceiveImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiveImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setWalletMode("transfer");
      setShowReceiveInstruction(false);
      setReceiveImageFile(null);
      setReceiveImagePreview(null);
      setReceiveImageError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Кошелёк</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Баланс: {balance} долей</p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onLoadTransactions(transactionViewMode);
                setShowHashDialog(false);
              }}
            >
              <History className="h-4 w-4 mr-1" />
              Транзакции
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setHashInput("");
                setShowHashDialog(true);
              }}
            >
              <Key className="h-4 w-4 mr-1" />
              Проверить хэш
            </Button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mt-2">
          <Button
            variant={walletMode === "transfer" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => {
              setWalletMode("transfer");
              setTransferError("");
            }}
          >
            Перевести
          </Button>
          <Button
            variant={walletMode === "receive" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => {
              setWalletMode("receive");
              setTransferError("");
            }}
          >
            Получить
          </Button>
        </div>

        <div className="space-y-4 mt-4">
          {walletMode === "transfer" ? (
            <>
              {/* Transfer Mode */}
              <div className="space-y-2">
                <Label>Кому перевести:</Label>
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Выберите получателя</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Сумма:</Label>
                <Input
                  type="number"
                  min="1"
                  max={balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Введите сумму"
                />
              </div>

              <div className="space-y-2">
                <Label>Сообщение (необязательно):</Label>
                <Input
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  placeholder="Комментарий к переводу"
                  maxLength={200}
                />
              </div>

              {transferError && <p className="text-sm text-destructive">{transferError}</p>}

              <Button onClick={handleTransfer} className="w-full" disabled={transferring}>
                {transferring ? "Отправка..." : "Отправить"}
              </Button>
            </>
          ) : (
            <>
              {/* Receive Mode */}
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() => setShowReceiveInstruction(!showReceiveInstruction)}
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${showReceiveInstruction ? "rotate-90" : ""}`} />
                  Инструкция
                </button>
                {showReceiveInstruction && (
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                    {KASSA_PAYMENT_INSTRUCTION}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Сумма:</Label>
                <Input
                  type="number"
                  min="1"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Введите сумму для получения"
                />
              </div>

              <div className="space-y-2">
                <Label>Скриншот квитанции (обязательно):</Label>
                <input
                  type="file"
                  ref={receiveImageInputRef}
                  onChange={handleReceiveImageSelect}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />

                {receiveImagePreview ? (
                  <div className="relative">
                    <img
                      src={receiveImagePreview}
                      alt="Квитанция"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => {
                        setReceiveImageFile(null);
                        setReceiveImagePreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20 border-dashed"
                    onClick={() => receiveImageInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Нажмите для загрузки (до 10MB)</span>
                    </div>
                  </Button>
                )}

                {receiveImageError && <p className="text-sm text-destructive">{receiveImageError}</p>}
              </div>

              <div className="space-y-2">
                <Label>Сообщение (необязательно):</Label>
                <Input
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  placeholder="Комментарий к запросу"
                  maxLength={200}
                />
              </div>

              {transferError && <p className="text-sm text-destructive">{transferError}</p>}

              <Button onClick={handleReceiveCoinRequest} className="w-full" disabled={transferring}>
                {transferring ? "Отправка..." : "Отправить запрос"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>

      {/* Hash Decode Dialog */}
      <Dialog open={showHashDialog} onOpenChange={setShowHashDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Проверка и декодирование хешей
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Хеш для декодирования</Label>
              <Textarea
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Вставьте hex-хеш из таблицы coins..."
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            {hashError && <p className="text-sm text-destructive">{hashError}</p>}

            {decodedResult &&
              (() => {
                const parts = decodedResult.split("_");
                const dateTime = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0] || "";
                const amount = parts[2] || "";
                const userBalance = parts[3] || "";
                const totalBalance = parts[4] || "";
                const uuid = parts.slice(5).join("_") || "";

                return (
                  <div className="space-y-3">
                    <Label>Результат декодирования:</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Дата и время:</span>
                        <span className="font-mono text-sm font-medium">{dateTime}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Сумма:</span>
                        <span className={`font-mono text-sm font-medium ${parseInt(amount) >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {parseInt(amount) >= 0 ? "+" : ""}
                          {amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Баланс пользователя:</span>
                        <span className="font-mono text-sm font-medium">{userBalance}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Общий баланс:</span>
                        <span className="font-mono text-sm font-medium">{totalBalance}</span>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground block mb-1">UUID пользователя:</span>
                        <span className="font-mono text-xs break-all">{uuid}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            <Button onClick={() => onDecodeHash(hashInput)} className="w-full" disabled={decoding}>
              <Search className="h-4 w-4 mr-2" />
              {decoding ? "Декодирование..." : "Декодировать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions History Dialog */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              История транзакций
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={transactionViewMode === "transfers" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => onTransactionViewModeChange("transfers")}
            >
              Переводы
            </Button>
            <Button
              variant={transactionViewMode === "exchanges" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => onTransactionViewModeChange("exchanges")}
            >
              Обмены
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {transactionsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>
            ) : transactionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {transactionViewMode === "transfers" ? "Переводов пока нет" : "Обменов пока нет"}
              </p>
            ) : (
              transactionHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      item.type === "transfer_out" || item.amount < 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-green-500/10 text-green-600"
                    }`}
                  >
                    {item.type === "transfer_out" || item.amount < 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.type === "transfer_out" && `Перевод → ${item.counterparty || "Пользователь"}`}
                      {item.type === "transfer_in" && `Получено от ${item.counterparty || "Пользователь"}`}
                      {item.type === "coin_exchange" && (item.amount > 0 ? "Пополнение" : "Списание")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          item.type === "transfer_out" || item.amount < 0 ? "text-destructive" : "text-green-600"
                        }`}
                      >
                        {item.amount > 0 ? "+" : ""}
                        {item.amount}
                      </p>
                      {item.balance_after !== undefined && (
                        <p className="text-xs text-muted-foreground">Баланс: {item.balance_after}</p>
                      )}
                    </div>
                    {item.hash && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onViewTransactionHash(item.hash || null)}
                        title="Показать hash"
                      >
                        <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hash View Dialog */}
      <Dialog open={!!selectedTransactionHash} onOpenChange={() => onViewTransactionHash(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Hash операции
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={selectedTransactionHash || ""}
              readOnly
              className="font-mono text-xs h-32 resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (selectedTransactionHash) {
                  navigator.clipboard.writeText(selectedTransactionHash);
                  alert("Hash скопирован");
                }
              }}
            >
              Копировать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
