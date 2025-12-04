import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, Plus, Settings, Clock, Users, LogOut, 
  ChevronRight, QrCode, Eye, Edit, Home as HomeIcon,
  UserPlus, Phone, Navigation, AlertCircle, Calendar
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { User, Address, FallbackContact } from "@shared/schema";

interface AddressWithFallbacks extends Address {
  fallbackContacts?: FallbackContact[];
}

interface UserWithAddresses extends User {
  addresses: AddressWithFallbacks[];
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<UserWithAddresses>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Fetch fallback contacts for all addresses - key includes address IDs to refetch when they change
  const addressIds = user?.addresses?.map(a => a.id).sort().join(',') || '';
  const { data: fallbacksByAddress } = useQuery<Record<number, FallbackContact[]>>({
    queryKey: ["/api/fallback-contacts-all", addressIds],
    queryFn: async () => {
      if (!user?.addresses || user.addresses.length === 0) return {};
      const result: Record<number, FallbackContact[]> = {};
      for (const addr of user.addresses) {
        try {
          const res = await fetch(`/api/fallback-contacts/${addr.id}`, { credentials: 'include' });
          if (res.ok) {
            result[addr.id] = await res.json();
          }
        } catch {}
      }
      return result;
    },
    enabled: !!user?.addresses?.length,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading]);

  const handleLogout = async () => {
    await apiRequest("POST", "/api/logout", {});
    setLocation("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

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
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <HomeIcon className="w-4 h-4 mr-2" /> Home
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
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
                  className="p-4 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {address.digitalId}
                        </span>
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
                    <div className="flex gap-2 shrink-0">
                      <Link href={`/view/${address.digitalId}`}>
                        <Button variant="ghost" size="sm" title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/edit-address/${address.id}`}>
                        <Button variant="ghost" size="sm" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/view/${address.digitalId}`}>
                        <Button variant="ghost" size="sm" title="QR Code">
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </Link>
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
              {user.addresses.length > 0 && (
                <Link href="/fallback-contact">
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
              user.addresses.map((address) => {
                const contacts = fallbacksByAddress?.[address.id] || [];
                return (
                  <div key={address.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {address.digitalId}
                      </span>
                      <span className="text-muted-foreground truncate flex-1">
                        {address.textAddress.substring(0, 40)}...
                      </span>
                    </div>
                    
                    {contacts.length === 0 ? (
                      <div className="ml-6 p-3 bg-muted/30 rounded-lg border border-dashed border-border/50 text-center">
                        <p className="text-sm text-muted-foreground">No fallback contacts added</p>
                        <Link href={`/fallback-contact?addressId=${address.id}`}>
                          <Button variant="link" size="sm" className="mt-1 gap-1">
                            <UserPlus className="w-3 h-3" /> Add Fallback Contact
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="ml-6 space-y-2">
                        {contacts.map((contact) => (
                          <div 
                            key={contact.id}
                            className="p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-foreground">{contact.name}</span>
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
                              <Link href={`/view-fallback/${contact.id}`}>
                                <Button variant="ghost" size="sm" title="View Details">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                        <Link href={`/fallback-contact?addressId=${address.id}`}>
                          <Button variant="ghost" size="sm" className="w-full gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <UserPlus className="w-3 h-3" /> Add Another Fallback
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
