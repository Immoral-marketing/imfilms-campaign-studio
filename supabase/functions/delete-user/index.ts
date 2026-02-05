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

        console.log(`Processing deletion for user: ${userId || 'N/A'} and distributor: ${distributorId || 'N/A'}`);

        // 2. Delete the user from auth.users (if userId provided)
        if (userId) {
            const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(
                userId
            );

            if (deleteUserError) {
                // If user doesn't exist, we don't want to block distributor deletion
                if (deleteUserError.message?.includes('User not found')) {
                    console.log("Auth user already gone, proceeding with cleanup.");
                } else {
                    console.error("Error deleting auth user:", deleteUserError);
                    throw deleteUserError;
                }
            } else {
                console.log("Auth user deleted successfully.");
            }
        }

        // 3. If distributorId provided, explicitly delete associated data
        if (distributorId) {
            // Delete campaigns explicitly
            const { error: deleteCampaignsError } = await supabaseClient
                .from('campaigns')
                .delete()
                .eq('distributor_id', distributorId);

            if (deleteCampaignsError) console.error("Error deleting campaigns:", deleteCampaignsError);

            // Delete films explicitly (old table)
            const { error: deleteFilmsError } = await supabaseClient
                .from('films')
                .delete()
                .eq('distributor_id', distributorId);

            if (deleteFilmsError) console.error("Error deleting films:", deleteFilmsError);

            // Delete titles explicitly (new table)
            const { error: deleteTitlesError } = await supabaseClient
                .from('titles')
                .delete()
                .eq('distributor_id', distributorId);

            if (deleteTitlesError) console.error("Error deleting titles:", deleteTitlesError);

            // Delete distributor record
            const { error: deleteDistError } = await supabaseClient
                .from('distributors')
                .delete()
                .eq('id', distributorId);

            if (deleteDistError) {
                console.error("Error deleting distributor:", deleteDistError);
                throw deleteDistError; // Throw here because this is the primary record deletion
            }
            console.log("Distributor record deleted successfully.");
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
