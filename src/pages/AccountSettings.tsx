import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  MapPin,
  Lock,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ShippingAddress } from "@/types/order";

// ─── Constants ───────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

const emptyAddress: ShippingAddress = {
  fullName: "", phone: "", street: "", city: "", state: "", pincode: "",
};

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
          <p className="font-body text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Address card ─────────────────────────────────────────────────────────────

function AddressCard({
  address,
  index,
  isDefault,
  onSetDefault,
  onDelete,
}: {
  address: ShippingAddress;
  index: number;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        isDefault ? "border-primary/40 bg-primary/[0.03]" : "border-border bg-background"
      }`}
    >
      {isDefault && (
        <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 font-body text-[10px] font-semibold text-primary">
          Default
        </span>
      )}
      <p className="font-body text-sm font-semibold text-foreground">{address.fullName}</p>
      <p className="mt-0.5 font-body text-xs text-muted-foreground">
        {address.phone}
      </p>
      <p className="mt-1 font-body text-xs leading-relaxed text-muted-foreground">
        {address.street}, {address.city}, {address.state} — {address.pincode}
      </p>
      <div className="mt-3 flex items-center gap-3">
        {!isDefault && (
          <button
            onClick={onSetDefault}
            className="font-body text-xs font-medium text-primary hover:underline"
          >
            Set as default
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center gap-1 font-body text-xs text-destructive hover:underline"
        >
          <Trash2 className="h-3 w-3" />
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Add address form ─────────────────────────────────────────────────────────

function AddAddressForm({
  onSave,
  onCancel,
}: {
  onSave: (addr: ShippingAddress) => void;
  onCancel: () => void;
}) {
  const [address, setAddress] = useState<ShippingAddress>(emptyAddress);
  const { toast } = useToast();

  const field = (key: keyof ShippingAddress) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddress((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!address.fullName.trim()) return "Full name is required";
    if (!/^[6-9]\d{9}$/.test(address.phone)) return "Enter a valid 10-digit mobile number";
    if (!address.street.trim()) return "Street address is required";
    if (!address.city.trim()) return "City is required";
    if (!address.state) return "Please select a state";
    if (!/^\d{6}$/.test(address.pincode)) return "Enter a valid 6-digit pincode";
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    onSave(address);
  };

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.02] p-4">
      <p className="mb-3 font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        New Address
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="font-body text-xs text-muted-foreground">Full Name *</label>
          <Input placeholder="Priya Sharma" value={address.fullName} onChange={field("fullName")} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="font-body text-xs text-muted-foreground">Mobile Number *</label>
          <Input placeholder="9876543210" maxLength={10} value={address.phone} onChange={field("phone")} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="font-body text-xs text-muted-foreground">Street Address *</label>
          <Input placeholder="House no., Street, Area, Landmark" value={address.street} onChange={field("street")} />
        </div>
        <div className="space-y-1">
          <label className="font-body text-xs text-muted-foreground">City *</label>
          <Input placeholder="Lucknow" value={address.city} onChange={field("city")} />
        </div>
        <div className="space-y-1">
          <label className="font-body text-xs text-muted-foreground">Pincode *</label>
          <Input placeholder="226001" maxLength={6} value={address.pincode} onChange={field("pincode")} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="font-body text-xs text-muted-foreground">State *</label>
          <select
            value={address.state}
            onChange={field("state")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" className="rounded-full" onClick={handleSave}>
          Save Address
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password state ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword]   = useState(false);
  const [passwordOpen, setPasswordOpen]       = useState(false);

  // ── Address state ──────────────────────────────────────────────────────────
  const [addresses, setAddresses]       = useState<ShippingAddress[]>([]);
  const [defaultIndex, setDefaultIndex] = useState(0);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [savingAddresses, setSavingAddresses] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    setDisplayName(user.displayName ?? "");
    loadAddresses();
  }, [user]);

  // ── Firestore helpers ──────────────────────────────────────────────────────

  const userDocRef = user ? doc(db, "users", user.uid) : null;

  const loadAddresses = async () => {
    if (!userDocRef) return;
    setLoadingAddresses(true);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        setAddresses(data.savedAddresses ?? []);
        setDefaultIndex(data.defaultAddressIndex ?? 0);
      }
    } catch (e) {
      console.error("Failed to load addresses:", e);
    }
    setLoadingAddresses(false);
  };

  const persistAddresses = async (
    newAddresses: ShippingAddress[],
    newDefault: number
  ) => {
    if (!userDocRef) return;
    setSavingAddresses(true);
    try {
      await setDoc(
        userDocRef,
        { savedAddresses: newAddresses, defaultAddressIndex: newDefault },
        { merge: true }
      );
      toast({ title: "Addresses saved" });
    } catch (e) {
      toast({ title: "Failed to save addresses", variant: "destructive" });
    }
    setSavingAddresses(false);
  };

  // ── Profile save ───────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: displayName.trim() || null });
      toast({ title: "Profile updated" });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to update profile", variant: "destructive" });
    }
    setSavingProfile(false);
  };

  // ── Password save ──────────────────────────────────────────────────────────

  const handleSavePassword = async () => {
    if (!user?.email) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordOpen(false);
      toast({ title: "Password updated successfully" });
    } catch (e: any) {
      const msg = e.code === "auth/wrong-password"
        ? "Current password is incorrect"
        : e.message ?? "Failed to update password";
      toast({ title: msg, variant: "destructive" });
    }
    setSavingPassword(false);
  };

  // ── Address handlers ───────────────────────────────────────────────────────

  const handleAddAddress = (addr: ShippingAddress) => {
    const updated = [...addresses, addr];
    const newDefault = addresses.length === 0 ? 0 : defaultIndex;
    setAddresses(updated);
    setDefaultIndex(newDefault);
    setShowAddForm(false);
    persistAddresses(updated, newDefault);
  };

  const handleDeleteAddress = (idx: number) => {
    const updated = addresses.filter((_, i) => i !== idx);
    const newDefault = defaultIndex >= updated.length
      ? Math.max(0, updated.length - 1)
      : defaultIndex;
    setAddresses(updated);
    setDefaultIndex(newDefault);
    persistAddresses(updated, newDefault);
  };

  const handleSetDefault = (idx: number) => {
    setDefaultIndex(idx);
    persistAddresses(addresses, idx);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const isGoogleUser = user?.providerData?.[0]?.providerId === "google.com";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-24 md:pb-12">

        {/* Header */}
        <div className="border-b border-border bg-card/50">
          <div className="mx-auto max-w-2xl px-4 py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground">Account Settings</h1>
                <p className="font-body text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">

          {/* ── Profile ────────────────────────────────────────────────────── */}
          <Section
            icon={<User className="h-4 w-4" />}
            title="Profile"
            subtitle="Update your display name"
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-body text-xs text-muted-foreground">Display Name</label>
                <Input
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-body text-xs text-muted-foreground">Email</label>
                <Input value={user?.email ?? ""} disabled className="opacity-60" />
                <p className="font-body text-[11px] text-muted-foreground">
                  Email changes are not supported at this time.
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-full"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                  : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Save Profile</>
                }
              </Button>
            </div>
          </Section>

          {/* ── Password ───────────────────────────────────────────────────── */}
          {!isGoogleUser && (
            <Section
              icon={<Lock className="h-4 w-4" />}
              title="Password"
              subtitle="Change your account password"
            >
              <button
                className="flex w-full items-center justify-between font-body text-sm font-medium text-foreground"
                onClick={() => setPasswordOpen((p) => !p)}
              >
                Change password
                {passwordOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {passwordOpen && (
                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="font-body text-xs text-muted-foreground">Current Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-body text-xs text-muted-foreground">New Password</label>
                    <Input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-body text-xs text-muted-foreground">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={handleSavePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword
                      ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Updating...</>
                      : "Update Password"
                    }
                  </Button>
                </div>
              )}
            </Section>
          )}

          {/* ── Saved Addresses ─────────────────────────────────────────────── */}
          <Section
            icon={<MapPin className="h-4 w-4" />}
            title="Saved Addresses"
            subtitle="Addresses auto-fill at checkout"
          >
            {loadingAddresses ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
              <>
                {addresses.length === 0 && !showAddForm && (
                  <p className="font-body text-sm text-muted-foreground">
                    No saved addresses. Add one to speed up checkout.
                  </p>
                )}

                <div className="space-y-3">
                  {addresses.map((addr, idx) => (
                    <AddressCard
                      key={idx}
                      address={addr}
                      index={idx}
                      isDefault={idx === defaultIndex}
                      onSetDefault={() => handleSetDefault(idx)}
                      onDelete={() => handleDeleteAddress(idx)}
                    />
                  ))}
                </div>

                {showAddForm ? (
                  <AddAddressForm
                    onSave={handleAddAddress}
                    onCancel={() => setShowAddForm(false)}
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 rounded-full gap-1.5"
                    onClick={() => setShowAddForm(true)}
                    disabled={savingAddresses}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add New Address
                  </Button>
                )}
              </>
            )}
          </Section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
