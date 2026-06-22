import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

interface CreateDistributorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_WIZARD_SECRET;

const CreateDistributorModal = ({ open, onOpenChange, onSuccess }: CreateDistributorModalProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    companyName: "",
    contactName: "",
    password: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.companyName || !form.contactName) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: form.email,
          companyName: form.companyName,
          contactName: form.contactName,
          contactPhone: form.phone,
          tempPassword: form.password || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error === "already_exists") {
          toast.error("Ya existe un usuario con ese email");
        } else if (data.error === "company_exists") {
          toast.error("Ya existe una distribuidora con ese nombre");
        } else {
          throw new Error(data.message || data.error);
        }
        return;
      }

      toast.success(`Cuenta creada para ${form.companyName}`);
      setForm({ email: "", companyName: "", contactName: "", password: "", phone: "" });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-border">
        <DialogHeader>
          <DialogTitle className="font-cinema text-2xl text-primary">Crear Distribuidora</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cd-email">Email *</Label>
            <Input
              id="cd-email"
              type="email"
              required
              autoFocus
              placeholder="distribuidora@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cd-company">Nombre de la distribuidora / empresa *</Label>
            <Input
              id="cd-company"
              required
              placeholder="Distribuidora Ejemplo S.L."
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cd-contact">Nombre de la persona de contacto *</Label>
            <Input
              id="cd-contact"
              required
              placeholder="Juan García"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cd-password">Contraseña *</Label>
            <div className="relative">
              <Input
                id="cd-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Contraseña de acceso"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cd-phone">Teléfono</Label>
            <Input
              id="cd-phone"
              type="tel"
              placeholder="612 345 678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !form.email || !form.companyName || !form.contactName || !form.password}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDistributorModal;
