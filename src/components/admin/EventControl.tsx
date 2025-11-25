import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Calendar, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import type { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];

interface EventControlProps {
  event: Event;
}

export const EventControl = ({ event }: EventControlProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const voteUrl = `${window.location.origin}/vote/${event.id}`;

  useEffect(() => {
    QRCode.toDataURL(voteUrl, { width: 300 }).then(setQrCodeUrl);
  }, [voteUrl]);

  useEffect(() => {
    const checkEventTime = () => {
      const now = new Date();
      const endTime = new Date(event.end_time);
      
      if (now >= endTime && event.status === "active") {
        updateStatus("ended");
      }
    };

    const interval = setInterval(checkEventTime, 10000);
    checkEventTime();

    return () => clearInterval(interval);
  }, [event]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(voteUrl);
    toast.success("Vote URL copied to clipboard!");
  };

  const updateStatus = async (newStatus: "active" | "paused" | "ended") => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("events")
      .update({ status: newStatus })
      .eq("id", event.id);

    if (error) {
      toast.error("Failed to update event status");
    } else {
      toast.success(`Event ${newStatus}`);
    }
    setIsUpdating(false);
  };

  const resetVoting = async () => {
    if (!confirm("Are you sure? This will delete all votes and reset voter codes.")) {
      return;
    }

    setIsUpdating(true);
    
    // Delete all votes
    await supabase.from("votes").delete().eq("event_id", event.id);
    
    // Reset all voters
    await supabase
      .from("voters")
      .update({ used: false, voted_at: null })
      .eq("event_id", event.id);
    
    // Reset vote counts on items
    await supabase
      .from("items")
      .update({ votes: 0 })
      .eq("event_id", event.id);

    toast.success("Voting reset successfully");
    setIsUpdating(false);
  };

  const getStatusColor = () => {
    switch (event.status) {
      case "active":
        return "bg-success";
      case "paused":
        return "bg-accent";
      case "ended":
        return "bg-destructive";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="space-y-6">
      {qrCodeUrl && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Voting QR Code
            </CardTitle>
            <CardDescription>Share this QR code with voters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCodeUrl} alt="Voting QR Code" className="rounded-lg border" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={voteUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
              />
              <Button size="icon" variant="outline" onClick={copyToClipboard}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Event Status</CardTitle>
          <CardDescription>Current voting status and controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Current Status</p>
              <Badge className={getStatusColor()}>
                {event.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {event.status !== "active" && (
              <Button
                onClick={() => updateStatus("active")}
                disabled={isUpdating}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Voting
              </Button>
            )}
            
            {event.status === "active" && (
              <Button
                variant="outline"
                onClick={() => updateStatus("paused")}
                disabled={isUpdating}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Voting
              </Button>
            )}
            
            {event.status !== "ended" && (
              <Button
                variant="destructive"
                onClick={() => updateStatus("ended")}
                disabled={isUpdating}
              >
                End Voting
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Schedule</CardTitle>
          <CardDescription>Configured voting period</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Start:</span>
            <span>{new Date(event.start_time).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">End:</span>
            <span>{new Date(event.end_time).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={resetVoting}
            disabled={isUpdating}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All Votes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
