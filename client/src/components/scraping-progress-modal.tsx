import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Building2,
  Home,
  Clock 
} from "lucide-react";
import { cn } from "@/lib/utils";

// TypeScript types matching the backend API response structure
interface PropertyScrapingStatus {
  propertyId: string;
  propertyName: string;
  profileType: string; // 'subject' | 'competitor'
  scrapingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'none';
  unitsFound: number;
  errorMessage?: string;
}

interface ScrapingStatusResponse {
  sessionId: string;
  overallStatus: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  properties: PropertyScrapingStatus[];
  totalProperties: number;
  completedProperties: number;
  failedProperties: number;
  processingProperties: number;
}

interface ScrapingProgressModalProps {
  isOpen: boolean;
  sessionId: string;
  onComplete: () => void;
  onClose: () => void;
}

export function ScrapingProgressModal({
  isOpen,
  sessionId,
  onComplete,
  onClose
}: ScrapingProgressModalProps) {
  const [hasCalledOnComplete, setHasCalledOnComplete] = useState(false);
  
  // Fetch scraping status from the API with polling
  const { data: statusData, error, isLoading } = useQuery<ScrapingStatusResponse>({
    queryKey: [`/api/analysis-sessions/${sessionId}/scraping-status`],
    enabled: isOpen && !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling if overall status is completed, failed, or partial
      if (data?.overallStatus === 'completed' || 
          data?.overallStatus === 'failed' || 
          data?.overallStatus === 'partial') {
        return false;
      }
      // Poll every 2 seconds while processing
      return 2000;
    }
  });

  // Call onComplete when all scraping is done
  useEffect(() => {
    if (statusData?.overallStatus === 'completed' && !hasCalledOnComplete) {
      setHasCalledOnComplete(true);
      // Small delay to allow user to see the completion status
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  }, [statusData?.overallStatus, hasCalledOnComplete, onComplete]);

  // Reset the hasCalledOnComplete flag when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasCalledOnComplete(false);
    }
  }, [isOpen]);

  // Calculate progress percentage
  const progressPercentage = statusData?.totalProperties 
    ? ((statusData.completedProperties + statusData.failedProperties) / statusData.totalProperties) * 100
    : 0;

  // Determine if the modal can be dismissed
  const canDismiss = statusData?.overallStatus === 'completed' || 
                    statusData?.overallStatus === 'failed' || 
                    statusData?.overallStatus === 'partial';

  // Get status icon for a property
  const getStatusIcon = (status: PropertyScrapingStatus['scrapingStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" data-testid="icon-pending" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" data-testid="icon-processing" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" data-testid="icon-completed" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" data-testid="icon-failed" />;
      default:
        return null;
    }
  };

  // Get status text for a property
  const getStatusText = (property: PropertyScrapingStatus) => {
    switch (property.scrapingStatus) {
      case 'pending':
        return 'Waiting to start...';
      case 'processing':
        return 'Scraping data...';
      case 'completed':
        return `Completed - found ${property.unitsFound} unit${property.unitsFound !== 1 ? 's' : ''}`;
      case 'failed':
        return property.errorMessage || 'Failed - error occurred';
      default:
        return 'Not started';
    }
  };

  // Get overall status message
  const getOverallStatusMessage = () => {
    if (!statusData) return 'Loading...';
    
    switch (statusData.overallStatus) {
      case 'pending':
        return 'Preparing to scrape properties...';
      case 'processing':
        return `Scraping ${statusData.processingProperties} propert${statusData.processingProperties !== 1 ? 'ies' : 'y'}...`;
      case 'completed':
        return '✅ All properties scraped successfully!';
      case 'partial':
        return `⚠️ Scraping completed with ${statusData.failedProperties} failure${statusData.failedProperties !== 1 ? 's' : ''}`;
      case 'failed':
        return '❌ Scraping failed for all properties';
      default:
        return 'Unknown status';
    }
  };

  // Get property type icon
  const getPropertyTypeIcon = (profileType: string) => {
    return profileType === 'subject' 
      ? <Home className="h-4 w-4 text-blue-600" data-testid="icon-subject" />
      : <Building2 className="h-4 w-4 text-purple-600" data-testid="icon-competitor" />;
  };

  // Get property type badge variant
  const getPropertyTypeBadgeVariant = (profileType: string): "default" | "secondary" => {
    return profileType === 'subject' ? "default" : "secondary";
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={canDismiss ? (open) => { if (!open) onClose(); } : undefined}
    >
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onInteractOutside={canDismiss ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={canDismiss ? undefined : (e) => e.preventDefault()}
        data-testid="scraping-progress-modal"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Property Data Scraping Progress
          </DialogTitle>
          <DialogDescription>
            {getOverallStatusMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Overall Progress */}
          {statusData && (
            <div className="space-y-2" data-testid="overall-progress">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {statusData.completedProperties + statusData.failedProperties} of {statusData.totalProperties} properties complete
                </span>
                <span className="font-medium">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2"
                data-testid="progress-bar"
              />
              {statusData.processingProperties > 0 && (
                <p className="text-xs text-muted-foreground">
                  {statusData.processingProperties} propert{statusData.processingProperties !== 1 ? 'ies' : 'y'} currently being scraped
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Properties List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Properties</h4>
            
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading status...</span>
              </div>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Failed to load scraping status. Please try again.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {statusData?.properties && statusData.properties.length > 0 ? (
              <div className="space-y-2">
                {statusData.properties.map((property) => (
                  <Card 
                    key={property.propertyId} 
                    className={cn(
                      "transition-all",
                      property.scrapingStatus === 'processing' && "border-blue-200 bg-blue-50/50 dark:bg-blue-950/50",
                      property.scrapingStatus === 'completed' && "border-green-200 bg-green-50/50 dark:bg-green-950/50",
                      property.scrapingStatus === 'failed' && "border-red-200 bg-red-50/50 dark:bg-red-950/50"
                    )}
                    data-testid={`property-card-${property.propertyId}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div className="mt-1">
                          {getStatusIcon(property.scrapingStatus)}
                        </div>
                        
                        {/* Property Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getPropertyTypeIcon(property.profileType)}
                            <h5 className="font-medium text-sm truncate" data-testid={`property-name-${property.propertyId}`}>
                              {property.propertyName}
                            </h5>
                            <Badge 
                              variant={getPropertyTypeBadgeVariant(property.profileType)}
                              className="text-xs px-2 py-0"
                              data-testid={`property-type-${property.propertyId}`}
                            >
                              {property.profileType}
                            </Badge>
                          </div>
                          <p 
                            className={cn(
                              "text-sm",
                              property.scrapingStatus === 'failed' ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                            )}
                            data-testid={`property-status-text-${property.propertyId}`}
                          >
                            {getStatusText(property)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : statusData && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No properties found in this session
              </p>
            )}
          </div>
        </div>

        {/* Close button hint when complete */}
        {canDismiss && (
          <div className="flex-shrink-0 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Press ESC or click outside to close this dialog
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}