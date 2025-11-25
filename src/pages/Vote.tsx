import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [voterCode, setVoterCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [voterCodeInput, setVoterCodeInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

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

  const handleVerifyCode = async () => {
    if (!voterCodeInput.trim() || !eventId) return;

    setIsVerifying(true);

    try {
      const { data: voter, error } = await supabase
        .from("voters")
        .select("*")
        .eq("event_id", eventId)
        .eq("voter_code", voterCodeInput.trim().toUpperCase())
        .single();

      if (error || !voter) {
        toast.error("Invalid voter code");
        return;
      }

      if (voter.used) {
        toast.error("This voter code has already been used");
        return;
      }

      setVoterCode(voter.voter_code);
      setIsAuthenticated(true);
      toast.success("Voter code verified!");
    } catch (error: any) {
      toast.error("Failed to verify voter code");
    } finally {
      setIsVerifying(false);
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
          voter_code: voterCode,
        });

      if (voteError) throw voteError;

      // Mark voter as used
      await supabase
        .from("voters")
        .update({ used: true, voted_at: new Date().toISOString() })
        .eq("voter_code", voterCode)
        .eq("event_id", event.id);

      // Update vote counts
      for (const itemId of selectedItems) {
        const { data: item } = await supabase
          .from("items")
          .select("votes")
          .eq("id", itemId)
          .single();
        
        await supabase
          .from("items")
          .update({ votes: (item?.votes || 0) + 1 })
          .eq("id", itemId);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <VoteIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">{event.event_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{event.category}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Enter Your Voter ID</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please enter the voter ID provided to you by the event administrator.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voterCodeInput}
                  onChange={(e) => setVoterCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter voter code"
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVerifyCode();
                    }
                  }}
                />
                <Button
                  onClick={handleVerifyCode}
                  disabled={isVerifying || !voterCodeInput.trim()}
                >
                  {isVerifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
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
