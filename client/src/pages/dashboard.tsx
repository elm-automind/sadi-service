import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, Plus, Settings, Clock, Users, LogOut, 
  ChevronRight, QrCode, Eye, Edit, Home as HomeIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import type { User, Address } from "@shared/schema";

interface UserWithAddresses extends User {
  addresses: Address[];
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<UserWithAddresses>({
    queryKey: ["/api/user"],
    retry: false,
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

        {/* More Options */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              More Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/fallback-contact">
              <div className="p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all cursor-pointer flex items-center gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full text-purple-600">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Add Fallback Contact</h4>
                  <p className="text-sm text-muted-foreground">
                    Add an alternative person/location for delivery
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/preferences">
              <div className="p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all cursor-pointer flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Delivery Time Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Set specific time slots and special instructions
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
