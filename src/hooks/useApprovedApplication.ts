import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useApprovedApplication = (petId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['approved-application', petId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('adoption_applications')
        .select('id, status')
        .eq('pet_id', petId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};
