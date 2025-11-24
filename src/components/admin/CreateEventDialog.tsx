import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateEventDialog = ({ open, onOpenChange }: CreateEventDialogProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    eventName: "",
    category: "",
    numberOfItems: "5",
    voteMode: "single" as "single" | "multiple",
    numberOfChoices: "1",
    numberOfWinners: "1",
    startTime: "",
    endTime: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("events")
        .insert({
          event_name: formData.eventName,
          category: formData.category,
          number_of_items: parseInt(formData.numberOfItems),
          vote_mode: formData.voteMode,
          number_of_choices: parseInt(formData.numberOfChoices),
          number_of_winners: parseInt(formData.numberOfWinners),
          start_time: new Date(formData.startTime).toISOString(),
          end_time: new Date(formData.endTime).toISOString(),
          admin_id: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Event created successfully!");
      onOpenChange(false);
      navigate(`/admin/event/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Set up a new voting event with custom parameters
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                required
                value={formData.eventName}
                onChange={(e) =>
                  setFormData({ ...formData, eventName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfItems">Number of Items</Label>
              <Input
                id="numberOfItems"
                type="number"
                min="1"
                required
                value={formData.numberOfItems}
                onChange={(e) =>
                  setFormData({ ...formData, numberOfItems: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voteMode">Vote Mode</Label>
              <Select
                value={formData.voteMode}
                onValueChange={(value: "single" | "multiple") =>
                  setFormData({ ...formData, voteMode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Choice</SelectItem>
                  <SelectItem value="multiple">Multiple Choice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfChoices">Number of Choices</Label>
              <Input
                id="numberOfChoices"
                type="number"
                min="1"
                required
                value={formData.numberOfChoices}
                onChange={(e) =>
                  setFormData({ ...formData, numberOfChoices: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfWinners">Number of Winners</Label>
              <Input
                id="numberOfWinners"
                type="number"
                min="1"
                required
                value={formData.numberOfWinners}
                onChange={(e) =>
                  setFormData({ ...formData, numberOfWinners: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                required
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
