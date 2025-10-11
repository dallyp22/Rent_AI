import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface WorkflowState {
  stage?: string;
  highestStage?: string;
  selectedCompetitorIds?: string[];
  analysisSessionId?: string;
  filterCriteria?: any;
  optimizationParams?: any;
  timestamp?: string;
}

export function useWorkflowState(workflowId: string, isSessionMode?: boolean) {
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<WorkflowState | null>(null);

  // Determine the appropriate endpoint based on session mode
  const getEndpointPrefix = () => {
    return isSessionMode ? `/api/analysis-sessions/${workflowId}/workflow` : `/api/workflow/${workflowId}`;
  };

  const loadState = async (): Promise<WorkflowState | null> => {
    try {
      setIsLoading(true);
      const endpoint = getEndpointPrefix();
      const response = await apiRequest('GET', endpoint);
      if (response.ok) {
        const data = await response.json();
        setState(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error loading workflow state:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = async (updates: Partial<WorkflowState>): Promise<void> => {
    try {
      // Track highest stage reached
      let highestStage = state?.highestStage || state?.stage || 'select';
      
      // If stage is being updated, check if it's further along
      if (updates.stage) {
        const stageOrder = ['select', 'summarize', 'analyze', 'optimize'];
        const currentHighestIndex = stageOrder.indexOf(highestStage);
        const newStageIndex = stageOrder.indexOf(updates.stage);
        
        // Update highestStage only if the new stage is further along
        if (newStageIndex > currentHighestIndex) {
          highestStage = updates.stage;
        }
      }
      
      const updatedState = {
        ...state,
        ...updates,
        highestStage, // Always include highestStage
        timestamp: new Date().toISOString()
      };
      
      const endpoint = getEndpointPrefix();
      await apiRequest('PUT', endpoint, updatedState);
      setState(updatedState);
    } catch (error) {
      console.error("Error saving workflow state:", error);
    }
  };

  // Load state on mount
  useEffect(() => {
    if (workflowId) {
      loadState();
    }
  }, [workflowId, isSessionMode]);

  return { 
    state, 
    isLoading, 
    loadState, 
    saveState 
  };
}