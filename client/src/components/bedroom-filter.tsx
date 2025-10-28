import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Bed } from "lucide-react";

interface BedroomFilterProps {
  selectedBedroomTypes: string[];
  onBedroomTypeChange: (types: string[]) => void;
  bedroomCounts?: Record<string, number>;
  disabled?: boolean;
}

export function BedroomFilter({ 
  selectedBedroomTypes, 
  onBedroomTypeChange, 
  bedroomCounts = {},
  disabled = false 
}: BedroomFilterProps) {
  const bedroomOptions = [
    { id: '1BR', label: '1 Bedroom', icon: Bed },
    { id: '2BR', label: '2 Bedrooms', icon: Bed },
    { id: '3BR', label: '3 Bedrooms', icon: Home }
  ];

  const handleToggle = (bedroomType: string, checked: boolean) => {
    if (checked) {
      onBedroomTypeChange([...selectedBedroomTypes, bedroomType]);
    } else {
      onBedroomTypeChange(selectedBedroomTypes.filter(type => type !== bedroomType));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bed className="h-4 w-4 text-muted-foreground" />
          Filter Units
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bedroomOptions.map(option => {
          const Icon = option.icon;
          const count = bedroomCounts[option.id] || 0;
          const isSelected = selectedBedroomTypes.includes(option.id);
          const isDisabled = disabled || count === 0;
          
          return (
            <div 
              key={option.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isSelected 
                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                  : 'bg-background border-border hover:bg-muted/50'
              } ${isDisabled ? 'opacity-50' : ''}`}
              data-testid={`bedroom-filter-${option.id}`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                <Label 
                  htmlFor={`bedroom-${option.id}`} 
                  className={`font-medium cursor-pointer ${
                    isSelected ? 'text-blue-900 dark:text-blue-100' : ''
                  }`}
                >
                  {option.label}
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={count > 0 ? "secondary" : "outline"} 
                  className="min-w-[2.5rem] justify-center"
                >
                  {count}
                </Badge>
                <Switch
                  id={`bedroom-${option.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(option.id, checked)}
                  disabled={isDisabled}
                  data-testid={`bedroom-toggle-${option.id}`}
                  className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                />
              </div>
            </div>
          );
        })}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {selectedBedroomTypes.length === 0 
              ? "Select at least one bedroom type" 
              : `Showing ${selectedBedroomTypes.length} of ${bedroomOptions.length} types`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}