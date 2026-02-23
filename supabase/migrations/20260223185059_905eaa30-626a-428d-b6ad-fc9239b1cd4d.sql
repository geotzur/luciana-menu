
-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_he TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  description_he TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dishes table
CREATE TABLE public.dishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name_he TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  description_he TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_vegan BOOLEAN NOT NULL DEFAULT false,
  is_gluten_free BOOLEAN NOT NULL DEFAULT false,
  is_spicy BOOLEAN NOT NULL DEFAULT false,
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Categories: public read, admin write
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin can insert categories" ON public.categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update categories" ON public.categories FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete categories" ON public.categories FOR DELETE USING (public.is_admin());

-- Dishes: public read available dishes, admin full access
CREATE POLICY "Anyone can view available dishes" ON public.dishes FOR SELECT USING (true);
CREATE POLICY "Admin can insert dishes" ON public.dishes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update dishes" ON public.dishes FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete dishes" ON public.dishes FOR DELETE USING (public.is_admin());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dishes_updated_at BEFORE UPDATE ON public.dishes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for dish images (public for viewing)
INSERT INTO storage.buckets (id, name, public) VALUES ('dish-images', 'dish-images', true);

CREATE POLICY "Anyone can view dish images" ON storage.objects FOR SELECT USING (bucket_id = 'dish-images');
CREATE POLICY "Admin can upload dish images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dish-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admin can update dish images" ON storage.objects FOR UPDATE USING (bucket_id = 'dish-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete dish images" ON storage.objects FOR DELETE USING (bucket_id = 'dish-images' AND auth.uid() IS NOT NULL);
