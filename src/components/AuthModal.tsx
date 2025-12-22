import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AuthModal = ({ open, onOpenChange, onSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    password: "",
    contactPhone: "",
  });

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
            contact_phone: formData.contactPhone || null,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // El trigger en Supabase se encarga de crear el registro en distributors
      // usando los metadatos proporcionados en signUp opciones.

      toast({
        title: "¡Cuenta creada con éxito!",
        description: "Ya puedes ver el presupuesto de tu campaña.",
      });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-cinema text-3xl text-primary">
            {mode === "register" ? "Crea tu cuenta de distribuidora" : "Iniciar sesión"}
          </DialogTitle>
          <DialogDescription className="text-cinema-ivory">
            {mode === "register"
              ? "Solo te pedimos los datos imprescindibles para mostrarte el presupuesto estimado de tu campaña. El resto lo podremos completar juntos más adelante."
              : "Accede a tu cuenta para ver el presupuesto de tu campaña."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={mode === "register" ? handleRegister : handleLogin} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-cinema-ivory">
                  Nombre de la distribuidora / empresa *
                </Label>
                <Input
                  id="companyName"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-cinema-ivory">
                  Nombre de la persona de contacto *
                </Label>
                <Input
                  id="contactName"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-cinema-ivory">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-background/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-cinema-ivory">
              Contraseña *
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-background/50 border-border"
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-cinema-ivory">
                Teléfono (opcional)
              </Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="bg-background/50 border-border"
              />
            </div>
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
                  ? "Crear cuenta y ver presupuesto"
                  : "Entrar y ver presupuesto"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode(mode === "register" ? "login" : "register")}
              className="w-full text-cinema-ivory hover:text-primary"
            >
              {mode === "register" ? "Ya tengo cuenta, iniciar sesión" : "No tengo cuenta, registrarme"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
