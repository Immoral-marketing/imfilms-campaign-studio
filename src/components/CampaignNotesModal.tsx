import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { formatDateShort } from "@/utils/dateUtils";

interface CampaignNotesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaignId: string | null;
    campaignTitle: string;
    onNotesChange?: () => void;
}

const CampaignNotesModal = ({ open, onOpenChange, campaignId, campaignTitle, onNotesChange }: CampaignNotesModalProps) => {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (open && campaignId) {
            loadNotes();
        }
    }, [open, campaignId]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('campaign_notes')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error: any) {
            console.error("Error loading notes:", error);
            toast.error("Error al cargar las notas");
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !campaignId) return;

        setAdding(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await (supabase as any)
                .from('campaign_notes')
                .insert({
                    campaign_id: campaignId,
                    content: newNote.trim(),
                    created_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            setNotes([data, ...notes]);
            setNewNote("");
            toast.success("Nota añadida");
            if (onNotesChange) onNotesChange();
        } catch (error: any) {
            console.error("Error adding note:", error);
            toast.error("Error al añadir la nota");
        } finally {
            setAdding(false);
        }
    };

    const handleToggleDone = async (noteId: string, currentStatus: boolean) => {
        try {
            const { error } = await (supabase as any)
                .from('campaign_notes')
                .update({ is_done: !currentStatus })
                .eq('id', noteId);

            if (error) throw error;

            setNotes(notes.map(n => n.id === noteId ? { ...n, is_done: !currentStatus } : n));
            if (onNotesChange) onNotesChange();
        } catch (error: any) {
            console.error("Error updating note:", error);
            toast.error("Error al actualizar la nota");
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            const { error } = await (supabase as any)
                .from('campaign_notes')
                .delete()
                .eq('id', noteId);

            if (error) throw error;

            setNotes(notes.filter(n => n.id !== noteId));
            toast.success("Nota eliminada");
            if (onNotesChange) onNotesChange();
        } catch (error: any) {
            console.error("Error deleting note:", error);
            toast.error("Error al eliminar la nota");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-background border-primary/20">
                <DialogHeader>
                    <DialogTitle className="font-cinema text-2xl text-primary">
                        Notas Internas
                    </DialogTitle>
                    <DialogDescription className="text-cinema-ivory">
                        Gestión de anotaciones para: <span className="text-primary font-semibold">{campaignTitle}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Add Note Section */}
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Escribe una nueva anotación..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="bg-muted border-border text-foreground min-h-[100px]"
                        />
                        <Button
                            onClick={handleAddNote}
                            disabled={adding || !newNote.trim()}
                            className="w-full bg-cinema-yellow hover:bg-cinema-yellow/90 text-black font-semibold"
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Agregar anotación
                        </Button>
                    </div>

                    <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-semibold text-primary mb-4">Anotaciones guardadas</h4>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : notes.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 italic">
                                No hay anotaciones previas.
                            </p>
                        ) : (
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className={`p-4 rounded-lg border transition-all ${note.is_done
                                            ? "bg-muted/30 border-green-500/20 opacity-70"
                                            : "bg-muted/50 border-border hover:border-primary/30"
                                            }`}
                                    >
                                        <div className="flex justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <p className={`text-sm text-foreground whitespace-pre-wrap ${note.is_done ? "line-through" : ""}`}>
                                                    {note.content}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {formatDateShort(new Date(note.created_at))}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Checkbox
                                                    checked={note.is_done}
                                                    onCheckedChange={() => handleToggleDone(note.id, note.is_done)}
                                                    className="w-5 h-5 border-primary/50 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                                />
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CampaignNotesModal;
