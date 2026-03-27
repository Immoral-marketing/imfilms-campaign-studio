import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

interface ChangeDistributorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  campaignTitle: string;
  currentDistributorId: string | null;
  onSuccess: () => void;
}

const ChangeDistributorModal = ({
  open,
  onOpenChange,
  campaignId,
  campaignTitle,
  currentDistributorId,
  onSuccess,
}: ChangeDistributorModalProps) => {
  const [distributors, setDistributors] = useState<any[]>([]);
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDistributors();
      setSelectedDistributorId(currentDistributorId || "");
    }
  }, [open, currentDistributorId]);

  const fetchDistributors = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("distributors")
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");

      if (error) throw error;
      setDistributors(data || []);
    } catch (error: any) {
      console.error("Error fetching distributors:", error);
      toast.error("Error al cargar las distribuidoras");
    } finally {
      setFetching(false);
    }
  };

  const handleUpdate = async () => {
    if (!campaignId || !selectedDistributorId) return;
    if (selectedDistributorId === currentDistributorId) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Get campaign info to find the associated film_id
      const { data: campaign, error: fetchError } = await supabase
        .from("campaigns")
        .select("film_id")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;
      if (!campaign?.film_id) throw new Error("No se encontró la película asociada");

      // 2. Perform updates:
      // Update the film's distributor
      const { error: filmError } = await supabase
        .from("films")
        .update({ distributor_id: selectedDistributorId })
        .eq("id", campaign.film_id);

      if (filmError) throw filmError;

      // Update ALL campaigns belonging to this film (since the movie itself moved)
      const { error: campaignsError } = await supabase
        .from("campaigns")
        .update({ distributor_id: selectedDistributorId })
        .eq("film_id", campaign.film_id);

      if (campaignsError) throw campaignsError;

      toast.success("Distribuidora y película actualizadas correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating distributor:", error);
      toast.error("Error al actualizar la distribuidora: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-cinema text-2xl text-primary flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Cambiar Distribuidora
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground italic">
              Película: <span className="text-cinema-ivory font-semibold not-italic">{campaignTitle}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="distributor">Seleccionar Nueva Distribuidora</Label>
            <Select
              value={selectedDistributorId}
              onValueChange={setSelectedDistributorId}
              disabled={fetching || loading}
            >
              <SelectTrigger className="w-full bg-muted border-border">
                <SelectValue placeholder={fetching ? "Cargando..." : "Selecciona una distribuidora"} />
              </SelectTrigger>
              <SelectContent className="bg-cinema-black border-border max-h-[300px]">
                {distributors.map((dist) => (
                  <SelectItem key={dist.id} value={dist.id}>
                    {dist.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={loading || !selectedDistributorId || selectedDistributorId === currentDistributorId}
            className="bg-cinema-yellow text-black hover:bg-cinema-yellow/90"
          >
            {loading ? "Actualizando..." : "Confirmar Cambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeDistributorModal;
