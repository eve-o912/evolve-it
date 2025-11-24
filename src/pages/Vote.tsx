import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Vote as VoteIcon } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];

const Vote = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!eventData) {
        toast.error("Event not found");
        navigate("/");
        return;
      }

      const { data: itemsData } = await supabase
        .from("items")
        .select("*")
        .eq("event_id", eventId)
        .order("title");

      setEvent(eventData);
      setItems(itemsData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [eventId, navigate]);

  const handleItemToggle = (itemId: string) => {
    if (event?.vote_mode === "single") {
      setSelectedItems([itemId]);
    } else {
      setSelectedItems((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : prev.length < (event?.number_of_choices || 1)
          ? [...prev, itemId]
          : prev
      );
    }
  };

  const handleSubmit = async () => {
    if (!event || selectedItems.length === 0) return;

    if (event.vote_mode === "multiple" && selectedItems.length !== event.number_of_choices) {
      toast.error(`Please select exactly ${event.number_of_choices} items`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert vote
      const { error: voteError } = await supabase
        .from("votes")
        .insert({
          event_id: event.id,
          item_ids: selectedItems,
          voter_code: "public",
        });

      if (voteError) throw voteError;

      // Update vote counts
      for (const itemId of selectedItems) {
        const { error: updateError } = await supabase.rpc("increment_votes", {
          item_id: itemId,
        });
        if (updateError) console.error(updateError);
      }

      toast.success("Vote submitted successfully!");
      navigate(`/results/${event.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!event) return null;

  if (event.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <VoteIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Voting Not Active</h2>
            <p className="text-muted-foreground">
              This voting event is currently {event.status}. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <VoteIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{event.event_name}</h1>
              <p className="text-sm text-muted-foreground">{event.category}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Cast Your Vote</h2>
          <p className="text-muted-foreground">
            {event.vote_mode === "single"
              ? "Select one item"
              : `Select ${event.number_of_choices} items`}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedItems.includes(item.id)
                  ? "border-primary ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => handleItemToggle(item.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  {selectedItems.includes(item.id) && (
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  )}
                </div>
              </CardHeader>
              {item.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              selectedItems.length === 0 ||
              (event.vote_mode === "multiple" &&
                selectedItems.length !== event.number_of_choices)
            }
          >
            Submit Vote
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Vote;
