import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCategories, useAllDishes } from "@/hooks/useMenu";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, LogOut, Eye, Search, ImageDown, Languages, Sparkles } from "lucide-react";
import lucianaLogo from "@/assets/luciana-logo.png";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { ExcelUploader } from "@/components/admin/ExcelUploader";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { compressImage } from "@/lib/compressImage";
import { translateHeToEn, detectDietaryTags } from "@/lib/translate";

type Category = Tables<"categories">;
type Dish = Tables<"dishes"> & { categories?: { name_he: string; name_en: string } | null };

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const { data: dishes = [] } = useAllDishes();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/admin/login");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/admin/login");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["all-dishes"] });
    queryClient.invalidateQueries({ queryKey: ["dishes"] });
  };

  if (!user) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={lucianaLogo} alt="Luciana" className="h-8 object-contain" />
            <span className="text-foreground font-semibold">ניהול תפריט</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} title="צפה בתפריט">
              <Eye className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="יציאה">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <Tabs defaultValue="dishes">
          <TabsList className="w-full">
            <TabsTrigger value="dishes" className="flex-1">מנות</TabsTrigger>
            <TabsTrigger value="categories" className="flex-1">קטגוריות</TabsTrigger>
            <TabsTrigger value="import" className="flex-1">ייבוא</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4 mt-4">
            <CategoryManager categories={categories} onUpdate={invalidate} />
          </TabsContent>

          <TabsContent value="dishes" className="space-y-4 mt-4">
            <DishManager dishes={dishes as Dish[]} categories={categories} onUpdate={invalidate} />
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <ExcelUploader onUpdate={invalidate} />
            <ReprocessImages dishes={dishes as Dish[]} onUpdate={invalidate} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ---- Category Manager ----
function CategoryManager({ categories, onUpdate }: { categories: Category[]; onUpdate: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name_he: "", name_en: "", display_order: 0 });
  const [translating, setTranslating] = useState(false);

  const handleTranslateName = async () => {
    if (!form.name_he) return;
    setTranslating(true);
    const en = await translateHeToEn(form.name_he);
    setForm((prev) => ({ ...prev, name_en: en }));
    setTranslating(false);
  };

  const handleSave = async () => {
    if (!form.name_he) return;
    if (editing) {
      const { error } = await supabase.from("categories").update(form).eq("id", editing.id);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("categories").insert(form);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    }
    setOpen(false);
    setEditing(null);
    setForm({ name_he: "", name_en: "", display_order: 0 });
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק קטגוריה? כל המנות בקטגוריה יימחקו.")) return;
    await supabase.from("categories").delete().eq("id", id);
    onUpdate();
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name_he: cat.name_he, name_en: cat.name_en, display_order: cat.display_order });
    setOpen(true);
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">קטגוריות</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name_he: "", name_en: "", display_order: 0 }); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 ms-1" />הוסף קטגוריה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editing ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>שם בעברית</Label><Input value={form.name_he} onChange={(e) => setForm({ ...form, name_he: e.target.value })} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>שם באנגלית</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={handleTranslateName} disabled={translating || !form.name_he}>
                    <Languages className="h-3 w-3" />{translating ? "מתרגם..." : "תרגם"}
                  </Button>
                </div>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
              </div>
              <div><Label>סדר תצוגה</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: +e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div>
                <span className="font-medium text-foreground">{cat.name_he}</span>
                {cat.name_en && <span className="text-muted-foreground text-sm ms-2">({cat.name_en})</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ---- Dish Manager ----
function DishManager({ dishes, categories, onUpdate }: { dishes: Dish[]; categories: Category[]; onUpdate: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search to avoid filtering on every keystroke
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const emptyForm = useMemo(() => ({
    name_he: "", name_en: "", description_he: "", description_en: "",
    price: 0, category_id: "", is_available: true, is_vegan: false,
    is_gluten_free: false, is_spicy: false, is_vegetarian: false, is_new: false, display_order: 0, image_url: "", chef_note: "", chef_note_en: "",
  }), []);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null); // which field is translating

  // Translate a single Hebrew field → English counterpart
  const handleTranslateField = async (heKey: "name_he" | "description_he" | "chef_note", enKey: "name_en" | "description_en" | "chef_note_en") => {
    const text = form[heKey];
    if (!text) return;
    setTranslating(heKey);
    const en = await translateHeToEn(text);
    setForm((prev) => ({ ...prev, [enKey]: en }));
    setTranslating(null);
  };

  // Translate all Hebrew fields at once
  const handleTranslateAll = async () => {
    setTranslating("all");
    const results = await Promise.all([
      form.name_he ? translateHeToEn(form.name_he) : Promise.resolve(""),
      form.description_he ? translateHeToEn(form.description_he) : Promise.resolve(""),
      form.chef_note ? translateHeToEn(form.chef_note) : Promise.resolve(""),
    ]);
    setForm((prev) => ({
      ...prev,
      name_en: results[0] || prev.name_en,
      description_en: results[1] || prev.description_en,
      chef_note_en: results[2] || prev.chef_note_en,
    }));
    setTranslating(null);
    toast({ title: "תורגם!", description: "השדות תורגמו לאנגלית." });
  };

  // Auto-detect dietary tags from all Hebrew text
  const handleDetectTags = () => {
    const allText = `${form.name_he} ${form.description_he} ${form.chef_note}`;
    const detected = detectDietaryTags(allText);
    if (Object.keys(detected).length === 0) {
      toast({ title: "לא זוהו תגיות", description: "לא נמצאו סימנים דיאטטיים בטקסט." });
      return;
    }
    // Only turn tags ON, never turn them off
    setForm((prev) => ({ ...prev, ...detected }));
    const names = [];
    if (detected.is_vegan) names.push("טבעוני");
    if (detected.is_vegetarian) names.push("צמחוני");
    if (detected.is_gluten_free) names.push("ללא גלוטן");
    if (detected.is_spicy) names.push("חריף");
    toast({ title: "תגיות זוהו!", description: names.join(", ") });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Compress to max 1200px wide JPEG (~150KB instead of ~8MB)
    const compressed = await compressImage(file, 1200, 0.75);
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("dish-images").upload(path, compressed);
    if (error) {
      toast({ title: "שגיאה בהעלאת תמונה", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("dish-images").getPublicUrl(path);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name_he || !form.category_id) {
      toast({ title: "שגיאה", description: "יש למלא שם ולבחור קטגוריה", variant: "destructive" });
      return;
    }
    const payload: any = { ...form };
    if (!payload.image_url) delete payload.image_url;

    if (editing) {
      const { error } = await supabase.from("dishes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("dishes").insert(payload);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    onUpdate();
  };

  const toggleAvailability = async (dish: Dish) => {
    await supabase.from("dishes").update({ is_available: !dish.is_available }).eq("id", dish.id);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק מנה?")) return;
    await supabase.from("dishes").delete().eq("id", id);
    onUpdate();
  };

  const openEdit = (dish: Dish) => {
    setEditing(dish);
    setForm({
      name_he: dish.name_he, name_en: dish.name_en, description_he: dish.description_he || "",
      description_en: dish.description_en || "", price: dish.price, category_id: dish.category_id,
      is_available: dish.is_available, is_vegan: dish.is_vegan, is_gluten_free: dish.is_gluten_free,
      is_spicy: dish.is_spicy, is_vegetarian: dish.is_vegetarian, is_new: dish.is_new,
      display_order: dish.display_order, image_url: dish.image_url || "",
      chef_note: dish.chef_note || "", chef_note_en: (dish as any).chef_note_en || "",
    });
    setOpen(true);
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">מנות</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 ms-1" />הוסף מנה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "עריכת מנה" : "מנה חדשה"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {/* ---- Hebrew / English name pair ---- */}
              <div><Label>שם בעברית</Label><Input value={form.name_he} onChange={(e) => setForm({ ...form, name_he: e.target.value })} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>שם באנגלית</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => handleTranslateField("name_he", "name_en")} disabled={translating !== null || !form.name_he}>
                    <Languages className="h-3 w-3" />{translating === "name_he" ? "מתרגם..." : "תרגם"}
                  </Button>
                </div>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
              </div>

              {/* ---- Hebrew / English description pair ---- */}
              <div><Label>תיאור בעברית</Label><Textarea value={form.description_he} onChange={(e) => setForm({ ...form, description_he: e.target.value })} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>תיאור באנגלית</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => handleTranslateField("description_he", "description_en")} disabled={translating !== null || !form.description_he}>
                    <Languages className="h-3 w-3" />{translating === "description_he" ? "מתרגם..." : "תרגם"}
                  </Button>
                </div>
                <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} dir="ltr" />
              </div>

              {/* ---- Translate-all shortcut ---- */}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={handleTranslateAll} disabled={translating !== null || (!form.name_he && !form.description_he)}>
                <Languages className="h-4 w-4" />{translating === "all" ? "מתרגם הכל..." : "תרגם הכל לאנגלית"}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>מחיר (₪)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
                <div>
                  <Label>קטגוריה</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_he}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>סדר תצוגה</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: +e.target.value })} /></div>
              <div>
                <Label>תמונה</Label>
                {form.image_url && <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />}
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              </div>
              {/* ---- Hebrew / English chef note pair ---- */}
              <div><Label>דבר השף (עברית)</Label><Textarea value={form.chef_note} onChange={(e) => setForm({ ...form, chef_note: e.target.value })} placeholder="תיאור מיוחד מהשף..." /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>דבר השף (אנגלית)</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => handleTranslateField("chef_note", "chef_note_en")} disabled={translating !== null || !form.chef_note}>
                    <Languages className="h-3 w-3" />{translating === "chef_note" ? "מתרגם..." : "תרגם"}
                  </Button>
                </div>
                <Textarea value={form.chef_note_en} onChange={(e) => setForm({ ...form, chef_note_en: e.target.value })} placeholder="Chef's special note..." dir="ltr" />
              </div>

              {/* ---- Dietary toggles + auto-detect ---- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">תגיות</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={handleDetectTags}>
                    <Sparkles className="h-3 w-3" />זיהוי אוטומטי
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2"><Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} /><span className="text-sm">זמין</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_new} onCheckedChange={(v) => setForm({ ...form, is_new: v })} /><span className="text-sm">חדש</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_vegan} onCheckedChange={(v) => setForm({ ...form, is_vegan: v })} /><span className="text-sm">טבעוני</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_vegetarian} onCheckedChange={(v) => setForm({ ...form, is_vegetarian: v })} /><span className="text-sm">צמחוני</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_gluten_free} onCheckedChange={(v) => setForm({ ...form, is_gluten_free: v })} /><span className="text-sm">ללא גלוטן</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_spicy} onCheckedChange={(v) => setForm({ ...form, is_spicy: v })} /><span className="text-sm">חריף</span></label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={uploading || translating !== null}>{uploading ? "מעלה..." : "שמור"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חפש מנה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      <div className="grid gap-3">
        {dishes.filter((d) => !debouncedSearch || d.name_he.includes(debouncedSearch) || d.name_en.toLowerCase().includes(debouncedSearch.toLowerCase())).map((dish) => (
          <Card key={dish.id} className={!dish.is_available ? "opacity-50" : ""}>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              {dish.image_url && (
                <img src={getProxiedImageUrl(dish.image_url) || ""} alt="" className="w-12 h-12 object-cover rounded-md shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{dish.name_he}</div>
                <div className="text-sm text-muted-foreground">
                  {(dish as any).categories?.name_he} · ₪{dish.price}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={dish.is_available} onCheckedChange={() => toggleAvailability(dish)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(dish)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(dish.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {dishes.length === 0 && (
          <p className="text-center text-muted-foreground py-8">אין מנות עדיין. הוסף מנה ראשונה!</p>
        )}
      </div>
    </>
  );
}

// ---- Reprocess Images ----
function ReprocessImages({ dishes, onUpdate }: { dishes: Dish[]; onUpdate: () => void }) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, skipped: 0, saved: 0 });

  const reprocess = async () => {
    // Only process dishes with Supabase storage URLs
    const withImages = dishes.filter((d) => d.image_url?.includes("supabase.co/storage/"));
    if (withImages.length === 0) {
      toast({ title: "אין תמונות", description: "לא נמצאו תמונות בתפריט לעיבוד." });
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: withImages.length, skipped: 0, saved: 0 });
    let skipped = 0;
    let totalSaved = 0;

    for (let i = 0; i < withImages.length; i++) {
      const dish = withImages[i];
      const url = dish.image_url!;

      try {
        // Extract the storage path from the public URL
        // https://xxx.supabase.co/storage/v1/object/public/dish-images/UUID.ext
        const pathMatch = url.match(/\/dish-images\/(.+)$/);
        if (!pathMatch) {
          skipped++;
          setProgress({ current: i + 1, total: withImages.length, skipped, saved: totalSaved });
          continue;
        }
        const oldPath = pathMatch[1];

        // Download the original
        const response = await fetch(url);
        if (!response.ok) {
          skipped++;
          setProgress({ current: i + 1, total: withImages.length, skipped, saved: totalSaved });
          continue;
        }
        const blob = await response.blob();
        const originalSize = blob.size;

        // Skip images that are already small (< 300 KB)
        if (originalSize < 300 * 1024) {
          skipped++;
          setProgress({ current: i + 1, total: withImages.length, skipped, saved: totalSaved });
          continue;
        }

        // Compress
        const file = new File([blob], oldPath, { type: blob.type || "image/jpeg" });
        const compressed = await compressImage(file, 1200, 0.75);

        // Upload compressed version under a new name
        const newPath = `${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("dish-images").upload(newPath, compressed);
        if (upErr) {
          skipped++;
          setProgress({ current: i + 1, total: withImages.length, skipped, saved: totalSaved });
          continue;
        }

        // Get the new public URL & update the dish record
        const { data: urlData } = supabase.storage.from("dish-images").getPublicUrl(newPath);
        await supabase.from("dishes").update({ image_url: urlData.publicUrl }).eq("id", dish.id);

        // Remove the old file to free storage
        await supabase.storage.from("dish-images").remove([oldPath]);

        totalSaved += originalSize - compressed.size;
      } catch {
        skipped++;
      }

      setProgress({ current: i + 1, total: withImages.length, skipped, saved: totalSaved });
    }

    setProcessing(false);
    onUpdate();

    const processed = withImages.length - skipped;
    const savedMB = (totalSaved / (1024 * 1024)).toFixed(1);
    toast({
      title: "עיבוד הושלם!",
      description: `${processed} תמונות דוחסו (חסכון ${savedMB} MB), ${skipped} דולגו.`,
    });
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageDown className="h-5 w-5" />
          עיבוד תמונות מחדש
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          דחיסת כל התמונות הקיימות לגודל מותאם למובייל (1200px רוחב, JPEG 75%).
          תמונות קטנות מ-300KB ידולגו אוטומטית.
        </p>

        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>מעבד {progress.current} / {progress.total}</span>
              <span>
                {progress.skipped > 0 && `דולגו: ${progress.skipped}`}
                {progress.saved > 0 && ` · נחסכו: ${(progress.saved / (1024 * 1024)).toFixed(1)} MB`}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <Button onClick={reprocess} disabled={processing} variant="outline" className="w-full">
          {processing ? `מעבד... (${progress.current}/${progress.total})` : "עיבוד כל התמונות מחדש"}
        </Button>
      </CardContent>
    </Card>
  );
}
