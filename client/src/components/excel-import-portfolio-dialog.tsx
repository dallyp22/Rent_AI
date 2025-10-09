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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Building2,
  Package,
  AlertTriangle 
} from "lucide-react";

interface ExcelImportPortfolioDialogProps {
  onImportComplete: () => void;
  onClose: () => void;
}

interface ImportResult {
  success: boolean;
  totalPropertiesProcessed: number;
  propertyResults: Array<{
    propertyProfileId: string;
    propertyName: string;
    unitsImported: number;
    errors: string[];
  }>;
  unmatchedProperties?: string[];
  totalUnitsImported: number;
}

export default function ExcelImportPortfolioDialog({
  onImportComplete,
  onClose
}: ExcelImportPortfolioDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import-excel-portfolio", {
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
      const successCount = data.propertyResults.filter((r: any) => r.unitsImported > 0).length;
      const failedCount = data.propertyResults.filter((r: any) => r.errors.length > 0).length;
      
      if (data.success) {
        toast({ 
          title: "Portfolio import complete",
          description: `Processed ${data.totalPropertiesProcessed} properties. ${successCount} successful, ${failedCount} with errors.`
        });
        
        // Auto-close after showing results for a few seconds
        if (failedCount === 0 && (!data.unmatchedProperties || data.unmatchedProperties.length === 0)) {
          setTimeout(() => {
            onImportComplete();
          }, 5000);
        }
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

  const getSuccessRate = () => {
    if (!importResult) return 0;
    const successCount = importResult.propertyResults.filter(r => r.unitsImported > 0 && r.errors.length === 0).length;
    return Math.round((successCount / importResult.totalPropertiesProcessed) * 100);
  };

  const hasErrors = importResult?.propertyResults.some(r => r.errors.length > 0);
  const hasUnmatched = importResult?.unmatchedProperties && importResult.unmatchedProperties.length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Import Portfolio from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to import units for your entire portfolio at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Excel File Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Include a <strong>"Property"</strong> column to identify which property each unit belongs to</li>
                  <li>Property names must match exactly with your existing properties (case-insensitive)</li>
                  <li>All matching properties will be updated automatically</li>
                  <li>Units for each property will replace existing units</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          {!importResult && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Drop your Excel file here, or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx and .xls files</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="portfolio-file-upload"
                data-testid="input-file-portfolio"
              />
              <label htmlFor="portfolio-file-upload">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Select File
                  </span>
                </Button>
              </label>
            </div>
          )}

          {/* Selected File */}
          {file && !importResult && (
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Selected: {file.name}</span>
                <Badge variant="secondary">{(file.size / 1024).toFixed(2)} KB</Badge>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {importMutation.isPending && (
            <div className="space-y-3">
              <Progress value={33} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Processing portfolio import...
              </p>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Properties</p>
                        <p className="text-2xl font-bold">{importResult.totalPropertiesProcessed}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Units Imported</p>
                        <p className="text-2xl font-bold">{importResult.totalUnitsImported}</p>
                      </div>
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">{getSuccessRate()}%</p>
                      </div>
                      {getSuccessRate() === 100 ? (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Per-Property Breakdown */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  Property Import Details
                  {importResult.success && !hasErrors && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      All Successful
                    </Badge>
                  )}
                </h3>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    {importResult.propertyResults.map((result, index) => (
                      <div key={index} className="flex items-start justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {result.errors.length === 0 ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className="font-medium">{result.propertyName}</span>
                          </div>
                          {result.errors.length > 0 && (
                            <div className="ml-6 mt-1">
                              {result.errors.map((error, idx) => (
                                <p key={idx} className="text-sm text-red-600">{error}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant={result.unitsImported > 0 ? "default" : "secondary"}>
                          {result.unitsImported} units
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Unmatched Properties */}
              {hasUnmatched && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Unmatched Properties from Excel:</p>
                    <div className="space-y-1">
                      {importResult.unmatchedProperties?.map((prop, index) => (
                        <Badge key={index} variant="outline" className="mr-2">
                          {prop}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm mt-2">
                      These properties from your Excel file could not be matched with your existing properties. 
                      Please check the property names for typos or create these properties first.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {importResult.success && !hasErrors && !hasUnmatched && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Portfolio import completed successfully! All units have been imported.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-portfolio">
            {importResult ? "Close" : "Cancel"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              data-testid="button-import-portfolio"
            >
              {importMutation.isPending ? "Processing..." : "Import Portfolio"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}