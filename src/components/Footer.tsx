import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
    const legalLinks = [
        { name: "Terms of Service", href: "/legal/terms-of-service" },
        { name: "Privacy Policy", href: "/legal/privacy-policy" },
        { name: "Refund Policy", href: "/legal/refund-policy" },
        { name: "Acceptable Use Policy", href: "/legal/acceptable-use-policy" },
        { name: "AI Disclaimer", href: "/legal/ai-disclaimer" },
        { name: "Content Safety Policy", href: "/legal/content-safety-policy" },
    ];

    return (
        <footer className="border-t border-border py-12 px-4 bg-white">
            <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
                                <Heart className="w-5 h-5 text-white fill-white" />
                            </div>
                            <span className="font-serif font-semibold text-2xl text-brand tracking-tight">ILovMe</span>
                        </div>
                        <p className="text-muted-foreground text-sm max-w-xs">
                            Your personal AI stylist. Try on clothes virtually and find your perfect look.
                        </p>
                        <a href="mailto:support@ilovme.ai" className="text-muted-foreground text-sm hover:text-brand transition-colors">
                            support@ilovme.ai
                        </a>
                        <p className="text-muted-foreground text-sm mt-4">
                            © 2025 ILovMe. All rights reserved.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
                        {legalLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.href}
                                className="text-sm text-gray-600 hover:text-brand transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer >
    );
};

export default Footer;
