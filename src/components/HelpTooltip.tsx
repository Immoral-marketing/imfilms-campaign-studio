import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { trackEvent } from '@/utils/trackingUtils';

interface HelpTooltipProps {
  content: string;
  title?: string;
  fieldId?: string;
}

const HelpTooltip = ({ content, title, fieldId }: HelpTooltipProps) => {
  const handleOpen = () => {
    if (fieldId) {
      trackEvent('tooltip_opened', { fieldId });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200} onOpenChange={(open) => open && handleOpen()}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-muted transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          {title && <p className="font-semibold mb-1 text-yellow-400">{title}</p>}
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HelpTooltip;
