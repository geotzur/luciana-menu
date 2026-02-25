

# תוכנית: העלאת אקסל באדמין + תיקון תמונות

## סיכום
הוספת אפשרות העלאת קובץ אקסל ישירות מממשק הניהול לעדכון התפריט, ותיקון בעיית התמונות שלא מוצגות בגלל חסימת Google Drive.

## בעיית התמונות
כרגע כל התמונות מקושרות כ-`https://drive.google.com/uc?export=view&id=...` - Google חוסמת את ההצגה הישירה של תמונות מ-Drive באתרים חיצוניים (CORS + redirect). לכן התמונות לא נטענות.

### פתרון: Edge Function לפרוקסי תמונות
- ניצור Edge Function בשם `proxy-image` שמקבלת URL של Google Drive ומחזירה את התמונה
- הפונקציה תוריד את התמונה מ-Google Drive ותעביר אותה הלאה
- בצד הלקוח, במקום להציג את ה-URL ישירות, נפנה דרך ה-Edge Function
- לחלופין: ניתן להוסיף כפתור באדמין ש"מייבא" את כל התמונות מ-Drive לאחסון המערכת (storage bucket) - אבל זה יותר מורכב

### פתרון חלופי (מומלץ): ייבוא תמונות לאחסון
- ניצור Edge Function בשם `import-drive-images` שעוברת על כל המנות עם URL של Google Drive
- מורידה כל תמונה ומעלה אותה ל-storage bucket `dish-images`
- מעדכנת את ה-URL בטבלה לכתובת מקומית
- כפתור "ייבא תמונות" באדמין שמפעיל את התהליך

## העלאת אקסל באדמין

### שלב 1: התקנת ספריית קריאת אקסל
- הוספת `xlsx` (SheetJS) לפרויקט לקריאת קבצי Excel בצד הלקוח

### שלב 2: רכיב העלאת אקסל
- יצירת קומפוננטה `ExcelUploader` בתוך `src/components/admin/ExcelUploader.tsx`
- כפתור "העלה קובץ אקסל" בראש עמוד האדמין
- בלחיצה: קריאת הקובץ, פרסור העמודות (שם מנה, תיאור, מחיר, קטגוריה, דבר השף, קישור תמונה)
- הצגת תצוגה מקדימה של הנתונים לפני שמירה
- כפתור "אשר ועדכן" שמבצע את השינויים

### שלב 3: לוגיקת עדכון
- מחיקת כל המנות והקטגוריות הקיימות
- הוספת הקטגוריות החדשות מהאקסל
- הוספת כל המנות עם מיפוי לקטגוריות
- שמירת קישורי תמונות כפי שהם (או עם proxy)

### שלב 4: טאב חדש באדמין
- הוספת טאב "ייבוא" ב-Tabs של עמוד האדמין
- בטאב: אזור העלאה, תצוגה מקדימה, וכפתור אישור

## פתרון התמונות - Edge Function proxy

### שלב 1: יצירת Edge Function
- `supabase/functions/proxy-image/index.ts`
- מקבלת פרמטר `url` ב-query string
- מורידה את התמונה ומחזירה אותה עם headers מתאימים

### שלב 2: עדכון DishCard
- כשה-image_url מתחיל ב-`https://drive.google.com`, נפנה דרך ה-proxy
- פונקציית עזר `getImageUrl(url)` שבודקת ומחליפה את ה-URL

---

## פרטים טכניים

### קבצים חדשים
1. `src/components/admin/ExcelUploader.tsx` - רכיב העלאת אקסל
2. `supabase/functions/proxy-image/index.ts` - Edge Function לפרוקסי תמונות

### קבצים שישתנו
1. `src/pages/Admin.tsx` - הוספת טאב ייבוא אקסל
2. `src/components/menu/DishCard.tsx` - שימוש ב-proxy לתמונות Drive
3. `src/lib/imageUtils.ts` - פונקציית עזר לבניית URL תמונה

### תלויות חדשות
- `xlsx` (SheetJS) - לקריאת קבצי Excel בצד הלקוח

### מבנה אקסל צפוי
הקומפוננטה תתמוך במבנה האקסל הנוכחי עם העמודות:
- קטגוריה / שם מנה / תיאור / מחיר / קישור תמונה / דבר השף

### Edge Function - proxy-image
```text
GET /proxy-image?url=https://drive.google.com/uc?export=view&id=...
Response: image/jpeg (binary)
```

