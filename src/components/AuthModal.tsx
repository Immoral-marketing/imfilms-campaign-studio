import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  skipOtp?: boolean;
}

type AuthMode = "register" | "login" | "resetPassword";
type RegisterStep = "email" | "verification" | "details";

const AuthModal = ({ open, onOpenChange, onSuccess, skipOtp = false }: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>("register");
  const [registerStep, setRegisterStep] = useState<RegisterStep>(skipOtp ? "details" : "email");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("+34");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    password: "",
    contactPhone: "",
    verificationCode: "",
  });

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user already exists (optional, mostly handled by auth error, but good UX)
      // For now, let's just proceed to send code. 
      // If they exist, they'll get an error on final signup step or we can check here.
      // But standard security practice is not to reveal user existence.

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "verification_code",
          recipientEmail: formData.email,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Error al enviar código");

      toast({
        title: "Código enviado",
        description: `Hemos enviado un código de 4 dígitos a ${formData.email}`,
      });

      setRegisterStep("verification");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al enviar código",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.verificationCode.length !== 4) {
      toast({
        variant: "destructive",
        title: "Código incompleto",
        description: "El código debe tener 4 dígitos.",
      });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "verify_code",
          recipientEmail: formData.email,
          code: formData.verificationCode,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Código inválido");

      toast({
        title: "¡Email verificado!",
        description: "Por favor completa tus datos para crear la cuenta.",
      });

      setRegisterStep("details");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verificación fallida",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            company_name: formData.companyName,
            contact_name: formData.contactName,
            contact_phone: `${countryCode} ${formData.contactPhone}`,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      toast({
        title: "¡Cuenta creada con éxito!",
        description: "Ya puedes ver el presupuesto de tu campaña.",
      });

      // Reset state on success
      setRegisterStep("email");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al crear la cuenta",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: "¡Bienvenido de nuevo!",
        description: "Ya puedes ver el presupuesto de tu campaña.",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: (import.meta.env.VITE_SITE_URL || window.location.origin) + "/reset-password",
      });

      if (error) throw error;

      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });

      setMode("login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al enviar correo",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setRegisterStep("email");
    setFormData(prev => ({ ...prev, verificationCode: "" }));
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        // Optional: Reset flow when closing? Maybe keep verify state?
        // Let's keep it simple for now.    
      }
    }}>
      <DialogContent className="sm:max-w-[500px] bg-background border-primary/20">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {mode === "register" && registerStep !== "email" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (registerStep === "details") setRegisterStep("verification");
                  else if (registerStep === "verification") setRegisterStep("email");
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle className="font-cinema text-3xl text-primary">
              {mode === "register" && "Crea tu cuenta"}
              {mode === "login" && "Iniciar sesión"}
              {mode === "resetPassword" && "Recuperar contraseña"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-cinema-ivory">
            {mode === "register"
              ? skipOtp ? "Completa tus datos para crear la cuenta."
                : registerStep === "email" ? "Introduce tu email para comenzar. Te enviaremos un código de verificación."
                  : registerStep === "verification" ? `Introduce el código de 4 dígitos enviado a ${formData.email}`
                    : "Completa tus datos para finalizar el registro."
              : mode === "login"
                ? "Accede a tu cuenta para ver el presupuesto de tu campaña."
                : "Ingresa tu email para recibir instrucciones de recuperación."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={
            mode === "register"
              ? (registerStep === "email" ? handleSendVerification :
                registerStep === "verification" ? handleVerifyCode :
                  handleRegister)
              : mode === "login" ? handleLogin :
                handleResetPassword
          }
          className="space-y-4"
        >
          {/* REGISTER FLOW */}
          {mode === "register" && (
            <>
              {registerStep === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-cinema-ivory">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-background/50 border-border"
                    placeholder="tu@email.com"
                  />
                </div>
              )}

              {registerStep === "verification" && (
                <div className="space-y-4 py-2">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={4}
                      value={formData.verificationCode}
                      onChange={(val) => setFormData({ ...formData, verificationCode: val })}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="w-14 h-14 text-2xl border-primary/50" />
                        <InputOTPSlot index={1} className="w-14 h-14 text-2xl border-primary/50" />
                        <InputOTPSlot index={2} className="w-14 h-14 text-2xl border-primary/50" />
                        <InputOTPSlot index={3} className="w-14 h-14 text-2xl border-primary/50" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      className="text-sm text-muted-foreground hover:text-primary underline"
                    >
                      ¿No recibiste el código? Reenviar
                    </button>
                  </div>
                </div>
              )}

              {registerStep === "details" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                  {skipOtp && (
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-cinema-ivory">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        autoFocus
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-background/50 border-border"
                        placeholder="tu@email.com"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-cinema-ivory">Nombre de la distribuidora / empresa *</Label>
                    <Input
                      id="companyName"
                      required
                      autoFocus
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName" className="text-cinema-ivory">Nombre de la persona de contacto *</Label>
                    <Input
                      id="contactName"
                      required
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-cinema-ivory">Contraseña *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-background/50 border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-cinema-ivory">Teléfono *</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-[100px] bg-background/50 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+34">🇪🇸 +34</SelectItem>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                          <SelectItem value="+33">🇫🇷 +33</SelectItem>
                          <SelectItem value="+49">🇩🇪 +49</SelectItem>
                          <SelectItem value="+39">🇮🇹 +39</SelectItem>
                          <SelectItem value="+351">🇵🇹 +351</SelectItem>
                          <SelectItem value="+52">🇲🇽 +52</SelectItem>
                          <SelectItem value="+54">🇦🇷 +54</SelectItem>
                          <SelectItem value="+55">🇧🇷 +55</SelectItem>
                          <SelectItem value="+56">🇨🇱 +56</SelectItem>
                          <SelectItem value="+57">🇨🇴 +57</SelectItem>
                          <SelectItem value="+58">🇻🇪 +58</SelectItem>
                          <SelectItem value="+51">🇵🇪 +51</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="contactPhone"
                        type="tel"
                        required
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        className="bg-background/50 border-border flex-1"
                        placeholder="612 345 678"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* LOGIN / RESET */}
          {mode !== "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-cinema-ivory">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>

              {mode === "login" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-cinema-ivory">Contraseña *</Label>
                    <button
                      type="button"
                      onClick={() => setMode("resetPassword")}
                      className="text-xs text-muted-foreground hover:text-primary underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-background/50 border-border pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cinema-yellow hover:bg-cinema-yellow/90 text-black font-semibold"
            >
              {loading
                ? "Procesando..."
                : mode === "register"
                  ? (skipOtp ? "Crear cuenta y ver presupuesto"
                    : registerStep === "email" ? "Enviar código de verificación"
                      : registerStep === "verification" ? "Verificar código"
                        : "Crear cuenta y ver presupuesto")
                  : mode === "login"
                    ? "Entrar y ver presupuesto"
                    : "Enviar correo de recuperación"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (mode === "resetPassword") setMode("login");
                else {
                  setMode(mode === "register" ? "login" : "register");
                  resetFlow();
                }
              }}
              className="w-full text-cinema-ivory hover:bg-cinema-yellow hover:text-black"
            >
              {mode === "register"
                ? "Ya tengo cuenta, iniciar sesión"
                : mode === "login"
                  ? "No tengo cuenta, registrarme"
                  : "Volver a iniciar sesión"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
