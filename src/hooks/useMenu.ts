import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Category = Tables<"categories">;
export type Dish = Tables<"dishes">;

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — categories rarely change
  });
}

export function useDishes(categoryId?: string) {
  return useQuery({
    queryKey: ["dishes", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("dishes")
        .select("*")
        .eq("is_available", true)
        .order("display_order", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Dish[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes — avoid refetch on every tab focus
  });
}

export function useAllDishes() {
  return useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dishes")
        .select("*, categories(name_he, name_en)")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes — avoid refetch on every tab focus
  });
}
