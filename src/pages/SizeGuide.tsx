import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Ruler, Info } from "lucide-react";

const sizes = [
  { size: "XS", chest: "32", waist: "26", hips: "35", fits: "28–30" },
  { size: "S",  chest: "34", waist: "28", hips: "37", fits: "30–32" },
  { size: "M",  chest: "36", waist: "30", hips: "39", fits: "32–34" },
  { size: "L",  chest: "38", waist: "32", hips: "41", fits: "34–36" },
  { size: "XL", chest: "40", waist: "34", hips: "43", fits: "36–38" },
  { size: "XXL",chest: "42", waist: "36", hips: "45", fits: "38–40" },
];

const SizeGuide = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">

        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Size Guide</h1>
        <p className="font-body text-muted-foreground mb-10">Find your perfect fit. All measurements are in inches.</p>

        <div className="space-y-8">

          {/* How to measure */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Ruler className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">How to Measure</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 font-body text-sm text-muted-foreground">
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="font-semibold text-foreground mb-1">Chest</p>
                <p>Measure around the fullest part of your chest, keeping the tape parallel to the floor.</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="font-semibold text-foreground mb-1">Waist</p>
                <p>Measure around your natural waistline — the narrowest part of your torso.</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="font-semibold text-foreground mb-1">Hips</p>
                <p>Measure around the fullest part of your hips, about 8 inches below your waist.</p>
              </div>
            </div>
          </div>

          {/* Size table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">Women's Size Chart</h2>
              <p className="font-body text-xs text-muted-foreground mt-0.5">All measurements in inches</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Size</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Chest</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Waist</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Hips</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Fits (inches)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((row, idx) => (
                    <tr key={row.size} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-6 py-3 font-semibold text-primary">{row.size}</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.chest}"</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.waist}"</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.hips}"</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.fits}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Saree note */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 flex gap-3">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="font-body text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Note on Sarees & Dupattas</p>
              <p>Sarees are free size (typically 5.5 metres) and fit all body types. Dupattas are also free size. Blouses and stitched pieces follow the size chart above.</p>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-base font-semibold text-foreground mb-3">Sizing Tips</h2>
            <ul className="space-y-2 font-body text-sm text-muted-foreground">
              <li>• If you're between sizes, we recommend sizing up for a comfortable fit.</li>
              <li>• Ethnic wear is often designed with relaxed fits — check the product description for specific fit notes.</li>
              <li>• Hand-crafted and embroidered pieces may have minor size variations of ±0.5 inches.</li>
              <li>• Still unsure? WhatsApp us a photo of your measurements and we'll help you choose.</li>
            </ul>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SizeGuide;
