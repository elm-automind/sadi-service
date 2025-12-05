import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, MapPin, User, Clock, FileText, Home, Building2, DoorOpen, 
  Image, Users, Navigation, Calendar, AlertCircle, ArrowLeft, DollarSign
} from "lucide-react";
import { AddressMap } from "@/components/address-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FallbackContact } from "@shared/schema";

export default function ViewFallback() {
  const [, params] = useRoute("/view-fallback/:id");
  const contactId = params?.id ? parseInt(params.id) : null;

  const { data: contact, isLoading, error } = useQuery<FallbackContact>({
    queryKey: [`/api/fallback-contact/${contactId}`],
    enabled: !!contactId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading fallback contact...</p>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4 flex gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="w-4 h-4" /> Home
            </Button>
          </Link>
        </div>
        
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Contact Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This fallback contact does not exist or has been removed.
          </p>
          <Link href="/">
            <Button>
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center py-8 relative">
      <div className="absolute top-4 left-4 flex gap-2">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="w-4 h-4" /> Home
          </Button>
        </Link>
      </div>
      
      <Card className="w-full max-w-2xl shadow-xl border-border/60 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/10 p-6 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-2xl shrink-0 border-2 border-purple-300 dark:border-purple-700">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{contact.name}</h1>
                  {contact.relationship && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {contact.relationship}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                  <Phone className="w-3 h-3" />
                  <span>{contact.phone}</span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              {contact.distanceKm !== null && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                  <Navigation className="w-4 h-4" />
                  <span className="font-medium">{contact.distanceKm.toFixed(1)} km</span>
                </div>
              )}
              {contact.requiresExtraFee && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1">
                  <DollarSign className="w-3 h-3" /> Extra Fee Required
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <Tabs defaultValue="location" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="location" 
                data-testid="tab-location"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent py-3 px-6"
              >
                <MapPin className="w-4 h-4 mr-2" /> Location
              </TabsTrigger>
              <TabsTrigger 
                value="photos" 
                data-testid="tab-photos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent py-3 px-6"
              >
                <Image className="w-4 h-4 mr-2" /> Photos
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                data-testid="tab-details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent py-3 px-6"
              >
                <FileText className="w-4 h-4 mr-2" /> Details
              </TabsTrigger>
            </TabsList>

            {/* Location Tab */}
            <TabsContent value="location" className="p-4 md:p-6 space-y-4 mt-0">
              {contact.lat && contact.lng ? (
                <>
                  <div className="rounded-lg overflow-hidden border border-border h-64">
                    <AddressMap 
                      readOnly 
                      initialLat={contact.lat} 
                      initialLng={contact.lng} 
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border/50">
                    <MapPin className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{contact.textAddress}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Coordinates: {contact.lat.toFixed(6)}, {contact.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No location information available</p>
                </div>
              )}
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="p-4 md:p-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Building View", icon: Building2, src: contact.photoBuilding },
                  { label: "Main Gate", icon: DoorOpen, src: contact.photoGate },
                  { label: "Flat Door", icon: Home, src: contact.photoDoor }
                ].map((img, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <img.icon className="w-4 h-4" /> {img.label}
                    </p>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden">
                      {img.src ? (
                        <img 
                          src={img.src} 
                          alt={img.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Image className="w-8 h-8 mx-auto mb-1 opacity-30" />
                          <p className="text-xs">No photo</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="p-4 md:p-6 space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <User className="w-4 h-4" /> Relationship
                  </div>
                  <p className="font-medium text-foreground capitalize">
                    {contact.relationship || "Not specified"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Navigation className="w-4 h-4" /> Distance
                  </div>
                  <p className="font-medium text-foreground">
                    {contact.distanceKm !== null 
                      ? `${contact.distanceKm.toFixed(2)} km from primary address`
                      : "Not calculated"}
                  </p>
                </div>
              </div>

              {/* Scheduling Info for 3km+ contacts */}
              {contact.requiresExtraFee && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-900/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400 mb-3">
                    <AlertCircle className="w-4 h-4" /> Extended Distance Delivery
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      <span className="text-muted-foreground">Scheduled Date:</span>
                      <span className="font-medium text-foreground">{contact.scheduledDate || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-muted-foreground">Time Slot:</span>
                      <span className="font-medium text-foreground">{contact.scheduledTimeSlot || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-orange-600" />
                      <span className="text-muted-foreground">Extra Fee:</span>
                      <span className="font-medium text-foreground">
                        {contact.extraFeeAcknowledged ? "Acknowledged" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {contact.specialNote && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                    <FileText className="w-4 h-4" /> Special Notes
                  </div>
                  <p className="text-foreground">{contact.specialNote}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Footer */}
          <div className="p-4 md:p-6 bg-muted/30 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              <Users className="w-4 h-4 inline mr-1" />
              Fallback Contact
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
