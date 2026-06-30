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
import { FileVideo, FileImage, FileText, Download, Upload, Film, Trash2, ExternalLink, Loader2, Link as LinkIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { isAfter, isSameDay, parseISO, startOfDay } from "date-fns";

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

  const [selectedType, setSelectedType] = useState("otro");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [uploadMode, setUploadMode] = useState<'file' | 'drive'>('file');
  const [driveUrl, setDriveUrl] = useState("");
  const [driveName, setDriveName] = useState("");
  const [savingDrive, setSavingDrive] = useState(false);

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
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, [campaignId]);

  const handleRename = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from("campaign_assets")
        .update({ name: editingName })
        .eq("id", assetId);

      if (error) throw error;

      toast({
        title: "Nombre actualizado",
        description: "El nombre del archivo se ha guardado.",
      });

      setEditingId(null);
      loadAssets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (asset: any) => {
    setEditingId(asset.id);
    setEditingName(asset.name || asset.original_filename);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un archivo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Check for duplicate files
      const fileNames = selectedFiles.map((f) => f.name);
      const { data: existingAssets } = await supabase
        .from("campaign_assets")
        .select("original_filename")
        .eq("campaign_id", campaignId)
        .in("original_filename", fileNames);

      if (existingAssets && existingAssets.length > 0) {
        const dupes = existingAssets.map((a: any) => a.original_filename);
        toast({
          title: "Archivos duplicados detectados",
          description: `Los siguientes archivos ya existen: ${dupes.join(", ")}. Renómbralos o elimínalos antes de subir.`,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      let completed = 0;
      const total = selectedFiles.length;

      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileNameWithoutExt = file.name.replace(`.${fileExt}`, "");
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${campaignId}/${fileName}`;

        // Upload Storage
        const { error: uploadError } = await supabase.storage
          .from("campaign-assets")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from("campaign-assets")
          .getPublicUrl(filePath);

        // Insert DB Record
        const { error: insertError } = await supabase
          .from("campaign_assets")
          .insert({
            campaign_id: campaignId,
            type: selectedType, // Defaults to "otro"
            file_url: publicUrl,
            original_filename: file.name,
            name: fileNameWithoutExt,
            status: "pendiente_revision",
            uploaded_by: user.id,
            notes: notes || null,
          });

        if (insertError) throw insertError;

        completed++;
        setUploadProgress((completed / total) * 100);
      }

      toast({
        title: "¡Subida completada!",
        description: `Se han subido ${total} archivos correctamente.`,
      });

      // Insert system notification message directly into campaign_messages
      // (more reliable than depending on Edge Function for in-app notifications)
      try {
        const uploaderName = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.user_metadata?.contact_name
          || user.email?.split("@")[0]
          || "Un usuario";

        const fileNames = selectedFiles.map((f) => f.name);
        const chatMessage = `📎 ${uploaderName} ha subido ${total} creatividad(es): ${fileNames.join(", ")}`;

        await supabase
          .from("campaign_messages")
          .insert({
            campaign_id: campaignId,
            sender_role: "system",
            sender_name: "Sistema",
            message: chatMessage,
          } as any);
      } catch (sysErr) {
        console.error("System message insert error (non-fatal):", sysErr);
      }

      // Call Edge Function for email notifications only
      try {
        const uploaderName = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.user_metadata?.contact_name
          || user.email?.split("@")[0]
          || "Un usuario";

        const fileNames = selectedFiles.map((f) => f.name);

        const { error: funcError } = await supabase.functions.invoke("creative-upload-notification", {
          body: {
            campaignId,
            uploaderName,
            fileCount: total,
            fileNames,
          },
        });

        if (funcError) {
          console.error("Edge Function invocation error:", funcError);
        }
      } catch (notifError) {
        console.error("Notification error (non-fatal):", notifError);
      }

      setSelectedFiles([]);
      setNotes("");
      setUploadProgress(0);
      loadAssets();

      // Reset file input value
      const fileInput = document.getElementById("file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error al subir",
        description: error.message || "Ocurrió un error al subir los archivos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDriveLink = async () => {
    if (!driveUrl.trim()) {
      toast({ title: "Error", description: "Ingresa un enlace de Google Drive", variant: "destructive" });
      return;
    }
    if (!driveUrl.includes("drive.google.com") && !driveUrl.includes("docs.google.com")) {
      toast({ title: "Error", description: "El enlace debe ser de Google Drive", variant: "destructive" });
      return;
    }
    setSavingDrive(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabase.from("campaign_assets").insert({
        campaign_id: campaignId,
        type: "drive_link",
        file_url: driveUrl.trim(),
        original_filename: "Google Drive",
        name: driveName.trim() || "Carpeta de Google Drive",
        status: "pendiente_revision",
        uploaded_by: user.id,
        notes: notes || null,
      });
      if (error) throw error;

      try {
        const uploaderName = user.user_metadata?.contact_name || user.email?.split("@")[0] || "Un usuario";
        await supabase.from("campaign_messages").insert({
          campaign_id: campaignId,
          sender_role: "system",
          sender_name: "Sistema",
          message: `🔗 ${uploaderName} ha compartido un enlace de Google Drive: ${driveName.trim() || "Carpeta de Google Drive"}`,
        } as any);
      } catch (_) {}

      toast({ title: "Enlace guardado", description: "El enlace de Google Drive se ha guardado correctamente." });
      setDriveUrl("");
      setDriveName("");
      setNotes("");
      setUploadMode('file');
      loadAssets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingDrive(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el archivo.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (asset: any) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.")) return;

    try {
      // Extract path from URL - assumes standard Supabase Storage URL structure
      const pathPart = asset.file_url.split('/campaign-assets/')[1];

      if (pathPart) {
        const { error: storageError } = await supabase.storage
          .from("campaign-assets")
          .remove([pathPart]);

        if (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }

      const { data, error: dbError } = await supabase
        .from("campaign_assets")
        .delete()
        .eq("id", asset.id)
        .select();

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        throw new Error("No se ha podido eliminar el registro de la base de datos. Es posible que no tengas permisos suficientes.");
      }

      toast({
        title: "Archivo eliminado",
        description: "El archivo ha sido eliminado correctamente.",
      });

      loadAssets();
    } catch (error: any) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (assetId: string, newStatus: string) => {
    try {
      const { data: asset, error: updateError } = await supabase
        .from("campaign_assets")
        .update({ status: newStatus })
        .eq("id", assetId)
        .select(`
          name,
          original_filename,
          campaigns (
            contact_email,
            films (title)
          )
        `)
        .single();

      if (updateError) throw updateError;

      toast({
        title: "Estado actualizado",
        description: `Creativo marcado como ${newStatus}`,
      });

      // Send notifications if Approved or Rejected
      if (newStatus === "aprobado" || newStatus === "rechazado") {
        const assetName = asset.name || asset.original_filename || "un creativo";
        const campaignTitle = (asset.campaigns as any)?.films?.title || "Campaña";
        const recipientEmail = (asset.campaigns as any)?.contact_email;

        // 1. In-app Notification (System Message)
        try {
          const emoji = newStatus === "aprobado" ? "✅" : "❌";
          const statusText = newStatus === "aprobado" ? "Aprobado" : "Rechazado";
          const systemMsg = `${emoji} Creativo ${statusText}: ${assetName}`;

          await supabase.from("campaign_messages").insert({
            campaign_id: campaignId,
            sender_role: "system",
            sender_name: "Sistema",
            message: systemMsg,
          } as any);
        } catch (sysErr) {
          console.error("System message error:", sysErr);
        }

        // 2. Email Notification
        if (recipientEmail) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                type: newStatus === "aprobado" ? "creative_approved" : "creative_rejected",
                campaignId: campaignId,
                campaignTitle: campaignTitle,
                recipientEmail: recipientEmail,
                assetName: assetName,
              },
            });
          } catch (emailErr) {
            console.error("Email notification error:", emailErr);
          }
        }
      }

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
    if (type === "drive_link") return <LinkIcon className="w-5 h-5" />;
    if (type.includes("video") || type === "trailer") return <FileVideo className="w-5 h-5" />;
    if (type.includes("banner") || type === "poster") return <FileImage className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const isDriveLink = (asset: any) => asset.type === "drive_link";

  const isImage = (filename: string) => {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const deadlineDate = creativesDeadline ? new Date(creativesDeadline) : null;
  const isDeadlineClose = deadlineDate && deadlineDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const isSubmissionLate = (createdAt: string) => {
    if (!creativesDeadline) return false;
    const createdDate = startOfDay(parseISO(createdAt));
    const deadline = startOfDay(parseISO(creativesDeadline));
    // User requested: "mismo día límite o posterior" -> Late
    return isAfter(createdDate, deadline) || isSameDay(createdDate, deadline);
  };

  return (
    <div className="space-y-8">
      {/* Deadline warning */}
      {creativesDeadline && (
        <Card className={`bg-cinema-charcoal/40 border ${isDeadlineClose ? 'border-red-500/50' : 'border-cinema-yellow/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Film className="w-5 h-5 text-cinema-yellow" />
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

      {/* PDF Guide download */}
      <a
        href="https://docs.google.com/presentation/d/1IVE78HJYhKJYh8kTOWSe7jLBhC30Ax7pCIwB2YWGqMU/edit?slide=id.g28046da9827_0_2290#slide=id.g28046da9827_0_2290"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-4 rounded-lg border border-cinema-yellow/20 bg-cinema-charcoal/30 hover:bg-cinema-charcoal/60 hover:border-cinema-yellow/40 transition-all group"
      >
        <div className="w-11 h-11 rounded-lg bg-cinema-yellow/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cinema-yellow/20 transition-colors">
          <FileText className="w-5 h-5 text-cinema-yellow" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-cinema-ivory text-sm">Guía de especificaciones y buenas prácticas</p>
          <p className="text-xs text-cinema-ivory/60 mt-0.5">Descarga el PDF con las dimensiones, formatos y consejos para cada plataforma.</p>
        </div>
        <ExternalLink className="w-5 h-5 text-cinema-ivory/40 group-hover:text-cinema-yellow transition-colors flex-shrink-0" />
      </a>

      {/* Upload section */}
      <Card className="bg-cinema-charcoal/60 border-cinema-yellow/20">
        <CardContent className="p-6 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-cinema-charcoal rounded-lg w-fit">
            <button
              onClick={() => setUploadMode('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${uploadMode === 'file' ? 'bg-cinema-yellow text-cinema-black' : 'text-cinema-ivory/60 hover:text-cinema-ivory'}`}
            >
              <Upload className="w-4 h-4" />
              Subir archivos
            </button>
            <button
              onClick={() => setUploadMode('drive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${uploadMode === 'drive' ? 'bg-cinema-yellow text-cinema-black' : 'text-cinema-ivory/60 hover:text-cinema-ivory'}`}
            >
              <LinkIcon className="w-4 h-4" />
              Enlace Google Drive
            </button>
          </div>

          {uploadMode === 'file' ? (
            <div className="grid gap-4">
              <div>
                <Label htmlFor="file" className="text-cinema-ivory">Archivo</Label>
                <div className="relative">
                  <Input
                    id="file"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="bg-cinema-charcoal border-cinema-yellow/20 text-cinema-ivory cursor-pointer file:cursor-pointer file:text-black file:bg-cinema-yellow file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-sm file:font-semibold hover:file:bg-cinema-yellow/90 transition-colors"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-cinema-ivory/60 font-semibold">
                      {selectedFiles.length} archivo(s) seleccionado(s):
                    </p>
                    <ul className="text-xs text-cinema-ivory/50 list-disc list-inside max-h-24 overflow-y-auto">
                      {selectedFiles.map((f, i) => (
                        <li key={i} className="truncate">{f.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-cinema-ivory">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Versión final aprobada por productora"
                  className="bg-muted/20 border-cinema-yellow/20 text-cinema-ivory placeholder:text-cinema-ivory/30 focus:border-cinema-yellow/50 transition-colors min-h-[80px]"
                />
              </div>

              {uploading && (
                <div className="flex flex-col items-center gap-2 py-1">
                  <div className="flex items-center gap-2 text-cinema-ivory/80">
                    <Loader2 className="h-4 w-4 animate-spin text-cinema-yellow" />
                    <span className="text-sm font-medium">Subiendo archivos...</span>
                  </div>
                  <p className="text-xs text-cinema-ivory/50">Esto puede demorar unos minutos para archivos grandes</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="bg-cinema-yellow hover:bg-cinema-yellow/90 text-cinema-black font-semibold"
              >
                {uploading ? "Subiendo..." : `Subir ${selectedFiles.length > 0 ? selectedFiles.length + " " : ""}archivos`}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div>
                <Label htmlFor="drive-name" className="text-cinema-ivory">Nombre del enlace</Label>
                <Input
                  id="drive-name"
                  value={driveName}
                  onChange={(e) => setDriveName(e.target.value)}
                  placeholder="Ej: Carpeta creatividades película"
                  className="bg-cinema-charcoal border-cinema-yellow/20 text-cinema-ivory placeholder:text-cinema-ivory/30"
                />
              </div>

              <div>
                <Label htmlFor="drive-url" className="text-cinema-ivory">Enlace de Google Drive *</Label>
                <Input
                  id="drive-url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="bg-cinema-charcoal border-cinema-yellow/20 text-cinema-ivory placeholder:text-cinema-ivory/30"
                />
                <p className="text-xs text-cinema-ivory/40 mt-1">Asegúrate de que el enlace esté configurado como "cualquier persona con el enlace puede ver".</p>
              </div>

              <div>
                <Label htmlFor="drive-notes" className="text-cinema-ivory">Notas (opcional)</Label>
                <Textarea
                  id="drive-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Contiene versiones finales en todos los formatos"
                  className="bg-muted/20 border-cinema-yellow/20 text-cinema-ivory placeholder:text-cinema-ivory/30 focus:border-cinema-yellow/50 transition-colors min-h-[80px]"
                />
              </div>

              <Button
                onClick={handleSaveDriveLink}
                disabled={savingDrive || !driveUrl.trim()}
                className="bg-cinema-yellow hover:bg-cinema-yellow/90 text-cinema-black font-semibold"
              >
                {savingDrive ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar enlace"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets list */}
      <div className="space-y-4">
        <h3 className="text-xl font-teko text-cinema-ivory">Materiales subidos</h3>

        {loading ? (
          <p className="text-cinema-ivory/60">Cargando...</p>
        ) : assets.length === 0 ? (
          <Card className="bg-cinema-charcoal/40 border-cinema-yellow/10">
            <CardContent className="p-6 text-center">
              <p className="text-cinema-ivory/60">No hay creativos subidos aún</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assets.map((asset) => {
              const isLate = isSubmissionLate(asset.created_at);
              return (
                <Card
                  key={asset.id}
                  className={`border transition-all hover:bg-cinema-charcoal/80 ${isLate
                    ? "bg-red-950/20 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                    : "bg-cinema-charcoal/60 border-cinema-yellow/20"
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1 flex-shrink-0">
                          {isDriveLink(asset) ? (
                            <a href={asset.file_url} target="_blank" rel="noopener noreferrer"
                              className="w-16 h-16 flex items-center justify-center rounded-md bg-blue-950/40 border border-blue-500/30 text-blue-400 hover:bg-blue-950/60 transition-colors"
                              title="Abrir en Google Drive"
                            >
                              <LinkIcon className="w-6 h-6" />
                            </a>
                          ) : isImage(asset.original_filename || asset.file_url) ? (
                            <img
                              src={asset.file_url}
                              alt={asset.name}
                              className={`w-16 h-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity ${isLate ? "border-2 border-red-500/50" : "border border-cinema-yellow/20"
                                }`}
                              onClick={() => setPreviewUrl(asset.file_url)}
                            />
                          ) : (
                            <div className={`w-16 h-16 flex items-center justify-center rounded-md ${isLate
                              ? "bg-red-950/40 border-2 border-red-500/50 text-red-400"
                              : "bg-cinema-charcoal border border-cinema-yellow/20 text-cinema-yellow"
                              }`}>
                              {getIcon(asset.type)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          {editingId === asset.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8 bg-zinc-900 border-cinema-yellow/20 text-cinema-ivory focus-visible:ring-cinema-yellow/30"
                              />
                              <Button size="sm" onClick={() => handleRename(asset.id)} className="h-8 bg-cinema-yellow text-black hover:bg-cinema-yellow/90">Guardar</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-cinema-ivory hover:text-white">Cancelar</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <p className={`font-medium text-lg ${isLate ? "text-red-200" : "text-cinema-ivory"}`}>
                                {asset.name || asset.original_filename || "Sin nombre"}
                              </p>
                              {(isAdmin || (asset.uploaded_by && currentUserId && asset.uploaded_by.toLowerCase() === currentUserId.toLowerCase())) && (
                                <button
                                  onClick={() => startEditing(asset)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-cinema-ivory/40 hover:text-cinema-yellow"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                </button>
                              )}
                              {isLate && (
                                <Badge variant="destructive" className="ml-2 text-[10px] uppercase tracking-wider bg-red-500/80 hover:bg-red-500">
                                  Entrega Tardía
                                </Badge>
                              )}
                            </div>
                          )}

                          {isDriveLink(asset) ? (
                            <a href={asset.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 truncate flex items-center gap-1 max-w-xs"
                              title={asset.file_url}
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">Abrir Google Drive</span>
                            </a>
                          ) : (
                            <p className="text-xs text-cinema-ivory/60 truncate" title={asset.original_filename}>
                              {asset.original_filename}
                            </p>
                          )}

                          {asset.notes && (
                            <p className="text-sm text-cinema-ivory/60 mt-2 italic">
                              "{asset.notes}"
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <p className={`text-xs ${isLate ? "text-red-400 font-medium" : "text-cinema-ivory/40"}`}>
                              Subido el {new Date(asset.created_at).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(asset.status)}

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {(isAdmin || (asset.uploaded_by && currentUserId && asset.uploaded_by.toLowerCase() === currentUserId.toLowerCase())) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(asset)}
                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                title="Eliminar archivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}

                            {isDriveLink(asset) ? (
                              <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="h-8 w-8 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                title="Abrir en Google Drive"
                              >
                                <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDownload(asset.file_url, asset.original_filename)}
                                className={`h-8 w-8 ${isLate ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-cinema-yellow/30 text-cinema-yellow hover:bg-cinema-yellow/10"}`}
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          {isAdmin && (
                            <Select
                              value={asset.status}
                              onValueChange={(value) => handleStatusChange(asset.id, value)}
                            >
                              <SelectTrigger className="w-[130px] h-8 bg-cinema-charcoal border-cinema-yellow/20 text-cinema-ivory text-xs">
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="bg-cinema-charcoal/95 border-cinema-yellow/20 max-w-4xl w-full p-1 overflow-hidden">
          {previewUrl && (
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
