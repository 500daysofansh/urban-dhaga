import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Scrolls the window to the top on every route change.
// Without this, React Router preserves the scroll position from the
// previous page — so navigating from the bottom of the product grid
// opens the product detail page mid-scroll.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    // "instant" not "smooth" — smooth scroll on navigation feels wrong
    // because the new page content hasn't rendered yet
  }, [pathname]);

  return null;
};

export default ScrollToTop;
