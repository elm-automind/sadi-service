import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MapPin, Plus, Clock, Users, LogOut, 
  ChevronRight, QrCode, Eye, Edit,
  UserPlus, Phone, Navigation, Calendar, Trash2, Star
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Address, FallbackContact } from "@shared/schema";

interface UserWithAddresses extends User {
  addresses: Address[];
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);
  const [selectedFallbackAddressId, setSelectedFallbackAddressId] = useState<number | null>(null);
  const [deleteFallbackDialogOpen, setDeleteFallbackDialogOpen] = useState(false);
  const [fallbackToDelete, setFallbackToDelete] = useState<FallbackContact | null>(null);

  const { data: user, isLoading } = useQuery<UserWithAddresses>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Set default selected address for fallback section when user data loads or changes
  useEffect(() => {
    if (user?.addresses?.length) {
      // Check if current selection still exists in addresses
      const currentSelectionExists = user.addresses.some(a => a.id === selectedFallbackAddressId);
      if (!currentSelectionExists) {
        // Reset to first address if current selection no longer exists
        setSelectedFallbackAddressId(user.addresses[0].id);
      }
    } else {
      // No addresses, clear selection
      setSelectedFallbackAddressId(null);
    }
  }, [user?.addresses]);

  // Check if selected address exists in current user addresses
  const selectedAddressExists = user?.addresses?.some(a => a.id === selectedFallbackAddressId) ?? false;

  // Fetch fallback contacts only for the selected address if it exists
  const { data: fallbackContacts } = useQuery<FallbackContact[]>({
    queryKey: ["/api/fallback-contacts", selectedFallbackAddressId],
    queryFn: async () => {
      if (!selectedFallbackAddressId) return [];
      const res = await fetch(`/api/fallback-contacts/${selectedFallbackAddressId}`, { credentials: 'include' });
      if (res.ok) return res.json();
      return [];
    },
    enabled: !!selectedFallbackAddressId && selectedAddressExists,
  });

  const deleteMutation = useMutation({
    mutationFn: async (addressId: number) => {
      const res = await apiRequest("DELETE", `/api/addresses/${addressId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Address Deleted",
        description: "The address and its fallback contacts have been removed.",
      });
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete address",
      });
    }
  });

  const deleteFallbackMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const res = await apiRequest("DELETE", `/api/fallback-contact/${contactId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fallback-contacts", selectedFallbackAddressId] });
      toast({
        title: "Fallback Contact Deleted",
        description: "The fallback contact has been removed.",
      });
      setDeleteFallbackDialogOpen(false);
      setFallbackToDelete(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete fallback contact",
      });
    }
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (addressId: number) => {
      const res = await apiRequest("POST", `/api/addresses/${addressId}/set-primary`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Default Address Set",
        description: "This address is now your default delivery address.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to set default address",
      });
    }
  });

  const setDefaultFallbackMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const res = await apiRequest("POST", `/api/fallback-contact/${contactId}/set-default`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fallback-contacts", selectedFallbackAddressId] });
      toast({
        title: "Default Fallback Set",
        description: "This fallback contact is now your default for this address.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to set default fallback",
      });
    }
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading]);

  const handleLogout = async () => {
    await apiRequest("POST", "/api/logout", {});
    queryClient.removeQueries({ queryKey: ["/api/user"] }); // Clear session-related queries only
    setLocation("/");
  };

  const handleDeleteClick = (address: Address) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (addressToDelete) {
      deleteMutation.mutate(addressToDelete.id);
    }
  };

  const handleDeleteFallbackClick = (contact: FallbackContact) => {
    setFallbackToDelete(contact);
    setDeleteFallbackDialogOpen(true);
  };

  const confirmDeleteFallback = () => {
    if (fallbackToDelete) {
      deleteFallbackMutation.mutate(fallbackToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const selectedAddress = user.addresses.find(a => a.id === selectedFallbackAddressId);

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome, {user.name.split(' ')[0]}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/add-address">
            <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Add New Address</h3>
                  <p className="text-sm text-muted-foreground">Register a new delivery location</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/preferences">
            <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Delivery Preferences</h3>
                  <p className="text-sm text-muted-foreground">Set times & special instructions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Existing Addresses */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Your Registered Addresses
                </CardTitle>
                <CardDescription>
                  {user.addresses.length === 0 
                    ? "No addresses registered yet" 
                    : `${user.addresses.length} address${user.addresses.length > 1 ? 'es' : ''} registered`}
                </CardDescription>
              </div>
              {user.addresses.length > 0 && (
                <Link href="/add-address">
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" /> Add
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.addresses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No addresses registered yet.</p>
                <Link href="/add-address">
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Address
                  </Button>
                </Link>
              </div>
            ) : (
              user.addresses.map((address) => (
                <div 
                  key={address.id}
                  data-testid={`address-card-${address.id}`}
                  className={`p-4 bg-muted/50 rounded-lg border transition-colors ${
                    address.isPrimary 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {address.digitalId}
                        </span>
                        {address.isPrimary && (
                          <Badge variant="default" className="bg-primary text-xs gap-1">
                            <Star className="w-3 h-3" /> Default
                          </Badge>
                        )}
                        {address.preferredTime && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">
                            {address.preferredTime}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground truncate">
                        {address.textAddress}
                      </p>
                      {address.specialNote && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Note: {address.specialNote}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      {!address.isPrimary && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Set as Default"
                          data-testid={`btn-set-default-${address.id}`}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => setDefaultAddressMutation.mutate(address.id)}
                          disabled={setDefaultAddressMutation.isPending}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Link href={`/view/${address.digitalId}`}>
                        <Button variant="ghost" size="sm" title="View" data-testid={`btn-view-${address.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/edit-address/${address.id}`}>
                        <Button variant="ghost" size="sm" title="Edit" data-testid={`btn-edit-${address.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/view/${address.digitalId}`}>
                        <Button variant="ghost" size="sm" title="QR Code" data-testid={`btn-qr-${address.id}`}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Delete"
                        data-testid={`btn-delete-${address.id}`}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(address)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Fallback Contacts */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Fallback Contacts
                </CardTitle>
                <CardDescription>
                  Alternative people who can receive deliveries when you're not available
                </CardDescription>
              </div>
              {user.addresses.length > 0 && selectedFallbackAddressId && (
                <Link href={`/fallback-contact?addressId=${selectedFallbackAddressId}`}>
                  <Button size="sm" variant="outline" className="gap-2">
                    <UserPlus className="w-4 h-4" /> Add
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.addresses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Register an address first to add fallback contacts.</p>
              </div>
            ) : (
              <>
                {/* Address Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Select Primary Address</label>
                  <Select 
                    value={selectedFallbackAddressId?.toString() || ""} 
                    onValueChange={(v) => setSelectedFallbackAddressId(parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-fallback-address">
                      <SelectValue placeholder="Select an address" />
                    </SelectTrigger>
                    <SelectContent>
                      {user.addresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {addr.digitalId}
                            </span>
                            <span className="truncate max-w-[200px]">{addr.textAddress}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fallback Contacts for Selected Address */}
                {selectedAddress && (
                  <div className="space-y-3 pt-2">
                    {!fallbackContacts || fallbackContacts.length === 0 ? (
                      <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-border/50 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm text-muted-foreground">No fallback contacts for this address</p>
                        <Link href={`/fallback-contact?addressId=${selectedFallbackAddressId}`}>
                          <Button variant="link" size="sm" className="mt-2 gap-1">
                            <UserPlus className="w-3 h-3" /> Add Fallback Contact
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fallbackContacts.map((contact) => (
                          <div 
                            key={contact.id}
                            data-testid={`fallback-card-${contact.id}`}
                            className={`p-3 bg-muted/50 rounded-lg border transition-colors ${
                              contact.isDefault 
                                ? 'border-purple-400 bg-purple-50/50' 
                                : 'border-border/50 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium text-foreground">{contact.name}</span>
                                  {contact.isDefault && (
                                    <Badge variant="default" className="bg-purple-600 text-xs gap-1">
                                      <Star className="w-3 h-3" /> Default
                                    </Badge>
                                  )}
                                  {contact.relationship && (
                                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {contact.relationship}
                                    </span>
                                  )}
                                  {contact.requiresExtraFee && (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                                      +Fee
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {contact.phone}
                                  </span>
                                  {contact.distanceKm !== null && (
                                    <span className="flex items-center gap-1">
                                      <Navigation className="w-3 h-3" /> {contact.distanceKm.toFixed(1)} km
                                    </span>
                                  )}
                                  {contact.scheduledDate && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> Scheduled
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                                {!contact.isDefault && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    title="Set as Default"
                                    data-testid={`btn-set-default-fallback-${contact.id}`}
                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    onClick={() => setDefaultFallbackMutation.mutate(contact.id)}
                                    disabled={setDefaultFallbackMutation.isPending}
                                  >
                                    <Star className="w-4 h-4" />
                                  </Button>
                                )}
                                <Link href={`/view-fallback/${contact.id}`}>
                                  <Button variant="ghost" size="sm" title="View Details" data-testid={`btn-view-fallback-${contact.id}`}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Link href={`/edit-fallback/${contact.id}`}>
                                  <Button variant="ghost" size="sm" title="Edit" data-testid={`btn-edit-fallback-${contact.id}`}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Delete"
                                  data-testid={`btn-delete-fallback-${contact.id}`}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteFallbackClick(contact)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Link href={`/fallback-contact?addressId=${selectedFallbackAddressId}`}>
                          <Button variant="ghost" size="sm" className="w-full gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <UserPlus className="w-3 h-3" /> Add Another Fallback
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Delete Address Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the address "{addressToDelete?.digitalId}" and all its fallback contacts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Fallback Contact Confirmation Dialog */}
      <AlertDialog open={deleteFallbackDialogOpen} onOpenChange={setDeleteFallbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fallback Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the fallback contact "{fallbackToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFallback}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFallbackMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
