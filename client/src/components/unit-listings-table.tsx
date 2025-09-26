import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Home, Bed, Bath, Square, DollarSign, Calendar } from "lucide-react";
import { formatCurrencyWithFallback } from "@/utils/formatters";

interface Unit {
  unitNumber: string;
  unitType: string;
  bedrooms: number;
  bathrooms: string;
  squareFootage: number;
  rent: string;
  availabilityDate: string;
  status: string;
}

interface UnitListingsTableProps {
  propertyName: string;
  units: Unit[];
  isSubjectProperty?: boolean;
}

export default function UnitListingsTable({ 
  propertyName, 
  units, 
  isSubjectProperty = false 
}: UnitListingsTableProps) {
  // Helper function to format availability date
  const formatAvailability = (date: string, status: string) => {
    if (!date || date === 'Contact for availability') {
      return 'Contact for availability';
    }
    
    const lowerDate = date.toLowerCase();
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === 'available' || lowerDate.includes('available now') || lowerDate.includes('immediately')) {
      return 'Available Now';
    }
    
    // Try to parse the date
    try {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `Available ${parsedDate.toLocaleDateString('en-US', options)}`;
      }
    } catch {
      // Fall back to original string if parsing fails
    }
    
    return date;
  };

  // Helper function to format rent
  const formatRent = (rent: string | number) => {
    return formatCurrencyWithFallback(rent, 'Contact for pricing');
  };

  // Helper function to format square footage
  const formatSqFt = (sqft: number) => {
    if (!sqft || sqft === 0) {
      return 'N/A';
    }
    return sqft.toLocaleString();
  };

  // Helper function to format bathrooms
  const formatBathrooms = (bathrooms: string | number) => {
    const value = typeof bathrooms === 'string' ? bathrooms : bathrooms.toString();
    if (!value || value === '0') {
      return 'N/A';
    }
    return value;
  };

  // Helper function to get status badge variant
  const getStatusVariant = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'available') {
      return 'default';
    } else if (lowerStatus === 'occupied') {
      return 'secondary';
    }
    return 'outline';
  };

  return (
    <Card className={`${isSubjectProperty ? 'border-primary' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubjectProperty ? (
            <Home className="h-5 w-5 text-primary" />
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
          {propertyName} - Unit Listings
          {isSubjectProperty && (
            <Badge variant="default" className="ml-2">
              Subject Property
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No unit data available for this property
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Unit Number</TableHead>
                  <TableHead className="min-w-[100px]">Unit Type</TableHead>
                  <TableHead className="text-center min-w-[60px]">
                    <div className="flex items-center justify-center gap-1">
                      <Bed className="h-3 w-3" />
                      Beds
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[60px]">
                    <div className="flex items-center justify-center gap-1">
                      <Bath className="h-3 w-3" />
                      Baths
                    </div>
                  </TableHead>
                  <TableHead className="text-right min-w-[80px]">
                    <div className="flex items-center justify-end gap-1">
                      <Square className="h-3 w-3" />
                      Sq Ft
                    </div>
                  </TableHead>
                  <TableHead className="text-right min-w-[100px]">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="h-3 w-3" />
                      Rent
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[140px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Availability
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit, index) => (
                  <TableRow key={`${unit.unitNumber}-${index}`} data-testid={`unit-row-${index}`}>
                    <TableCell className="font-medium">{unit.unitNumber || 'N/A'}</TableCell>
                    <TableCell>{unit.unitType}</TableCell>
                    <TableCell className="text-center">{unit.bedrooms || 0}</TableCell>
                    <TableCell className="text-center">{formatBathrooms(unit.bathrooms)}</TableCell>
                    <TableCell className="text-right">{formatSqFt(unit.squareFootage)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRent(unit.rent)}
                    </TableCell>
                    <TableCell>{formatAvailability(unit.availabilityDate, unit.status)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusVariant(unit.status)}>
                        {unit.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}