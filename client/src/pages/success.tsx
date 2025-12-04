import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, CheckCircle2, Home, QrCode, Download, Share2, Plus } from "lucide-react";
import { AddressMap } from "@/components/address-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { User, Address } from "@shared/schema";

interface UserWithAddresses extends User {
  addresses: Address[];
}

export default function Success() {
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

  if (isLoading) return <div className="p-10 text-center">Loading...</div>;
  if (!user) return null;

  // Use the last address for display
  const currentAddress = user.addresses && user.addresses.length > 0 
    ? user.addresses[user.addresses.length - 1] 
    : null;

  if (!currentAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p>No address found.</p>
        <Link href="/add-address"><Button className="mt-4">Add Address</Button></Link>
      </div>
    );
  }

  // Generate QR Code URL pointing to public view page
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const qrCodeUrl = `${baseUrl}/view/${currentAddress.digitalId}`;

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center py-10">
      <Card className="w-full max-w-lg shadow-lg border-border/60 overflow-hidden">
        <div className="bg-green-50 dark:bg-green-900/10 p-6 text-center border-b border-green-100 dark:border-green-900/30">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Complete</h1>
          <p className="text-muted-foreground text-sm mt-1">Your location has been secured.</p>
          
          <div className="mt-4 inline-block px-4 py-2 bg-background rounded-lg border border-border shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Your Digital ID</p>
            <p className="text-xl font-mono font-bold text-primary tracking-widest">{currentAddress.digitalId}</p>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="bg-background p-4 md:p-6">
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="qr">Digital ID Card</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{user.name}</h2>
                    <div className="flex items-center text-muted-foreground text-sm gap-1">
                      <Phone className="w-3 h-3" />
                      {user.phone}
                    </div>
                  </div>
                </div>

                {/* Show multiple addresses if exist */}
                {user.addresses.length > 1 && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    You have {user.addresses.length} addresses registered under this ID.
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Location</h3>
                  
                  <div className="rounded-lg overflow-hidden border border-border h-48">
                    <AddressMap 
                      readOnly 
                      initialLat={currentAddress.lat ?? undefined} 
                      initialLng={currentAddress.lng ?? undefined} 
                    />
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-snug">
                      {currentAddress.textAddress}
                    </p>
                  </div>
                </div>

                {/* Photo Gallery Grid */}
                <div className="space-y-2">
                   <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference Photos</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {[
                        { label: "Building", src: currentAddress.photoBuilding }, // In real app these would be URLs
                        { label: "Gate", src: currentAddress.photoGate },
                        { label: "Door", src: currentAddress.photoDoor }
                     ].map((img, i) => (
                       <div key={i} className="space-y-1">
                         <div className="aspect-square bg-muted rounded-md flex items-center justify-center border border-border overflow-hidden relative group">
                           {img.src ? (
                             // Mockup: just showing name if no URL logic yet, or valid url if implemented
                             <div className="text-[10px] p-2 text-center break-words">{img.src}</div>
                           ) : (
                             <span className="text-[10px] text-muted-foreground text-center p-1">No {img.label}</span>
                           )}
                         </div>
                         <p className="text-[10px] text-center text-muted-foreground">{img.label}</p>
                       </div>
                     ))}
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="qr" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold">Digital Location ID: {currentAddress.digitalId}</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Scan this QR code to view address details, photos, and delivery instructions.
                  </p>
                </div>

                <div className="flex justify-center py-4">
                  <div className="p-4 bg-white rounded-xl shadow-sm border border-border relative">
                    <QRCode 
                      value={qrCodeUrl} 
                      size={200}
                      level="M"
                      viewBox={`0 0 256 256`}
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border border-gray-100 shadow-sm">
                      <MapPin className="w-6 h-6 text-primary fill-primary/10" />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 space-y-2">
                  <div className="flex gap-2 items-start">
                    <QrCode className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>Scan or share this link to view full address details:</p>
                  </div>
                  <a 
                    href={qrCodeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block font-mono text-xs bg-white/50 p-2 rounded border border-blue-200 hover:bg-white transition-colors break-all"
                  >
                    {qrCodeUrl}
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" /> Save ID
                  </Button>
                  <Link href={`/view/${currentAddress.digitalId}`}>
                    <Button className="w-full">
                      <Share2 className="w-4 h-4 mr-2" /> View Page
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="pt-6 mt-2 border-t border-border/40 grid grid-cols-2 gap-3">
              <Link href="/">
                <Button className="w-full" variant="ghost">
                  <Home className="w-4 h-4 mr-2" /> Home
                </Button>
              </Link>
              <Link href="/register">
                <Button className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Add Another
                </Button>
              </Link>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
