import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExcelExportButtonProps {
  propertyProfileId: string;
  propertyName?: string;
}

export default function ExcelExportButton({ propertyProfileId, propertyName }: ExcelExportButtonProps) {
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/export-excel/${propertyProfileId}`);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `units_${propertyName?.replace(/\s+/g, "_") || "export"}_${timestamp}.xlsx`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return filename;
    },
    onSuccess: (filename) => {
      toast({ 
        title: "Export successful",
        description: `Downloaded: ${filename}`
      });
    },
    onError: () => {
      toast({ 
        title: "Export failed", 
        variant: "destructive" 
      });
    }
  });

  return (
    <Button
      variant="outline"
      onClick={() => exportMutation.mutate()}
      disabled={exportMutation.isPending}
      data-testid="button-export"
    >
      <Download className="mr-2 h-4 w-4" />
      {exportMutation.isPending ? "Exporting..." : "Export Excel"}
    </Button>
  );
}