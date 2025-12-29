import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type AuthMode = "login" | "register" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProducer, setIsProducer] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Register attempt:", { email, password, isProducer });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Forgot password:", { email });
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setIsProducer(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">ДП</span>
            </div>
            <span className="font-semibold text-foreground text-xl">
              Долина Производителей
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="content-card">
          {/* Back link for forgot password */}
          {mode === "forgot" && (
            <button
              onClick={() => {
                setMode("login");
                resetForm();
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к входу
            </button>
          )}

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground mb-1">
            {mode === "login" && "Вход в аккаунт"}
            {mode === "register" && "Регистрация"}
            {mode === "forgot" && "Восстановление пароля"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" && "Введите данные для входа"}
            {mode === "register" && "Создайте новый аккаунт"}
            {mode === "forgot" && "Введите email для восстановления"}
          </p>

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setPassword("");
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Забыли пароль?
                </button>
              </div>

              <Button type="submit" className="w-full">
                Войти
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Нет аккаунта?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    resetForm();
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Зарегистрируйтесь
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Минимум 6 символов
                </p>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="producer"
                  checked={isProducer}
                  onCheckedChange={(checked) => setIsProducer(checked === true)}
                />
                <Label
                  htmlFor="producer"
                  className="text-sm font-normal cursor-pointer"
                >
                  Я производитель
                </Label>
              </div>

              <Button type="submit" className="w-full">
                Зарегистрироваться
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Уже есть аккаунт?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    resetForm();
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Войдите
                </button>
              </p>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Отправить ссылку
              </Button>
            </form>
          )}
        </div>

        {/* Back to home */}
        <p className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Вернуться на главную
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
