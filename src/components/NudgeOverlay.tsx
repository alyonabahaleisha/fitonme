import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NudgeOverlayProps {
  onClose: () => void;
  onUpload: () => void;
}

const NudgeOverlay = ({ onClose, onUpload }: NudgeOverlayProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 animate-slide-up">
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-foreground font-medium">Like these looks?</p>
            <p className="text-muted-foreground text-sm">Try them on you →</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="hero" size="sm" onClick={onUpload}>
              Upload Photo
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NudgeOverlay;
