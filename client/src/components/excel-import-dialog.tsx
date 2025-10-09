import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ExcelImportDialogProps {
  propertyProfileId: string;
  onImportComplete: () => void;
  onClose: () => void;
}

export default function ExcelImportDialog({
  propertyProfileId,
  onImportComplete,
  onClose
}: ExcelImportDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyProfileId", propertyProfileId);

      const response = await fetch("/api/import-excel", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Import failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      if (data.success) {
        toast({ 
          title: "Import successful",
          description: `Imported ${data.imported} units, updated ${data.updated} units.`
        });
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Import failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive"
        });
      }
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Units from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file with unit data. The file should have columns for:
            Unit, Tags, Beds, Baths, Sqft, Property, Address, Unit Type, Current Rent, Status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600" />
                <div className="font-medium">{file.name}</div>
                <Badge variant="secondary">{(file.size / 1024).toFixed(2)} KB</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setImportResult(null);
                  }}
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="text-muted-foreground">
                  Click to upload or drag and drop
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  data-testid="input-file-upload"
                />
              </div>
            )}
          </div>

          {/* Import Progress */}
          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Importing...</div>
              <Progress className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"}>
              {importResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    {importResult.success ? "Import Complete" : "Import Failed"}
                  </div>
                  {importResult.imported > 0 && (
                    <div>✓ Imported {importResult.imported} new units</div>
                  )}
                  {importResult.updated > 0 && (
                    <div>✓ Updated {importResult.updated} existing units</div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium text-destructive">Errors:</div>
                      <ul className="list-disc list-inside text-sm">
                        {importResult.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Column Mapping Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Expected Excel Columns:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>• Unit → Unit Number</div>
                <div>• Tags → TAG Identifier</div>
                <div>• Beds → Number of Bedrooms</div>
                <div>• Baths → Number of Bathrooms</div>
                <div>• Sqft → Square Footage</div>
                <div>• Property → Property Name</div>
                <div>• Address → Property Address</div>
                <div>• Unit Type → Unit Type</div>
                <div>• Current Rent → Monthly Rent</div>
                <div>• Status → Unit Status</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending || importResult?.success}
              data-testid="button-import"
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}