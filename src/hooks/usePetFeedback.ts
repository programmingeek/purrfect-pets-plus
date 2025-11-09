import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type FeedbackWithProfile = {
  id: string;
  pet_id: string;
  user_id: string;
  rating: number;
  comment: string;
  adoption_application_id: string;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
};

export const usePetFeedback = (petId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: feedback, isLoading } = useQuery<FeedbackWithProfile[]>({
    queryKey: ['pet-feedback', petId],
    queryFn: async () => {
      const { data: feedbackData, error } = await supabase
        .from('pet_feedback')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (feedbackData && feedbackData.length > 0) {
        const userIds = [...new Set(feedbackData.map(f => f.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        // Combine feedback with profile data
        return feedbackData.map(fb => ({
          ...fb,
          profile: profiles?.find(p => p.id === fb.user_id),
        }));
      }

      return feedbackData || [];
    },
  });

  const { data: canLeaveFeedback } = useQuery({
    queryKey: ['can-leave-feedback', petId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('adoption_applications')
        .select('id, status')
        .eq('pet_id', petId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async ({ rating, comment, applicationId }: { rating: number; comment: string; applicationId: string }) => {
      if (!user) throw new Error("You must be logged in to submit feedback");

      const { error } = await supabase
        .from('pet_feedback')
        .insert({
          pet_id: petId,
          user_id: user.id,
          rating,
          comment,
          adoption_application_id: applicationId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-feedback', petId] });
      toast({
        title: "Success",
        description: "Your feedback has been submitted!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  return {
    feedback,
    isLoading,
    canLeaveFeedback,
    submitFeedback,
  };
};
