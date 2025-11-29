import { Heart } from "lucide-react";

const Footer = () => {
    return (
        <footer className="border-t border-border py-6 px-4 bg-white">
            <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
                            <Heart className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="font-serif font-semibold text-2xl text-brand tracking-tight">ILovMe</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        © 2025 ILovMe. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
