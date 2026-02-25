
# ייבוא תמונות מ-Google Drive לאחסון מקומי

## הבעיה
התמונות נטענות דרך proxy שמוריד כל תמונה מ-Google Drive בזמן אמת - זה איטי כי Google Drive לא מיועד לשרת תמונות לאתרים.

## הפתרון
יצירת Edge Function שמורידה את כל התמונות מ-Google Drive ומעלה אותן לאחסון המערכת (`dish-images` bucket). אחרי זה התמונות ישורתו ישירות מהאחסון שלנו - הרבה יותר מהר.

## שלבים

### 1. Edge Function חדשה: `import-drive-images`
- עוברת על כל המנות בטבלה שיש להן URL של Google Drive
- מורידה כל תמונה מ-Drive (ממירה share link ל-download link)
- מעלה את התמונה ל-bucket `dish-images`
- מעדכנת את ה-`image_url` בטבלה לכתובת המקומית
- מחזירה סיכום: כמה תמונות יובאו, כמה נכשלו

### 2. כפתור "ייבא תמונות" באדמין
- כפתור חדש בטאב הייבוא או בראש עמוד האדמין
- בלחיצה: קורא ל-Edge Function
- מציג progress ותוצאה (הצלחות/כישלונות)

### 3. עדכון תצוגת התמונות
- לאחר הייבוא, התמונות כבר יהיו בכתובות מקומיות ולא צריך proxy
- `getProxiedImageUrl` ימשיך לעבוד כ-fallback לתמונות שעוד לא יובאו

---

## פרטים טכניים

### קבצים חדשים
- `supabase/functions/import-drive-images/index.ts` - Edge Function שמורידה תמונות מ-Drive ומעלה ל-storage

### קבצים שישתנו
- `src/components/admin/ExcelUploader.tsx` - הוספת כפתור "ייבא תמונות מ-Drive"
- `supabase/config.toml` - הוספת הגדרת הפונקציה החדשה

### לוגיקת ה-Edge Function
```text
1. שליפת כל המנות עם image_url שמכיל "drive.google.com"
2. לכל מנה:
   a. חילוץ file ID מה-URL
   b. הורדת התמונה דרך https://drive.google.com/uc?export=view&id=FILE_ID
   c. העלאה ל-storage bucket "dish-images" עם שם ייחודי
   d. עדכון image_url בטבלה לכתובת הציבורית של ה-bucket
3. החזרת סיכום: imported, failed, skipped
```

### טיפול במקרי קצה
- תמונות שכבר הועלו (URL לא מכיל drive.google.com) - דילוג
- תמונות שהן שם קובץ בלבד (למשל "KARELA -05366.JPG") - דילוג
- כישלון בהורדה - המשך לתמונה הבאה, דיווח בסיכום
