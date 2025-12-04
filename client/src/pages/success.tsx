import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, CheckCircle2, Home, QrCode, Download, Share2 } from "lucide-react";
import { AddressMap } from "@/components/address-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Success() {
  const [data, setData] = useState<any>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem("registrationData");
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      setLocation("/"); // Redirect if no data found
    }
  }, []);

  if (!data) return null;

  // Prepare QR Code Data
  // We include the text address and metadata about images. 
  // In a real app, this would likely be a URL to a tracking page or a JSON blob with image URLs.
  const qrCodeValue = JSON.stringify({
    n: data.name,
    p: data.phone,
    addr: data.textAddress,
    loc: { lat: data.latitude, lng: data.longitude },
    imgs: {
      b: data.building ? "Attached" : "No",
      g: data.gate ? "Attached" : "No",
      d: data.door ? "Attached" : "No"
    }
  });

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center py-10">
      <Card className="w-full max-w-lg shadow-lg border-border/60 overflow-hidden">
        <div className="bg-green-50 dark:bg-green-900/10 p-6 text-center border-b border-green-100 dark:border-green-900/30">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Complete</h1>
          <p className="text-muted-foreground text-sm mt-1">Your profile has been successfully saved.</p>
        </div>

        <CardContent className="p-0">
          <div className="bg-background p-4 md:p-6">
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="qr">Digital ID</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                    {data.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{data.name}</h2>
                    <div className="flex items-center text-muted-foreground text-sm gap-1">
                      <Phone className="w-3 h-3" />
                      {data.phone}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</h3>
                  
                  <div className="rounded-lg overflow-hidden border border-border h-48">
                    <AddressMap 
                      readOnly 
                      initialLat={data.latitude} 
                      initialLng={data.longitude} 
                    />
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-snug">
                      {data.textAddress}
                    </p>
                  </div>
                </div>

                {/* Photo Gallery Grid */}
                <div className="space-y-2">
                   <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference Photos</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {[
                        { label: "Building", src: data.building },
                        { label: "Gate", src: data.gate },
                        { label: "Door", src: data.door }
                     ].map((img, i) => (
                       <div key={i} className="space-y-1">
                         <div className="aspect-square bg-muted rounded-md flex items-center justify-center border border-border overflow-hidden relative group">
                           {img.src ? (
                             <img src={img.src} alt={img.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
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
                  <h3 className="font-semibold">Your Digital Location ID</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Scan this code to retrieve your address details and location photos.
                  </p>
                </div>

                <div className="flex justify-center py-4">
                  <div className="p-4 bg-white rounded-xl shadow-sm border border-border">
                    <QRCode 
                      value={qrCodeValue} 
                      size={200}
                      level="M"
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex gap-2 items-start">
                  <QrCode className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>This QR code contains your name, phone, verified coordinates, and links to your uploaded location photos.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" /> Save
                  </Button>
                  <Button className="w-full">
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="pt-6 mt-2 border-t border-border/40">
              <Link href="/">
                <Button className="w-full" variant="ghost">
                  <Home className="w-4 h-4 mr-2" /> Return to Home
                </Button>
              </Link>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
