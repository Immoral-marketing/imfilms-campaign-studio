import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Verify the caller is an admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Missing authorization header");
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace("Bearer ", "")
        );

        if (authError || !user) {
            throw new Error("Invalid token");
        }

        // Check if user has admin role
        const { data: role, error: roleError } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();

        if (roleError || !role) {
            throw new Error("You do not have permission to perform this action");
        }

        // Proceeding with deletion requests
        const { userId, distributorId } = await req.json();

        if (!userId) {
            throw new Error("userId is required");
        }

        console.log(`Deleting user: ${userId} and distributor: ${distributorId}`);

        // 2. Delete the user from auth.users (This is the critical part that requires Service Role)
        const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(
            userId
        );

        if (deleteUserError) {
            console.error("Error deleting auth user:", deleteUserError);
            throw deleteUserError;
        }

        // 3. If distributorId provided, explicitly delete associated data if needed 
        // (Cascade should handle most, but sometimes explicit cleanup is safer or required if cascade is missing)
        if (distributorId) {
            // Delete campaigns explicitly (just in case cascade is missing on one level)
            const { error: deleteCampaignsError } = await supabaseClient
                .from('campaigns')
                .delete()
                .eq('distributor_id', distributorId);

            if (deleteCampaignsError) console.error("Error deleting campaigns:", deleteCampaignsError);

            // Delete distributor record
            const { error: deleteDistError } = await supabaseClient
                .from('distributors')
                .delete()
                .eq('id', distributorId);

            if (deleteDistError) {
                console.error("Error deleting distributor:", deleteDistError);
                // We generally don't throw here if the user was already deleted, as the main goal involves freeing the email
            }
        }

        return new Response(
            JSON.stringify({ message: "User deleted successfully" }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error: any) {
        console.error("Error in delete-user function:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
