import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Download, Trash2, QrCode } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import type { Database } from "@/integrations/supabase/types";

type Voter = Database["public"]["Tables"]["voters"]["Row"];

interface EventVotersProps {
  eventId: string;
}

export const EventVoters = ({ eventId }: EventVotersProps) => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [numberOfCodes, setNumberOfCodes] = useState("10");

  useEffect(() => {
    const fetchVoters = async () => {
      const { data, error } = await supabase
        .from("voters")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load voters");
        console.error(error);
      } else {
        setVoters(data || []);
      }
      setIsLoading(false);
    };

    fetchVoters();

    const channel = supabase
      .channel(`voters-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voters",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchVoters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleGenerateCodes = async () => {
    const count = parseInt(numberOfCodes);
    if (count < 1 || count > 1000) {
      toast.error("Please enter a number between 1 and 1000");
      return;
    }

    const newVoters = Array.from({ length: count }, () => ({
      event_id: eventId,
      voter_code: generateCode(),
    }));

    const { error } = await supabase.from("voters").insert(newVoters);

    if (error) {
      toast.error("Failed to generate codes");
    } else {
      toast.success(`Generated ${count} voter codes`);
    }
  };

  const handleDelete = async (voterId: string) => {
    const { error } = await supabase.from("voters").delete().eq("id", voterId);

    if (error) {
      toast.error("Failed to delete voter");
    } else {
      toast.success("Voter deleted");
    }
  };

  const handleExport = () => {
    const csv = voters.map((v) => `${v.voter_code},${v.used}`).join("\n");
    const blob = new Blob([`Code,Used\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voter-codes.csv";
    a.click();
  };

  const handleDownloadQR = async (code: string) => {
    try {
      const url = `${window.location.origin}/vote/${code}`;
      const qrDataUrl = await QRCode.toDataURL(url);
      const a = document.createElement("a");
      a.href = qrDataUrl;
      a.download = `voter-${code}.png`;
      a.click();
    } catch (error) {
      toast.error("Failed to generate QR code");
    }
  };

  if (isLoading) {
    return <div>Loading voters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Voter Codes</h2>
          <p className="text-muted-foreground">Generate and manage voter access codes</p>
        </div>
        <div className="flex gap-2">
          {voters.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              max="1000"
              value={numberOfCodes}
              onChange={(e) => setNumberOfCodes(e.target.value)}
              placeholder="Number of codes"
              className="max-w-[200px]"
            />
            <Button onClick={handleGenerateCodes}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Codes
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {voters.map((voter) => (
          <Card
            key={voter.id}
            className={voter.used ? "opacity-50" : ""}
          >
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <code className="text-lg font-mono font-bold bg-muted px-4 py-2 rounded">
                  {voter.voter_code}
                </code>
                {voter.used && (
                  <span className="text-sm text-destructive">
                    Used on {new Date(voter.voted_at!).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDownloadQR(voter.voter_code)}
                >
                  <QrCode className="w-4 h-4" />
                </Button>
                {!voter.used && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(voter.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {voters.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No voter codes generated yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
