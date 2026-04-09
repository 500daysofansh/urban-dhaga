import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Product, JEWELRY_CATEGORIES, AVAILABLE_SIZES } from "@/types/product";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const emptyProduct = {
  name: "",
  price: 0,
  description: "",
  image: "",
  images: [] as string[],
  category: "",
  inStock: true,
  quantity: 0,
  sizes: [] as string[],
};

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
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

  const isJewelryCategory = JEWELRY_CATEGORIES.some(
    (c) => c.toLowerCase() === form.category.toLowerCase()
  );

  const fetchProducts = async () => {
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

  useEffect(() => {
    fetchProducts();
  }, []);

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
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        image: newImages[0] || "",
      };
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    const productData = {
      ...form,
      inStock: form.quantity > 0,
      sizes: isJewelryCategory ? [] : form.sizes,
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
      fetchProducts();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
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

  const handleEdit = (product: Product & { firestoreId?: string }) => {
    setForm({
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      images: product.images || [],
      category: product.category,
      inStock: product.inStock,
      quantity: product.quantity || 0,
      sizes: product.sizes || [],
    });
    setEditingId(product.firestoreId || null);
    setShowForm(true);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            Urban <span className="text-primary">Dhaga</span> — Admin
          </h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex gap-2">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            onClick={() => setActiveTab("products")}
          >
            Products
          </Button>
          <Button
            variant={activeTab === "orders" ? "default" : "outline"}
            onClick={() => setActiveTab("orders")}
          >
            Orders
          </Button>
        </div>

        {activeTab === "products" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Products ({products.length})
              </h2>
              <Button
                onClick={() => {
                  setForm(emptyProduct);
                  setEditingId(null);
                  setShowForm(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </div>

            {showForm && (
              <div className="mb-6 rounded-lg border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {editingId ? "Edit Product" : "New Product"}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    placeholder="Product Name *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    placeholder="Price *"
                    type="number"
                    value={form.price || ""}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm({ ...form, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category *" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Sarees", "Kurtas", "Dupattas", "Accessories", "Lehengas", "Jewellery"].map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Stock Quantity *"
                    type="number"
                    min={0}
                    value={form.quantity || ""}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      setForm({ ...form, quantity: qty, inStock: qty > 0 });
                    }}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  {/* Size selector — hidden for jewelry */}
                  {!isJewelryCategory && (
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Available Sizes
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
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

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Product Images
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
                        <Upload className="mr-2 inline h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload Images"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    {form.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {form.images.map((url, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={url}
                              alt={`Preview ${idx + 1}`}
                              className={`h-20 w-20 rounded-md object-cover border-2 ${idx === 0 ? "border-primary" : "border-transparent"}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {idx === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-center text-[10px] text-primary-foreground">
                                Cover
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleSave}>
                    {editingId ? "Update" : "Add"} Product
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-muted-foreground">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="text-muted-foreground">No products yet. Add your first product!</p>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 rounded-lg border bg-card p-4"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ₹{product.price} · {product.category} · Stock: {product.quantity || 0}
                        {product.sizes && product.sizes.length > 0 && (
                          <span className="ml-2">· Sizes: {product.sizes.join(", ")}</span>
                        )}
                        {(product.quantity || 0) <= 0 && (
                          <span className="ml-2 text-destructive">Out of stock</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => product.firestoreId && handleDelete(product.firestoreId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "orders" && (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Order management coming soon. Orders from Firestore will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
