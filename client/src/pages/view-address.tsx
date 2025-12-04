import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, User, Clock, FileText, QrCode, Home, Building2, DoorOpen, Image } from "lucide-react";
import { AddressMap } from "@/components/address-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

export default function ViewAddress() {
  const [, params] = useRoute("/view/:digitalId");
  const digitalId = params?.digitalId;

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/address/${digitalId}`],
    enabled: !!digitalId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading address details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Address Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            The Digital ID "{digitalId}" does not exist or has been removed.
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

  const { address, user } = data;
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center py-8">
      <Card className="w-full max-w-2xl shadow-xl border-border/60 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/5 dark:to-blue-900/10 p-6 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0 border-2 border-primary/30">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                  <Phone className="w-3 h-3" />
                  <span>{user.phone}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Digital ID</p>
              <p className="text-lg font-mono font-bold text-primary tracking-widest">{address.digitalId}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <Tabs defaultValue="location" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="location" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6"
              >
                <MapPin className="w-4 h-4 mr-2" /> Location
              </TabsTrigger>
              <TabsTrigger 
                value="photos" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6"
              >
                <Image className="w-4 h-4 mr-2" /> Photos
              </TabsTrigger>
              <TabsTrigger 
                value="instructions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6"
              >
                <FileText className="w-4 h-4 mr-2" /> Instructions
              </TabsTrigger>
            </TabsList>

            {/* Location Tab */}
            <TabsContent value="location" className="p-4 md:p-6 space-y-4 mt-0">
              <div className="rounded-lg overflow-hidden border border-border h-64">
                <AddressMap 
                  readOnly 
                  initialLat={address.lat ?? undefined} 
                  initialLng={address.lng ?? undefined} 
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border/50">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{address.textAddress}</p>
                  {address.lat && address.lng && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordinates: {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="p-4 md:p-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Building View", icon: Building2, src: address.photoBuilding },
                  { label: "Main Gate", icon: DoorOpen, src: address.photoGate },
                  { label: "Flat Door", icon: Home, src: address.photoDoor }
                ].map((img, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <img.icon className="w-4 h-4" /> {img.label}
                    </p>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden">
                      {img.src ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                          <div className="text-center p-4">
                            <Image className="w-8 h-8 text-primary/50 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">{img.src}</p>
                          </div>
                        </div>
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

            {/* Instructions Tab */}
            <TabsContent value="instructions" className="p-4 md:p-6 space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Clock className="w-4 h-4" /> Preferred Time
                  </div>
                  <p className="font-medium text-foreground capitalize">
                    {address.preferredTime || "Not specified"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Home className="w-4 h-4" /> If Not Home
                  </div>
                  <p className="font-medium text-foreground capitalize">
                    {address.fallbackOption === "door" ? "Leave at door/reception" :
                     address.fallbackOption === "neighbor" ? "Leave with neighbor" :
                     address.fallbackOption === "call" ? "Call to reschedule" :
                     address.fallbackOption === "security" ? "Leave with security" :
                     address.fallbackOption || "Not specified"}
                  </p>
                </div>
              </div>
              
              {address.specialNote && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                    <FileText className="w-4 h-4" /> Special Notes
                  </div>
                  <p className="text-foreground">{address.specialNote}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator />

          {/* QR Code Footer */}
          <div className="p-4 md:p-6 bg-muted/30">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-lg shadow-sm border">
                <QRCode 
                  value={currentUrl} 
                  size={120}
                  level="M"
                />
              </div>
              <div className="text-center md:text-left flex-1">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">Scan to Share</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this QR code or link with delivery drivers for quick location access.
                </p>
                <p className="text-xs text-primary font-mono mt-2 break-all">
                  {currentUrl}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
