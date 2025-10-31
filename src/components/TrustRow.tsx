import { Lock, Sparkles, Zap } from "lucide-react";

const TrustRow = () => {
  const features = [
    { icon: Lock, text: "Private by design" },
    { icon: Sparkles, text: "No Photoshop required" },
    { icon: Zap, text: "30s to first look" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 py-6 px-4">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-2 text-muted-foreground">
          <feature.icon className="w-4 h-4 text-brand" />
          <span className="text-sm font-medium">{feature.text}</span>
        </div>
      ))}
    </div>
  );
};

export default TrustRow;
