import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ImageDown, Loader2, CheckCircle, AlertTriangle, Square } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface BatchResult {
  imported: number;
  failed: number;
  skipped: number;
  errors?: string[];
  message?: string;
  totalRemaining: number;
  hasMore: boolean;
}

interface AggregatedResult {
  imported: number;
  failed: number;
  skipped: number;
  errors: string[];
  total: number;
  processed: number;
}

export function ImportImagesButton({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AggregatedResult | null>(null);
  const cancelRef = useRef(false);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    cancelRef.current = false;

    const agg: AggregatedResult = { imported: 0, failed: 0, skipped: 0, errors: [], total: 0, processed: 0 };

    try {
      let hasMore = true;
      let firstRun = true;

      while (hasMore && !cancelRef.current) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/import-drive-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ batchSize: 10 }),
        });

        const data: BatchResult = await res.json();

        if (firstRun) {
          agg.total = data.totalRemaining;
          firstRun = false;
        }

        agg.imported += data.imported;
        agg.failed += data.failed;
        agg.skipped += data.skipped;
        agg.processed += data.imported + data.failed + data.skipped;
        if (data.errors) agg.errors.push(...data.errors);

        hasMore = data.hasMore;
        setResult({ ...agg });
      }

      if (agg.imported > 0) {
        toast({ title: "הייבוא הושלם!", description: `${agg.imported} תמונות יובאו בהצלחה` });
        onDone();
      } else if (agg.total === 0) {
        toast({ title: "אין תמונות לייבוא", description: "כל התמונות כבר מאוחסנות מקומית" });
      } else {
        toast({ title: "הייבוא הסתיים", description: `${agg.failed} נכשלו, ${agg.skipped} דולגו`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const progressPercent = result && result.total > 0
    ? Math.round((result.processed / result.total) * 100)
    : 0;

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

      <div className="flex gap-2">
        <Button onClick={handleImport} disabled={loading} className="flex-1">
          {loading ? (
            <><Loader2 className="h-4 w-4 ml-2 animate-spin" />מייבא תמונות...</>
          ) : (
            <><ImageDown className="h-4 w-4 ml-2" />ייבא תמונות מ-Drive לאחסון</>
          )}
        </Button>
        {loading && (
          <Button variant="outline" onClick={handleCancel} size="icon">
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>

      {loading && result && result.total > 0 && (
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {result.processed} / {result.total} ({progressPercent}%) — ✓ {result.imported} · ✗ {result.failed} · ⊘ {result.skipped}
          </p>
        </div>
      )}

      {loading && (!result || result.total === 0) && (
        <div className="space-y-1">
          <Progress value={undefined} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">מחפש תמונות לייבוא...</p>
        </div>
      )}

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
          {result.total === 0 && result.imported === 0 && (
            <div className="text-muted-foreground">אין תמונות מ-Drive לייבוא — הכל כבר מאוחסן מקומית ✓</div>
          )}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">פרטי שגיאות ({result.errors.length})</summary>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground" dir="ltr">
                {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
