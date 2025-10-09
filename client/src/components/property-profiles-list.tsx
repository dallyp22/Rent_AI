import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, ExternalLink, Building2, Target, Users, Eye } from "lucide-react";
import { Link } from "wouter";
import type { PropertyProfile } from "@shared/schema";

interface PropertyProfilesListProps {
  profiles: PropertyProfile[];
  isLoading: boolean;
  onEdit: (profile: PropertyProfile) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function PropertyProfilesList({
  profiles,
  isLoading,
  onEdit,
  onDelete,
  isDeleting
}: PropertyProfilesListProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'subject':
        return <Target className="h-4 w-4" />;
      case 'competitor':
        return <Users className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getPropertyTypeBadge = (type: string) => {
    switch (type) {
      case 'subject':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Subject</Badge>;
      case 'competitor':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">Competitor</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="properties-list-loading">
        <CardHeader>
          <CardTitle>Property Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (profiles.length === 0) {
    return (
      <Card data-testid="properties-list-empty">
        <CardHeader>
          <CardTitle>Property Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Property Profiles</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first property profile. You can add both subject properties and competitors.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="properties-list">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Property Profiles ({profiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Type</TableHead>
                <TableHead>Property Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City, State</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-center">Built</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} data-testid={`row-property-${profile.id}`}>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getPropertyTypeIcon(profile.profileType)}
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div>
                        <Link href={`/property-profile/${profile.id}`}>
                          <div className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors" data-testid={`text-name-${profile.id}`}>
                            {profile.name}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {getPropertyTypeBadge(profile.profileType)}
                          {profile.propertyType && (
                            <Badge variant="outline" className="text-xs">
                              {profile.propertyType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="max-w-[200px]">
                    <div className="truncate text-muted-foreground" title={profile.address}>
                      {profile.address}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      {profile.city && profile.state ? `${profile.city}, ${profile.state}` : 
                       profile.city || profile.state || '-'}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className="text-sm font-medium" data-testid={`text-units-${profile.id}`}>
                      {profile.totalUnits || '-'}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className="text-sm">
                      {profile.builtYear || '-'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {profile.createdAt ? formatDate(profile.createdAt) : '-'}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/property-profile/${profile.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View details"
                          data-testid={`button-details-${profile.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(profile.url, '_blank')}
                        className="h-8 w-8 p-0"
                        title="Open property URL"
                        data-testid={`button-view-${profile.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(profile)}
                        className="h-8 w-8 p-0"
                        title="Edit property"
                        data-testid={`button-edit-${profile.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(profile.id)}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        title="Delete property"
                        data-testid={`button-delete-${profile.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}