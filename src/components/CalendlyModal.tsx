import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface CalendlyModalProps {
    isOpen: boolean;
    onClose: () => void;
    type?: 'admin' | 'paid_media';
}

const CalendlyModal = ({ isOpen, onClose, type = 'admin' }: CalendlyModalProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const { getSetting } = useSiteSettings();

    const adminUrl = getSetting("calendly_admin_url", getSetting("calendly_url", "https://calendly.com/d/cmvg-s3x-wqy/haz-que-tu-marca-crezca-de-verdad?hide_event_type_details=1&hide_gdpr_banner=1"));
    const paidMediaUrl = getSetting("calendly_paid_media_url", adminUrl);

    const calendlyUrl = type === 'paid_media' ? paidMediaUrl : adminUrl;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 bg-[#1A1F2C] border-primary/20">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="font-cinema text-2xl text-primary">
                        {type === 'paid_media' ? 'Agenda tu reunión (Paid Media)' : 'Agenda tu reunión'}
                    </DialogTitle>
                </DialogHeader>
                <div className="w-full h-[700px] relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1F2C] z-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                        </div>
                    )}
                    <iframe
                        src={calendlyUrl}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        onLoad={() => setIsLoading(false)}
                        title="Calendly Scheduling"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CalendlyModal;
