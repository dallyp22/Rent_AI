import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUp, Upload, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface ImportSummary {
  propertiesProcessed: number;
  propertiesCreated: number;
  propertiesUpdated: number;
  unitsImported: number;
  tagsCreated: number;
  errors: string[];
}

export default function ImportData() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress updates
      setUploadProgress(20);
      
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      setUploadProgress(60);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import Excel file');
      }

      setUploadProgress(80);
      const data = await response.json();
      setUploadProgress(100);
      
      return data;
    },
    onSuccess: (data) => {
      setImportSummary(data.summary);
      toast({
        title: "Import Successful",
        description: `Imported ${data.summary.unitsImported} units across ${data.summary.propertiesProcessed} properties`,
      });
      
      // Invalidate property profiles query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/property-profiles'] });
      
      // Reset after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        setImportSummary(null);
      }
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportSummary(null);
    setUploadProgress(0);
  };

  const downloadTemplate = () => {
    // Create sample Excel template data
    const templateData = `Unit,Tags,Beds,Baths,Sqft,Property,Address,Unit Type
101,Moscow,2,2,1200,The Atlas Apartments,123 Main St,2BR/2BA
102,Portland.1,1,1,800,The Atlas Apartments,123 Main St,1BR/1BA
201,Moscow,2,2,1200,The Atlas Apartments,123 Main St,2BR/2BA
301,Portland.3,3,2,1500,The Atlas Apartments,123 Main St,3BR/2BA
A1,Studio.1,0,1,500,The Duo,456 Oak Ave,Studio
A2,1/1 FRANC,1,1,750,The Duo,456 Oak Ave,1BR/1BA
B1,Studio.2,0,1,550,The Duo,456 Oak Ave,Studio
B2,2/2 DELUXE,2,2,1100,The Duo,456 Oak Ave,2BR/2BA`;

    const blob = new Blob([templateData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Use this template to format your Excel data for import",
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8" data-testid="import-data-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Import Property Data</h1>
        <p className="text-muted-foreground mt-2" data-testid="text-page-description">
          Upload an Excel file to import property and unit data into your portfolio
        </p>
      </div>

      {/* Download Template */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Template
          </CardTitle>
          <CardDescription>
            Download our template to see the required format for your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={downloadTemplate} 
            variant="outline"
            data-testid="button-download-template"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className={`${isDragActive || dropzoneActive ? 'border-primary' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Drag and drop your Excel file here, or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors hover:bg-muted/50
              ${(isDragActive || dropzoneActive) ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            `}
            data-testid="dropzone-area"
          >
            <input {...getInputProps()} data-testid="input-file" />
            <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {selectedFile ? (
              <div data-testid="text-selected-file">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Drop your Excel file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports .xlsx and .xls files up to 10MB
                </p>
              </div>
            )}
          </div>

          {selectedFile && !uploadMutation.isPending && !importSummary && (
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleUpload}
                data-testid="button-upload"
              >
                <Upload className="mr-2 h-4 w-4" />
                Start Import
              </Button>
              <Button 
                onClick={handleReset} 
                variant="outline"
                data-testid="button-reset"
              >
                Clear
              </Button>
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="mt-4" data-testid="progress-upload">
              <Progress value={uploadProgress} className="mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Importing data... {uploadProgress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Results */}
      {importSummary && (
        <Card className="mt-6" data-testid="import-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow data-testid="row-properties-processed">
                  <TableCell>Properties Processed</TableCell>
                  <TableCell className="text-right font-medium">
                    {importSummary.propertiesProcessed}
                  </TableCell>
                </TableRow>
                <TableRow data-testid="row-properties-created">
                  <TableCell>Properties Created</TableCell>
                  <TableCell className="text-right font-medium">
                    {importSummary.propertiesCreated}
                  </TableCell>
                </TableRow>
                <TableRow data-testid="row-properties-updated">
                  <TableCell>Properties Updated</TableCell>
                  <TableCell className="text-right font-medium">
                    {importSummary.propertiesUpdated}
                  </TableCell>
                </TableRow>
                <TableRow data-testid="row-units-imported">
                  <TableCell>Units Imported</TableCell>
                  <TableCell className="text-right font-medium">
                    {importSummary.unitsImported}
                  </TableCell>
                </TableRow>
                <TableRow data-testid="row-tags-created">
                  <TableCell>Tags Created</TableCell>
                  <TableCell className="text-right font-medium">
                    {importSummary.tagsCreated}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {importSummary.errors.length > 0 && (
              <Alert className="mt-4" variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Some items had errors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {importSummary.errors.map((error, index) => (
                      <li key={index} data-testid={`text-error-${index}`}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleReset}
                variant="outline"
                data-testid="button-import-another"
              >
                Import Another File
              </Button>
              <Button 
                onClick={() => window.location.href = '/property-profiles'}
                data-testid="button-view-properties"
              >
                View Properties
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Required Excel Format:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Your Excel file should have these columns in order:
            </p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>Unit</strong> - Unit number or identifier</li>
              <li><strong>Tags</strong> - Unit configuration tag (e.g., Moscow, Portland.1)</li>
              <li><strong>Beds</strong> - Number of bedrooms</li>
              <li><strong>Baths</strong> - Number of bathrooms</li>
              <li><strong>Sqft</strong> - Square footage</li>
              <li><strong>Property</strong> - Property name</li>
              <li><strong>Address</strong> - Property address</li>
              <li><strong>Unit Type</strong> - Unit type description (e.g., 2BR/2BA, Studio)</li>
            </ol>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> The import will create new properties if they don't exist, 
              or update existing ones. Existing units for a property will be replaced with the imported data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}