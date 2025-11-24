import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddItemDialog } from "./AddItemDialog";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["items"]["Row"];

interface EventItemsProps {
  eventId: string;
}

export const EventItems = ({ eventId }: EventItemsProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Failed to load items");
        console.error(error);
      } else {
        setItems(data || []);
      }
      setIsLoading(false);
    };

    fetchItems();

    const channel = supabase
      .channel(`items-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
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

  const handleDelete = async (itemId: string) => {
    const { error } = await supabase.from("items").delete().eq("id", itemId);

    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted");
    }
  };

  if (isLoading) {
    return <div>Loading items...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voting Items</h2>
          <p className="text-muted-foreground">Add and manage items for voting</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No items yet</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="group">
              <CardHeader>
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                )}
                {item.creator && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Creator:</span> {item.creator}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-2xl font-bold text-primary">{item.votes} votes</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        eventId={eventId}
      />
    </div>
  );
};
