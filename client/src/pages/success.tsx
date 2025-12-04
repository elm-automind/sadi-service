import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, User, CheckCircle2, Home } from "lucide-react";
import { AddressMap } from "@/components/address-map";

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

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg border-border/60 overflow-hidden">
        <div className="bg-green-50 dark:bg-green-900/10 p-6 text-center border-b border-green-100 dark:border-green-900/30">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Complete</h1>
          <p className="text-muted-foreground text-sm mt-1">Your profile has been successfully saved.</p>
        </div>

        <CardContent className="p-0">
          <div className="bg-background p-6 space-y-6">
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
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
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Location Details</h3>
              
              <div className="rounded-lg overflow-hidden border border-border">
                <AddressMap 
                  readOnly 
                  initialLat={data.latitude} 
                  initialLng={data.longitude} 
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground leading-snug">
                  {data.textAddress}
                </p>
              </div>
            </div>

            {/* Fallback Photo Display */}
            <div className="space-y-2">
               <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Reference Photo</h3>
               <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border border-dashed">
                 {data.filePreview ? (
                   <img src={data.filePreview} alt="Building" className="w-full h-full object-cover rounded-lg" />
                 ) : (
                   <span className="text-xs text-muted-foreground">No photo provided</span>
                 )}
               </div>
            </div>
            
            <div className="pt-4">
              <Link href="/">
                <Button className="w-full" variant="outline">
                  <Home className="w-4 h-4 mr-2" /> Back to Home
                </Button>
              </Link>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
