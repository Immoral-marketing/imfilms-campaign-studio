import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";
import logoImfilms from "@/assets/logo-imfilms.png";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        // Check if we have a session (Supabase handles the hash parsing automatically)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSession(session);
            } else {
                // If no session is found, it might be that the link is invalid or expired
                // But also, onAuthStateChange usually catches the recovery event
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                setSession(session);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success("Contraseña actualizada correctamente");
            navigate("/campaigns"); // Redirect to dashboard/login
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar la contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-foreground">
            <Card className="cinema-card w-full max-w-md p-8 space-y-8 bg-zinc-950 border-zinc-800">
                <div className="text-center space-y-4">
                    <img
                        src={logoImfilms}
                        alt="IMFILMS"
                        className="w-48 mx-auto mb-6"
                    />
                    <h2 className="font-cinema text-3xl text-primary uppercase">Nueva Contraseña</h2>
                    <p className="text-muted-foreground">
                        Introduce tu nueva contraseña para restablecer el acceso a tu cuenta.
                    </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-cinema-ivory">Nueva Contraseña</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-zinc-900 border-zinc-700 text-white pr-10"
                                disabled={loading}
                                required
                                minLength={6}
                                placeholder="Mínimo 6 caracteres"
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

                    <Button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground hover:bg-secondary font-semibold text-base py-6"
                        disabled={loading || !password}
                    >
                        {loading ? (
                            <>
                                <Lock className="w-4 h-4 mr-2 animate-pulse" />
                                Actualizando...
                            </>
                        ) : (
                            "Guardar nueva contraseña"
                        )}
                    </Button>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => navigate("/campaigns")}
                            className="text-sm text-muted-foreground hover:text-white transition-colors"
                        >
                            Cancelar y volver
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ResetPassword;
