import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Vote } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];

const Results = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      const { data: itemsData } = await supabase
        .from("items")
        .select("*")
        .eq("event_id", eventId)
        .order("votes", { ascending: false });

      setEvent(eventData);
      setItems(itemsData || []);
      setIsLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel(`public-results-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "items",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading results...</div>
      </div>
    );
  }

  if (!event) return null;

  const maxVotes = Math.max(...items.map((i) => i.votes || 0), 1);
  const isFinal = event.status === "ended";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Vote className="w-6 h-6 text-primary-foreground" />
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
          <h2 className="text-2xl font-bold mb-2">
            {isFinal ? "Final Results" : "Live Results"}
          </h2>
          <p className="text-muted-foreground">
            {isFinal
              ? "Voting has ended. Here are the final results."
              : "Real-time voting results. Results update automatically."}
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={item.id} className={index < 3 ? "border-primary/50" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {index < 3 && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : "bg-amber-700"
                        }`}
                      >
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      {index < 3 && (
                        <Badge variant="outline" className="mt-1">
                          Rank #{index + 1}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{item.votes || 0}</p>
                    <p className="text-sm text-muted-foreground">votes</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 rounded-full"
                    style={{ width: `${((item.votes || 0) / maxVotes) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground">No items to display yet</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Results;
