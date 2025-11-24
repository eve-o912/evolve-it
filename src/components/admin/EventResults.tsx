import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["items"]["Row"];

interface EventResultsProps {
  eventId: string;
}

export const EventResults = ({ eventId }: EventResultsProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("event_id", eventId)
        .order("votes", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setItems(data || []);
      }
      setIsLoading(false);
    };

    fetchItems();

    const channel = supabase
      .channel(`results-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "items",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (isLoading) {
    return <div>Loading results...</div>;
  }

  const maxVotes = Math.max(...items.map((i) => i.votes), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Live Results</h2>
        <p className="text-muted-foreground">Real-time voting results</p>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <Card key={item.id} className={index < 3 ? "border-primary/50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {index < 3 && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? "bg-yellow-500" :
                      index === 1 ? "bg-gray-400" :
                      "bg-amber-700"
                    }`}>
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
                  <p className="text-3xl font-bold text-primary">{item.votes}</p>
                  <p className="text-sm text-muted-foreground">votes</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(item.votes / maxVotes) * 100}%` }}
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
    </div>
  );
};
