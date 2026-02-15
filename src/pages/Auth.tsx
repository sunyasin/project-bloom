import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Mail, Lock, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type AuthMode = "login" | "register" | "forgot";

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Некорректный email" }).max(255);
const passwordSchema = z.string().min(6, { message: "Минимум 6 символов" }).max(128);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Get initial mode from URL query param
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProducer, setIsProducer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [emailApprovalRequired, setEmailApprovalRequired] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          // Check if this is an email confirmation (has token_hash in URL)
          const hasTokenHash = searchParams.get("token_hash") || location.search.includes("token_hash");
          const isConfirmation = searchParams.get("type") === "signup" || searchParams.get("type") === "email_change";
          const isFromConfirmation = hasTokenHash || isConfirmation;
          
          // Check profile for email_approved status
          const { data: profile } = await supabase
            .from("profiles")
            .select("email_approved, first_name, city_id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          // If this is email confirmation, update email_approved to true
          if (isFromConfirmation) {
            await supabase
              .from("profiles")
              .update({ email_approved: true })
              .eq("user_id", session.user.id);
            
            setEmailConfirmed(true);
            setEmailApprovalRequired(false);
            
            // Redirect to main page after confirmation
            setTimeout(() => {
              navigate("/");
            }, 500);
            return;
          }
          
          // For regular login - check if profile is complete
          setTimeout(() => {
            supabase
              .from("profiles")
              .select("first_name, city_id")
              .eq("user_id", session.user.id)
              .maybeSingle()
              .then(({ data, error }) => {
                // If profile doesn't exist or has no first_name, redirect to dashboard
                if (error || !data?.first_name) {
                  navigate("/dashboard?new=true");
                } else {
                  navigate("/");
                }
              });
          }, 0);
        } else if (session?.user) {
          navigate("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams, location]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0]?.message;
    }

    if (mode !== "forgot") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0]?.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setEmailApprovalRequired(false);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        title: "Ошибка входа",
        description: error.message === "Invalid login credentials" 
          ? "Неверный email или пароль" 
          : error.message,
        variant: "destructive",
      });
    } else if (data?.user) {
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать!",
      });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setEmailApprovalRequired(false);

    // Check if user already exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (!signInError && signInData?.user) {
      // User exists - check if email_approved is false
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_approved")
        .eq("user_id", signInData.user.id)
        .maybeSingle();
      
      if (profile && !profile.email_approved) {
        // Email not approved - show message
        setLoading(false);
        setEmailApprovalRequired(true);
        // Sign out since email is not approved
        await supabase.auth.signOut();
        toast({
          title: "Требуется подтверждение email",
          description: "На указанный адрес уже было выслано письмо для подтверждения. Подтвердите регистрацию по ссылке из письма. Проверьте папку Spam",
          variant: "destructive",
          duration: 10000,
        });
        return;
      }
      
      // User exists and email is approved
      setLoading(false);
      toast({
        title: "Пользователь уже существует",
        description: "Попробуйте войти с существующим аккаунтом",
        variant: "destructive",
      });
      return;
    }

    // Save email for new user profile
    localStorage.setItem("pending_email", email.trim());

    const redirectUrl = `${import.meta.env.VITE_APP_BASE_URL}/auth`;
    //const redirectUrl = "https://dolinabiz.lovable.app/";

    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          is_producer: isProducer,
        },
      },
    });

    if (error) {
      let message = error.message;
      if (error.message.includes("already registered")) {
        message = "Пользователь с таким email уже зарегистрирован";
      } else if (error.message.includes("rate limit")) {
        message = "Слишком много попыток регистрации. Пожалуйста, подождите несколько минут и попробуйте снова, или проверьте папку Spam - письмо для подтверждения уже могло быть отправлено.";
      }
      toast({
        title: "Ошибка регистрации",
        description: message,
        variant: "destructive",
        duration: 10000,
      });
    } else {
      // Create profile - email is auto-confirmed by Supabase
      if (data?.user) {
        await supabase.from("profiles").insert({
          user_id: data.user.id,
          email: email.trim(),
          email_approved: true,
        });
      }

      // Automatically sign in after registration
      let signInError: Error | null = null;
      
      if (data?.session) {
        // Session available - set it manually
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        signInError = setSessionError;
      } else {
        // No session - create timeout to prevent hanging
        const timeoutPromise = new Promise<{ error: Error }>((resolve) => 
          setTimeout(() => resolve({ error: new Error("Превышен таймаут ожидания") }), 10000)
        );
        
        const signInPromise = supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        const result = await Promise.race([signInPromise, timeoutPromise]);
        signInError = result.error;
      }

      if (!signInError) {
        toast({
          title: "Регистрация успешна",
          description: "Добро пожаловать!",
          duration: 5000,
        });
        // Redirect to main page with new=true to trigger profile dialog
        navigate("/?new=true");
      } else {
        toast({
          title: "Ошибка входа",
          description: signInError.message,
          variant: "destructive",
          duration: 10000,
        });
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0]?.message });
      return;
    }
    setErrors({});

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${import.meta.env.VITE_APP_BASE_URL}/auth`,
    });

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Письмо отправлено",
        description: "Проверьте почту для восстановления пароля",
      });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setIsProducer(false);
    setErrors({});
    setEmailApprovalRequired(false);
    setEmailConfirmed(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-start items-center p-4 pt-8 md:pt-4 md:justify-center">
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

          {/* Email approval required message */}
          {(emailApprovalRequired || emailConfirmed) && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${emailConfirmed ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              {emailConfirmed ? (
                <span className="text-green-600 text-sm">
                  ✓ Email подтвержден! Теперь вы можете войти в аккаунт.
                </span>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-amber-800 text-sm">
                    На указанный адрес уже было выслано письмо для подтверждения. Подтвердите регистрацию по ссылке из письма. Проверьте папку Spam.
                  </span>
                </>
              )}
            </div>
          )}

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
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
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
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setPassword("");
                    setErrors({});
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Забыли пароль?
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Вход..." : "Войти"}
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
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
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
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Минимум 6 символов
                </p>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="producer"
                  checked={isProducer}
                  onCheckedChange={(checked) => setIsProducer(checked === true)}
                  disabled={loading}
                />
                <Label
                  htmlFor="producer"
                  className="text-sm font-normal cursor-pointer"
                >
                  Я производитель
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Регистрация..." : "Зарегистрироваться"}
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
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Отправка..." : "Отправить ссылку"}
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
