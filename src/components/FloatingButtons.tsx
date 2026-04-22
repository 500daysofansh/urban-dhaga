import { useState, useEffect } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const FloatingButtons = () => {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-20 right-5 z-[9999] flex flex-col gap-3">
      
      {/* 🔼 Scroll to Top Button */}
      {showTop && (
        <Button
          size="icon"
          variant="outline"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="h-12 w-12 rounded-full shadow-lg bg-background/90 backdrop-blur-sm border-border"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* 💬 WhatsApp Button */}
      <a
        href="https://wa.me/918419856013?text=Hi%20I%20want%20to%20order"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </a>
    </div>
  );
};

export default FloatingButtons;
