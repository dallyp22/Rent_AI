import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Loader2,
  Database,
  TrendingUp,
  Brain,
  Calculator,
  FileCheck,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizationProgressModalProps {
  isOpen: boolean;
  currentStage: number; // 1-5
  onComplete: () => void;
  onClose: () => void;
}

interface StageInfo {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const OPTIMIZATION_STAGES: StageInfo[] = [
  {
    id: 1,
    title: "Preparing data...",
    description: "Collecting property and unit information",
    icon: Database
  },
  {
    id: 2,
    title: "Analyzing market conditions...",
    description: "Processing market data",
    icon: TrendingUp
  },
  {
    id: 3,
    title: "Generating AI recommendations...",
    description: "AI model processing",
    icon: Brain
  },
  {
    id: 4,
    title: "Calculating pricing impacts...",
    description: "Computing financial impacts",
    icon: Calculator
  },
  {
    id: 5,
    title: "Finalizing recommendations...",
    description: "Preparing final output",
    icon: FileCheck
  }
];

export function OptimizationProgressModal({
  isOpen,
  currentStage,
  onComplete,
  onClose
}: OptimizationProgressModalProps) {
  const [hasCalledOnComplete, setHasCalledOnComplete] = useState(false);
  const [animatingStage, setAnimatingStage] = useState(currentStage);
  
  // Update animating stage with a slight delay for smooth transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatingStage(currentStage);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStage]);
  
  // Call onComplete when optimization completes (stage 5)
  useEffect(() => {
    if (currentStage >= 5 && !hasCalledOnComplete) {
      setHasCalledOnComplete(true);
      // Small delay to allow user to see the completion status
      const timer = setTimeout(() => {
        onComplete();
        // Auto-close after a brief moment
        setTimeout(() => {
          onClose();
        }, 500);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [currentStage, hasCalledOnComplete, onComplete, onClose]);
  
  // Reset the hasCalledOnComplete flag when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasCalledOnComplete(false);
      setAnimatingStage(currentStage);
    }
  }, [isOpen, currentStage]);
  
  // Calculate progress percentage
  const progressPercentage = (currentStage / OPTIMIZATION_STAGES.length) * 100;
  
  // Determine if the modal can be dismissed (only when complete)
  const canDismiss = currentStage >= 5;
  
  // Get stage status
  const getStageStatus = (stageId: number): 'completed' | 'current' | 'upcoming' => {
    if (stageId < animatingStage) return 'completed';
    if (stageId === animatingStage) return 'current';
    return 'upcoming';
  };
  
  // Get stage icon
  const getStageIcon = (stage: StageInfo, status: 'completed' | 'current' | 'upcoming') => {
    const IconComponent = stage.icon;
    
    if (status === 'completed') {
      return (
        <div className="relative" data-testid={`stage-${stage.id}-completed`}>
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      );
    }
    
    if (status === 'current') {
      return (
        <div className="relative" data-testid={`stage-${stage.id}-current`}>
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
            <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        </div>
      );
    }
    
    // Upcoming
    return (
      <div className="relative" data-testid={`stage-${stage.id}-upcoming`}>
        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Circle className="h-6 w-6 text-gray-400 dark:text-gray-600" />
        </div>
      </div>
    );
  };
  
  // Get overall status message
  const getOverallStatusMessage = () => {
    if (currentStage >= 5) {
      return "✅ Optimization complete!";
    }
    const currentStageInfo = OPTIMIZATION_STAGES.find(s => s.id === currentStage);
    return currentStageInfo ? currentStageInfo.title : "Processing...";
  };
  
  return (
    <Dialog
      open={isOpen}
      onOpenChange={canDismiss ? (open) => { if (!open) onClose(); } : undefined}
    >
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={canDismiss ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={canDismiss ? undefined : (e) => e.preventDefault()}
        data-testid="optimization-progress-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            AI Optimization in Progress
          </DialogTitle>
          <DialogDescription className="text-base">
            {getOverallStatusMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Overall Progress Bar */}
          <div className="space-y-2" data-testid="overall-progress">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Stage {Math.min(currentStage, 5)} of {OPTIMIZATION_STAGES.length}
              </span>
              <span className="font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2 transition-all duration-500 ease-out"
              data-testid="progress-bar"
            />
          </div>
          
          <Separator />
          
          {/* Stages List */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Processing Stages</h4>
            
            <div className="space-y-3">
              {OPTIMIZATION_STAGES.map((stage, index) => {
                const status = getStageStatus(stage.id);
                const isLast = index === OPTIMIZATION_STAGES.length - 1;
                
                return (
                  <div key={stage.id} className="relative">
                    {/* Connector Line */}
                    {!isLast && (
                      <div
                        className={cn(
                          "absolute left-5 top-10 w-0.5 h-12",
                          status === 'completed' ? "bg-green-300 dark:bg-green-700" : "bg-gray-200 dark:bg-gray-700"
                        )}
                      />
                    )}
                    
                    <Card
                      className={cn(
                        "transition-all duration-300",
                        status === 'current' && "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm",
                        status === 'completed' && "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30",
                        status === 'upcoming' && "opacity-60"
                      )}
                      data-testid={`stage-card-${stage.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Stage Icon */}
                          <div className="flex-shrink-0">
                            {getStageIcon(stage, status)}
                          </div>
                          
                          {/* Stage Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h5
                                className={cn(
                                  "font-medium text-sm",
                                  status === 'current' && "text-blue-700 dark:text-blue-300",
                                  status === 'completed' && "text-green-700 dark:text-green-300",
                                  status === 'upcoming' && "text-gray-500 dark:text-gray-400"
                                )}
                                data-testid={`stage-title-${stage.id}`}
                              >
                                {stage.title}
                              </h5>
                              {status === 'current' && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                                  Processing...
                                </span>
                              )}
                              {status === 'completed' && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  Complete
                                </span>
                              )}
                            </div>
                            <p
                              className={cn(
                                "text-sm",
                                status === 'upcoming' ? "text-gray-400 dark:text-gray-600" : "text-muted-foreground"
                              )}
                              data-testid={`stage-description-${stage.id}`}
                            >
                              {stage.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Completion message */}
        {currentStage >= 5 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
              🎉 Optimization recommendations have been generated successfully!
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}