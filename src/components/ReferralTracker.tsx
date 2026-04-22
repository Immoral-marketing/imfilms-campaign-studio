import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { setReferralCookie } from '@/lib/referral';
import { supabase } from '@/integrations/supabase/client';

/**
 * Componente invisible que detecta ?ref=slug en la URL,
 * guarda/sobreescribe la cookie de referral (último click gana)
 * y registra el click en Supabase.
 * Debe montarse dentro de <BrowserRouter>.
 */
export function ReferralTracker() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref || ref.trim() === '') return;

    const slug = ref.trim().toLowerCase();

    // Sobreescribir cookie (último click gana)
    setReferralCookie(slug);

    // Registrar click en Supabase (fire-and-forget — no interrumpe navegación)
    const registerClick = async () => {
      try {
        const { data: partnerId } = await supabase.rpc('get_partner_id_by_slug', { p_slug: slug });
        if (!partnerId) return;
        await supabase.from('referral_clicks').insert({ partner_id: partnerId });
      } catch {
        // Silencioso — no interrumpir la navegación del usuario
      }
    };

    registerClick();
  }, [location.search]);

  return null;
}
