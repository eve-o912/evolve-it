import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Vote } from "lucide-react";
import { toast } from "sonner";
import { EventItems } from "@/components/admin/EventItems";
import { EventVoters } from "@/components/admin/EventVoters";
import { EventControl } from "@/components/admin/EventControl";
import { EventResults } from "@/components/admin/EventResults";
import type { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];

const EventManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) {
        toast.error("Failed to load event");
        console.error(error);
        navigate("/admin");
      } else {
        setEvent(data);
      }
      setIsLoading(false);
    };

    fetchEvent();

    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          setEvent(payload.new as Event);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading event...</div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{event.event_name}</h1>
                <p className="text-sm text-muted-foreground">{event.category}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="voters">Voters</TabsTrigger>
            <TabsTrigger value="control">Control</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-6">
            <EventItems eventId={event.id} />
          </TabsContent>

          <TabsContent value="voters" className="mt-6">
            <EventVoters eventId={event.id} />
          </TabsContent>

          <TabsContent value="control" className="mt-6">
            <EventControl event={event} />
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <EventResults eventId={event.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EventManagement;
