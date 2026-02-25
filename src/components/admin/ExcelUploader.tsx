import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Check, Loader2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedDish {
  category: string;
  name_he: string;
  name_en: string;
  description_he: string;
  description_en: string;
  price: number;
  image_url: string;
  chef_note: string;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  is_new: boolean;
}

interface ParsedData {
  categories: string[];
  dishes: ParsedDish[];
}

export function ExcelUploader({ onUpdate }: { onUpdate: () => void }) {
  const { toast } = useToast();
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          toast({ title: "שגיאה", description: "הקובץ ריק", variant: "destructive" });
          return;
        }

        // Auto-detect columns by looking at headers
        const headers = Object.keys(rows[0]);
        
        // Try to map columns - flexible matching (normalized)
        const findCol = (keywords: string[]) =>
          headers.find((h) => {
            const lower = h.toLowerCase().trim();
            return keywords.some((k) => lower.includes(k.toLowerCase()));
          }) || "";

        const colCategory = findCol(["קטגוריה", "category"]);
        const colNameHe = findCol(["שם המנה", "שם משקה", "שם", "name_he", "מנה"]);
        const colNameEn = findCol(["name_en", "שם באנגלית", "english"]);
        const colDescHe = findCol(["מרכיבים", "תיאור", "description_he"]);
        const colDescEn = findCol(["description_en", "תיאור באנגלית"]);
        const colPrice = findCol(["מחיר", "price"]);
        const colImage = findCol(["תמונה", "image", "קישור", "link", "url"]);
        const colChefNote = findCol(["דבר השף", "שף", "chef"]);
        const colDishType = findCol(["סוג מנה", "סוג"]);
        const colVegan = findCol(["טבעוני", "vegan"]);
        const colVegetarian = findCol(["צמחוני", "vegetarian"]);
        const colGlutenFree = findCol(["גלוטן", "gluten"]);
        const colSpicy = findCol(["חריף", "spicy"]);
        const colNew = findCol(["חדש", "new"]);

        const dishes: ParsedDish[] = [];
        const categorySet = new Set<string>();
        let lastCategory = "";

        for (const row of rows) {
          const rawCategory = String(row[colCategory] || "").trim();
          if (rawCategory) lastCategory = rawCategory;
          const category = lastCategory;
          const name_he = String(row[colNameHe] || "").trim();
          if (!name_he || !category) continue;

          categorySet.add(category);

          const parseBool = (val: any) => {
            if (!val) return false;
            const s = String(val).trim().toLowerCase();
            return s === "v" || s === "✓" || s === "✔" || s === "כן" || s === "true" || s === "1" || s === "yes";
          };

          dishes.push({
            category,
            name_he,
            name_en: String(row[colNameEn] || "").trim(),
            description_he: String(row[colDescHe] || "").trim(),
            description_en: String(row[colDescEn] || "").trim(),
            price: parseFloat(String(row[colPrice] || "0").split("/")[0].replace(/[^\d.]/g, "")) || 0,
            image_url: String(row[colImage] || "").trim(),
            chef_note: String(row[colChefNote] || "").trim(),
            is_vegan: parseBool(row[colVegan]),
            is_vegetarian: parseBool(row[colVegetarian]),
            is_gluten_free: parseBool(row[colGlutenFree]),
            is_spicy: parseBool(row[colSpicy]),
            is_new: parseBool(row[colNew]),
          });
        }

        setParsed({ categories: Array.from(categorySet), dishes });
      } catch (err: any) {
        toast({ title: "שגיאה בקריאת הקובץ", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);

    try {
      // Delete existing dishes first, then categories
      await supabase.from("dishes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert categories
      const categoryMap = new Map<string, string>();
      for (let i = 0; i < parsed.categories.length; i++) {
        const catName = parsed.categories[i];
        const { data, error } = await supabase
          .from("categories")
          .insert({ name_he: catName, name_en: "", display_order: i })
          .select("id")
          .single();
        if (error) throw error;
        categoryMap.set(catName, data.id);
      }

      // Insert dishes in batches
      const dishPayloads = parsed.dishes.map((d, i) => ({
        name_he: d.name_he,
        name_en: d.name_en,
        description_he: d.description_he,
        description_en: d.description_en,
        price: d.price,
        category_id: categoryMap.get(d.category)!,
        image_url: d.image_url || null,
        chef_note: d.chef_note,
        is_vegan: d.is_vegan,
        is_vegetarian: d.is_vegetarian,
        is_gluten_free: d.is_gluten_free,
        is_spicy: d.is_spicy,
        is_new: d.is_new,
        display_order: i,
        is_available: true,
      }));

      // Insert in chunks of 50
      for (let i = 0; i < dishPayloads.length; i += 50) {
        const chunk = dishPayloads.slice(i, i + 50);
        const { error } = await supabase.from("dishes").insert(chunk);
        if (error) throw error;
      }

      toast({ title: "הייבוא הושלם!", description: `${parsed.categories.length} קטגוריות, ${parsed.dishes.length} מנות` });
      setParsed(null);
      setFileName("");
      onUpdate();
    } catch (err: any) {
      toast({ title: "שגיאה בייבוא", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 gap-4">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm text-center">
          העלה קובץ אקסל עם עמודות: קטגוריה, שם מנה, תיאור, מחיר, קישור תמונה, דבר השף
        </p>
        <label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          <Button variant="outline" asChild>
            <span><Upload className="h-4 w-4 ml-2" />בחר קובץ</span>
          </Button>
        </label>
        {fileName && <p className="text-sm text-foreground">{fileName}</p>}
      </div>

      {parsed && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4 space-y-2">
              <h3 className="font-bold text-foreground">תצוגה מקדימה</h3>
              <p className="text-sm text-muted-foreground">
                {parsed.categories.length} קטגוריות · {parsed.dishes.length} מנות
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {parsed.categories.map((c) => (
                  <span key={c} className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">{c}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-start p-2">קטגוריה</th>
                  <th className="text-start p-2">שם</th>
                  <th className="text-start p-2">מחיר</th>
                  <th className="text-start p-2">תמונה</th>
                </tr>
              </thead>
              <tbody>
                {parsed.dishes.slice(0, 30).map((d, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2 text-muted-foreground">{d.category}</td>
                    <td className="p-2">{d.name_he}</td>
                    <td className="p-2">₪{d.price}</td>
                    <td className="p-2">{d.image_url ? "✓" : "—"}</td>
                  </tr>
                ))}
                {parsed.dishes.length > 30 && (
                  <tr><td colSpan={4} className="text-center p-2 text-muted-foreground">...ועוד {parsed.dishes.length - 30} מנות</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">ייבוא הנתונים ימחק את כל המנות והקטגוריות הקיימות ויחליף אותן בנתונים מהקובץ.</p>
          </div>

          <Button onClick={handleImport} disabled={importing} className="w-full">
            {importing ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />מייבא...</> : <><Check className="h-4 w-4 ml-2" />אשר וייבא</>}
          </Button>
        </div>
      )}
    </div>
  );
}
