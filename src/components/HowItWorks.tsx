import { Upload, Sparkles, ShoppingBag } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      title: "Upload your photo",
      description: "Take or upload a clear photo. We keep it private and secure.",
    },
    {
      icon: Sparkles,
      title: "See Outfits on You",
      description: "Our AI shows how clothes look on your body in seconds.",
    },
    {
      icon: ShoppingBag,
      title: "Buy What Works",
      description: "Shop with confidence knowing how it'll look.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            How it works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three simple steps to transform your online shopping experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative bg-card border border-border rounded-2xl p-6 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-brand text-brand-foreground flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div className="mt-4">
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
