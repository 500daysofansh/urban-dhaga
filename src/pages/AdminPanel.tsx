import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Product, JEWELRY_CATEGORIES, AVAILABLE_SIZES } from "@/types/product";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut, Plus, Pencil, Trash2, Upload, X,
  ShoppingBag, PackageOpen, Loader2, Link2,
  ImagePlus, CheckCircle2, AlertCircle, TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Meesho helpers ──────────────────────────────────────────────────────────

function extractMeeshoId(url: string): string | null {
  const clean = url.trim().replace(/['", ]/g, "");
  const match = clean.match(/\/(?:p|product)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  try {
    return String(parseInt(match[1], 36));
  } catch {
    return null;
  }
}

async function fetchMeeshoProduct(productId: string) {
  const response = await fetch(`/api/meesho?id=${productId}`, {
    headers: {
      authorization: "32c4d8137cn9eb493a1921f203173080",
      "app-version": "27.6",
      "application-id": "com.meesho.supply",
      "country-iso": "in",
      "app-client-id": "android",
      "user-agent": "okhttp/4.9.0",
    },
  });
  if (!response.ok) throw new Error(`Meesho API returned ${response.status}`);

  const data = await response.json();
  const catalog = data?.catalog;
  const product = catalog?.products?.[0];
  if (!product) throw new Error("No product data found in response.");

  const images: string[] = [];
  (catalog?.images || []).forEach((img: any) => {
    const u = img?.url || img?.image_url;
    if (u && !images.includes(u)) images.push(u);
  });
  if (images.length === 0) {
    (product?.images || []).forEach((img: any) => {
      const u = typeof img === "string" ? img : img?.url || img?.image_url;
      if (u && !images.includes(u)) images.push(u);
    });
  }

  const sizes: string[] = [];
  (product?.inventory || []).forEach((item: any) => {
    const v = item?.variation?.name;
    if (v && !sizes.includes(v)) sizes.push(v);
  });

  const description =
    (catalog?.description?.sections || [])
      .map((s: any) => s?.description || "")
      .filter(Boolean)
      .join(" ")
      .trim() || product?.name || "";

  return {
    name: product.name || "Unnamed Product",
    costPrice: product.min_price || 0,
    description,
    image: images[0] || "",
    images,
    sizes,
    inStock: product.in_stock ?? true,
    quantity: (product?.inventory || []).filter((i: any) => i.in_stock).length || 1,
    category: catalog?.primary_tag?.name || "Uncategorized",
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyProduct = {
  name: "",
  price: 0,
  costPrice: 0,
  meeshoUrl: "",
  description: "",
  image: "",
  images: [] as string[],
  category: "",
  inStock: true,
  quantity: 0,
  sizes: [] as string[],
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminPanel = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<(Product & { firestoreId?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

  const [meeshoUrl, setMeeshoUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

  const isJewelry = JEWELRY_CATEGORIES.some(
    (c) => c.toLowerCase() === form.category.toLowerCase()
  );

  const margin = form.price && form.costPrice ? form.price - form.costPrice : 0;
  const marginPct = form.costPrice && form.price
    ? Math.round(((form.price - form.costPrice) / form.costPrice) * 100)
    : 0;

  // ── Firestore ──────────────────────────────────────────────────────────────

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "products"));
      const items = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
        firestoreId: d.id,
      })) as (Product & { firestoreId: string })[];
      setProducts(items);
    } catch {
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ── Image upload ───────────────────────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadToCloudinary(file);
        setForm((prev) => ({
          ...prev,
          image: prev.image || url,
          images: [...prev.images, url],
        }));
      }
      toast({ title: `${files.length} image(s) uploaded!` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      const next = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: next, image: next[0] || "" };
    });
  };

  const setCover = (index: number) => {
    setForm((prev) => {
      const next = [...prev.images];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return { ...prev, images: next, image: next[0] };
    });
  };

  // ── Meesho import ──────────────────────────────────────────────────────────

  const handleMeeshoImport = async () => {
    const id = extractMeeshoId(meeshoUrl);
    if (!id) {
      toast({ title: "Invalid Meesho link", description: "Please paste a valid Meesho product URL.", variant: "destructive" });
      return;
    }
    setImporting(true);
    setImportStatus("idle");
    try {
      const product = await fetchMeeshoProduct(id);
      setForm({
        name: product.name,
        price: 0,                     // admin fills selling price manually
        costPrice: product.costPrice, // Meesho price = your cost
        meeshoUrl: meeshoUrl.trim(),  // store the source URL
        description: product.description,
        image: product.image,
        images: product.images,
        category: product.category,
        inStock: product.inStock,
        quantity: product.quantity,
        sizes: product.sizes,
      });
      setImportStatus("success");
      setMeeshoUrl("");
      toast({ title: "✅ Imported from Meesho!", description: `Cost price: ₹${product.costPrice}. Now set your selling price.` });
    } catch (err: any) {
      setImportStatus("error");
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // ── Save / Edit / Delete ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast({ title: "Fill required fields", description: "Name, selling price and category are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const productData = {
      name: form.name,
      price: form.price,
      costPrice: form.costPrice || 0,
      meeshoUrl: form.meeshoUrl || "",
      description: form.description,
      image: form.image,
      images: form.images,
      category: form.category,
      inStock: form.quantity > 0,
      quantity: form.quantity,
      sizes: isJewelry ? [] : form.sizes,
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "products", editingId), { ...productData });
        toast({ title: "Product updated!" });
      } else {
        await addDoc(collection(db, "products"), { ...productData });
        toast({ title: "Product added!" });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyProduct);
      setImportStatus("idle");
      fetchProducts();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product & { firestoreId?: string }) => {
    setForm({
      name: product.name,
      price: product.price,
      costPrice: product.costPrice || 0,
      meeshoUrl: product.meeshoUrl || "",
      description: product.description,
      image: product.image,
      images: product.images || [],
      category: product.category,
      inStock: product.inStock,
      quantity: product.quantity || 0,
      sizes: product.sizes || [],
    });
    setEditingId(product.firestoreId || null);
    setImportStatus("idle");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (firestoreId: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", firestoreId));
      toast({ title: "Product deleted" });
      fetchProducts();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const toggleSize = (size: string) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const openNewForm = () => {
    setForm(emptyProduct);
    setEditingId(null);
    setImportStatus("idle");
    setMeeshoUrl("");
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold text-foreground">
              Urban <span className="text-primary">Dhage</span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs font-semibold text-primary">Admin</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {(["products", "orders"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2 font-body text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Products Tab ── */}
        {activeTab === "products" && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Products
                <span className="ml-2 font-body text-sm font-normal text-muted-foreground">({products.length})</span>
              </h2>
              {!showForm && (
                <Button onClick={openNewForm}>
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              )}
            </div>

            {/* ── Form ── */}
            {showForm && (
              <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">

                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {editingId ? "Edit Product" : "New Product"}
                  </h3>
                  <button
                    onClick={() => { setShowForm(false); setImportStatus("idle"); }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6 p-6">

                  {/* Meesho Import */}
                  <div className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                    importStatus === "success" ? "border-green-400 bg-green-50/50"
                    : importStatus === "error" ? "border-red-300 bg-red-50/50"
                    : "border-primary/30 bg-primary/5"
                  }`}>
                    <div className="mb-3 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-primary" />
                      <p className="font-body text-sm font-semibold text-foreground">Import from Meesho</p>
                      {importStatus === "success" && (
                        <span className="flex items-center gap-1 font-body text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Imported! Now set your selling price.
                        </span>
                      )}
                      {importStatus === "error" && (
                        <span className="flex items-center gap-1 font-body text-xs font-medium text-red-500">
                          <AlertCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste Meesho product link..."
                        value={meeshoUrl}
                        onChange={(e) => { setMeeshoUrl(e.target.value); setImportStatus("idle"); }}
                        className="font-body text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleMeeshoImport()}
                      />
                      <Button
                        type="button"
                        onClick={handleMeeshoImport}
                        disabled={importing || !meeshoUrl.trim()}
                        variant="outline"
                        className="shrink-0"
                      >
                        {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing</> : "Import"}
                      </Button>
                    </div>
                    <p className="mt-1.5 font-body text-xs text-muted-foreground">
                      Name, cost price, description, sizes & images auto-fill. Set your own selling price below.
                    </p>
                  </div>

                  {/* Fields */}
                  <div className="grid gap-4 sm:grid-cols-2">

                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product Name *</label>
                      <Input
                        placeholder="e.g. Kanjivaram Silk Saree"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>

                    {/* Cost Price */}
                    <div className="space-y-1">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cost Price (₹)
                        <span className="ml-1 normal-case font-normal text-muted-foreground/70">— your buying price</span>
                      </label>
                      <Input
                        placeholder="Auto-filled from Meesho"
                        type="number"
                        min={0}
                        value={form.costPrice || ""}
                        onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                        className="bg-muted/40"
                      />
                    </div>

                    {/* Selling Price */}
                    <div className="space-y-1">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Selling Price (₹) *
                        <span className="ml-1 normal-case font-normal text-muted-foreground/70">— shown to customers</span>
                      </label>
                      <Input
                        placeholder="e.g. 1299"
                        type="number"
                        min={0}
                        value={form.price || ""}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      />
                    </div>

                    {/* Margin indicator */}
                    {form.costPrice > 0 && form.price > 0 && (
                      <div className={`sm:col-span-2 flex items-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm ${
                        margin > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                      }`}>
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        {margin > 0
                          ? `Profit: ₹${margin} per unit (${marginPct}% margin)`
                          : `Warning: Selling price is lower than cost price!`
                        }
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category *</label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {["Sarees", "Kurtas", "Dupattas", "Accessories", "Lehengas", "Jewellery"].map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock Quantity *</label>
                      <Input
                        placeholder="e.g. 10"
                        type="number"
                        min={0}
                        value={form.quantity || ""}
                        onChange={(e) => {
                          const qty = Number(e.target.value);
                          setForm({ ...form, quantity: qty, inStock: qty > 0 });
                        }}
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Product description..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Meesho URL
                        <span className="ml-1 normal-case font-normal text-muted-foreground/70">— auto-filled on import</span>
                      </label>
                      <Input
                        placeholder="https://meesho.com/..."
                        value={form.meeshoUrl || ""}
                        onChange={(e) => setForm({ ...form, meeshoUrl: e.target.value })}
                        className="font-mono text-xs bg-muted/40"
                      />
                    </div>

                  </div>

                  {/* Sizes */}
                  {!isJewelry && (
                    <div className="space-y-2">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available Sizes</label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={`rounded-lg border px-4 py-1.5 font-body text-sm font-medium transition-colors ${
                              form.sizes.includes(size)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-background text-foreground hover:bg-accent"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product Images</label>
                      {form.images.length > 0 && (
                        <span className="font-body text-xs text-muted-foreground">Click image to set as cover</span>
                      )}
                    </div>
                    <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-4 py-2.5 font-body text-sm text-muted-foreground transition-colors hover:bg-accent">
                      {uploading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                        : <><ImagePlus className="h-4 w-4" /> Upload Images</>
                      }
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    {form.images.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {form.images.map((url, idx) => (
                          <div key={idx} className="group relative">
                            <img
                              src={url}
                              alt={`Image ${idx + 1}`}
                              onClick={() => setCover(idx)}
                              className={`h-24 w-24 cursor-pointer rounded-xl object-cover transition-all ${
                                idx === 0
                                  ? "ring-2 ring-primary ring-offset-2"
                                  : "opacity-80 hover:opacity-100 hover:ring-2 hover:ring-border"
                              }`}
                            />
                            {idx === 0 && (
                              <span className="absolute bottom-1 left-0 right-0 text-center font-body text-[10px] font-semibold text-primary">Cover</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:flex"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 border-t border-border pt-4">
                    <Button onClick={handleSave} disabled={saving} className="min-w-[130px]">
                      {saving
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        : editingId ? "Update Product" : "Add Product"
                      }
                    </Button>
                    <Button variant="outline" onClick={() => { setShowForm(false); setImportStatus("idle"); }}>
                      Cancel
                    </Button>
                  </div>

                </div>
              </div>
            )}

            {/* Product list */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading products...
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
                <PackageOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-heading text-base font-semibold text-foreground">No products yet</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">Add your first product to get started</p>
                <Button className="mt-4" onClick={openNewForm}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64?text=No+Image"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-body font-semibold text-foreground">{product.name}</h4>
                        {product.meeshoUrl && (
                          
                            href={product.meeshoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-body text-[10px] font-semibold text-primary hover:bg-primary/20"
                          >
                            Meesho ↗
                          </a>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-body text-sm font-semibold text-foreground">₹{product.price}</span>
                        {product.costPrice && product.costPrice > 0 && (
                          <>
                            <span className="font-body text-xs text-muted-foreground line-through">Cost ₹{product.costPrice}</span>
                            <span className="font-body text-xs font-semibold text-green-600">
                              +₹{product.price - product.costPrice} ({Math.round(((product.price - product.costPrice) / product.costPrice) * 100)}%)
                            </span>
                          </>
                        )}
                        <span className="text-muted-foreground">·</span>
                        <span className="font-body text-sm text-muted-foreground">{product.category}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-body text-sm text-muted-foreground">Stock: {product.quantity || 0}</span>
                        {(product.quantity || 0) <= 0 && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-body text-xs font-medium text-destructive">Out of stock</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => product.firestoreId && handleDelete(product.firestoreId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <PackageOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-heading text-base font-semibold text-foreground">Order management coming soon</p>
            <p className="mt-1 font-body text-sm text-muted-foreground">Orders from Firestore will appear here.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
