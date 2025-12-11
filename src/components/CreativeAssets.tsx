import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { FileVideo, FileImage, FileText, Download, Upload, Film } from "lucide-react";
import { Progress } from "./ui/progress";

const ASSET_TYPES = [
  { value: "trailer", label: "Tráiler" },
  { value: "poster", label: "Póster" },
  { value: "banner_vertical", label: "Banner vertical (9:16)" },
  { value: "banner_horizontal", label: "Banner horizontal (16:9)" },
  { value: "video_corto", label: "Vídeo corto <20\"" },
  { value: "copy", label: "Copy / Textos" },
  { value: "otro", label: "Otro" },
];

interface CreativeAssetsProps {
  campaignId: string;
  isAdmin: boolean;
  creativesDeadline?: string;
}

export default function CreativeAssets({ campaignId, isAdmin, creativesDeadline }: CreativeAssetsProps) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [selectedType, setSelectedType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const loadAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [campaignId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      toast({
        title: "Error",
        description: "Selecciona un tipo y un archivo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${campaignId}/${fileName}`;

      setUploadProgress(50);

      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(75);

      const { data: { publicUrl } } = supabase.storage
        .from("campaign-assets")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("campaign_assets")
        .insert({
          campaign_id: campaignId,
          type: selectedType,
          file_url: publicUrl,
          original_filename: selectedFile.name,
          status: "pendiente_revision",
          uploaded_by: user.id,
          notes: notes || null,
        });

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast({
        title: "¡Creativo subido!",
        description: "El equipo de imfilms lo revisará pronto.",
      });

      setSelectedFile(null);
      setSelectedType("");
      setNotes("");
      setUploadProgress(0);
      loadAssets();
    } catch (error: any) {
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (assetId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("campaign_assets")
        .update({ status: newStatus })
        .eq("id", assetId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Creativo marcado como ${newStatus}`,
      });

      loadAssets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprobado":
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Aprobado</Badge>;
      case "rechazado":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Rechazado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Pendiente revisión</Badge>;
    }
  };

  const getIcon = (type: string) => {
    if (type.includes("video") || type === "trailer") return <FileVideo className="w-5 h-5" />;
    if (type.includes("banner") || type === "poster") return <FileImage className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const deadlineDate = creativesDeadline ? new Date(creativesDeadline) : null;
  const isDeadlineClose = deadlineDate && deadlineDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-8">
      {/* Deadline warning */}
      {creativesDeadline && (
        <Card className={`bg-cinema-charcoal/40 border ${isDeadlineClose ? 'border-red-500/50' : 'border-cinema-gold/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Film className="w-5 h-5 text-cinema-gold" />
              <div>
                <p className="text-sm font-medium text-cinema-ivory">
                  Fecha límite de recepción: {new Date(creativesDeadline).toLocaleDateString("es-ES")}
                </p>
                <p className="text-xs text-cinema-ivory/60 mt-1">
                  Actualmente has subido {assets.length} creativos para esta campaña.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload section */}
      {!isAdmin && (
        <Card className="bg-cinema-charcoal/60 border-cinema-gold/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-cinema-gold" />
              <h3 className="text-lg font-teko text-cinema-ivory">Subir nuevo creativo</h3>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="type" className="text-cinema-ivory">Tipo de material</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="bg-cinema-charcoal border-cinema-gold/20 text-cinema-ivory">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file" className="text-cinema-ivory">Archivo</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  className="bg-cinema-charcoal border-cinema-gold/20 text-cinema-ivory"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                />
                {selectedFile && (
                  <p className="text-xs text-cinema-ivory/60 mt-1">{selectedFile.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-cinema-ivory">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Versión final aprobada por productora"
                  className="bg-cinema-charcoal border-cinema-gold/20 text-cinema-ivory"
                  rows={2}
                />
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-cinema-ivory/60 text-center">Subiendo... {uploadProgress}%</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !selectedType}
                className="bg-cinema-gold hover:bg-cinema-gold/90 text-cinema-black font-semibold"
              >
                {uploading ? "Subiendo..." : "Subir creativo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets list */}
      <div className="space-y-4">
        <h3 className="text-xl font-teko text-cinema-ivory">Materiales subidos</h3>

        {loading ? (
          <p className="text-cinema-ivory/60">Cargando...</p>
        ) : assets.length === 0 ? (
          <Card className="bg-cinema-charcoal/40 border-cinema-gold/10">
            <CardContent className="p-6 text-center">
              <p className="text-cinema-ivory/60">No hay creativos subidos aún</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="bg-cinema-charcoal/60 border-cinema-gold/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-cinema-gold mt-1">
                        {getIcon(asset.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-cinema-ivory">
                          {ASSET_TYPES.find((t) => t.value === asset.type)?.label || asset.type}
                        </p>
                        <p className="text-sm text-cinema-ivory/60 truncate">{asset.original_filename}</p>
                        {asset.notes && (
                          <p className="text-xs text-cinema-ivory/50 mt-1 italic">{asset.notes}</p>
                        )}
                        <p className="text-xs text-cinema-ivory/40 mt-1">
                          Subido el {new Date(asset.created_at).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(asset.status)}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-cinema-gold/30 text-cinema-gold hover:bg-cinema-gold/10"
                      >
                        <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>

                      {isAdmin && (
                        <Select
                          value={asset.status}
                          onValueChange={(value) => handleStatusChange(asset.id, value)}
                        >
                          <SelectTrigger className="w-[140px] bg-cinema-charcoal border-cinema-gold/20 text-cinema-ivory text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente_revision">Pendiente</SelectItem>
                            <SelectItem value="aprobado">Aprobado</SelectItem>
                            <SelectItem value="rechazado">Rechazado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
