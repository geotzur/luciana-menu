import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ImageDown, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface ImportResult {
  imported: number;
  failed: number;
  skipped: number;
  errors?: string[];
  message?: string;
}

export function ImportImagesButton({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/import-drive-images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      const data: ImportResult = await res.json();
      setResult(data);

      if (data.imported > 0) {
        toast({ title: "הייבוא הושלם!", description: `${data.imported} תמונות יובאו בהצלחה` });
        onDone();
      } else if (data.message) {
        toast({ title: "אין תמונות לייבוא", description: data.message });
      } else {
        toast({ title: "הייבוא הסתיים", description: `${data.failed} נכשלו, ${data.skipped} דולגו`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <ImageDown className="h-8 w-8 text-primary shrink-0" />
        <div>
          <h3 className="font-bold text-foreground">ייבוא תמונות מ-Google Drive</h3>
          <p className="text-sm text-muted-foreground">
            מוריד את כל התמונות מ-Drive ושומר אותן באחסון המערכת לטעינה מהירה
          </p>
        </div>
      </div>

      <Button onClick={handleImport} disabled={loading} className="w-full">
        {loading ? (
          <><Loader2 className="h-4 w-4 ml-2 animate-spin" />מייבא תמונות... (זה יכול לקחת דקה)</>
        ) : (
          <><ImageDown className="h-4 w-4 ml-2" />ייבא תמונות מ-Drive לאחסון</>
        )}
      </Button>

      {loading && <Progress value={undefined} className="h-2" />}

      {result && !loading && (
        <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
          {result.imported > 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>{result.imported} תמונות יובאו בהצלחה</span>
            </div>
          )}
          {result.skipped > 0 && (
            <div className="text-muted-foreground">דולגו: {result.skipped}</div>
          )}
          {result.failed > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{result.failed} נכשלו</span>
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">פרטי שגיאות</summary>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground" dir="ltr">
                {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
