import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadButtonProps {
  variant?: "default" | "hero" | "secondary";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
  onUpload?: (file: File) => void;
}

const UploadButton = ({ variant = "hero", size = "lg", fullWidth = false, onUpload }: UploadButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // Simulate optimistic progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 60) {
          clearInterval(progressInterval);
          return 60;
        }
        return prev + Math.random() * 20;
      });
    }, 200);

    // In production, this would upload and process
    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      onUpload?.(file);
      
      toast({
        title: "Photo uploaded!",
        description: "Preparing your personalized try-on experience...",
      });

      // Redirect to try-on page
      setTimeout(() => {
        window.location.href = "/try";
      }, 800);
    }, 1500);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {isProcessing ? (
        <div className={`${fullWidth ? "w-full" : ""}`}>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-brand" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Processing your photo...</p>
                <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
              </div>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              🔒 Your photo is processed securely. Delete anytime.
            </p>
          </div>
        </div>
      ) : (
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          className={fullWidth ? "w-full" : ""}
        >
          <Camera className="w-5 h-5" />
          Upload Your Photo
        </Button>
      )}
    </>
  );
};

export default UploadButton;
