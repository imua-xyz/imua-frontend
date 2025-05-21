// components/ui/cross-chain-progress.tsx
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, ArrowRight, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TxStatus } from "@/types/staking";

export type CrossChainStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "processing" | "success" | "error" | "waiting";
  txHash?: string;
  explorerUrl?: string;
};

export type CrossChainProgress = {
  sourceChain: string;
  destinationChain: string;
  operation: "deposit" | "stake" | "withdraw" | "claim";
  steps: CrossChainStep[];
  currentStepIndex: number;
  overallStatus: TxStatus | "relaying" | "confirming" | null;
};

interface CrossChainProgressProps {
  progress: CrossChainProgress;
  open: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
}

export function CrossChainProgress({ 
  progress, 
  open, 
  onClose,
  onViewDetails 
}: CrossChainProgressProps) {
  const [progressValue, setProgressValue] = useState(0);
  
  // Calculate progress percentage based on steps
  useEffect(() => {
    const totalSteps = progress.steps.length;
    const completedSteps = progress.steps.filter(
      step => step.status === "success"
    ).length;
    
    // If there's an error, stop at current step
    const hasError = progress.steps.some(step => step.status === "error");
    
    if (hasError) {
      // Calculate progress up to the error step
      const errorIndex = progress.steps.findIndex(step => step.status === "error");
      setProgressValue(((errorIndex) / (totalSteps - 1)) * 100);
    } else if (progress.overallStatus === "success") {
      setProgressValue(100);
    } else {
      // Calculate progress based on completed + half credit for processing
      const processingCredit = progress.steps.some(
        step => step.status === "processing"
      ) ? 0.5 : 0;
      
      setProgressValue(
        ((completedSteps + processingCredit) / totalSteps) * 100
      );
    }
  }, [progress]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {progress.operation.charAt(0).toUpperCase() + progress.operation.slice(1)} Progress
          </DialogTitle>
        </DialogHeader>
        
        {/* Chain indication */}
        <div className="flex items-center justify-center text-sm text-muted-foreground mb-4">
          <span>{progress.sourceChain}</span>
          <ArrowRight className="mx-2" size={16} />
          <span>{progress.destinationChain}</span>
        </div>
        
        {/* Overall progress bar */}
        <Progress value={progressValue} className="h-2 mb-6" />
        
        {/* Steps list */}
        <div className="space-y-4">
          {progress.steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex items-start p-3 rounded-lg border ${
                index === progress.currentStepIndex ? "bg-muted border-primary/20" : ""
              }`}
            >
              {/* Status icon */}
              <div className="mr-3 mt-0.5">
                {step.status === "success" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {step.status === "error" && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                {step.status === "processing" && (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                )}
                {step.status === "pending" && (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                {step.status === "waiting" && (
                  <Clock className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              
              {/* Step content */}
              <div className="flex-1">
                <h4 className="font-medium text-sm">{step.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
                
                {/* Transaction hash if available */}
                {step.txHash && step.explorerUrl && (
                  <a 
                    href={step.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    View transaction
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between mt-4">
          {progress.overallStatus === "success" || progress.overallStatus === "error" ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {onViewDetails && (
                <Button onClick={onViewDetails}>
                  View Details
                </Button>
              )}
            </>
          ) : (
            <div className="w-full text-center text-sm text-muted-foreground">
              Please keep this window open until the process completes
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}