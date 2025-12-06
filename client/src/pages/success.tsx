import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, CheckCircle2, QrCode, Download, Share2, Plus, Truck, Package } from "lucide-react";
import { AddressMap } from "@/components/address-map";
import { PageNavigation } from "@/components/page-navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { User, Address } from "@shared/schema";

interface UserWithAddresses extends User {
  addresses: Address[];
}

export default function Success() {
  const { t } = useTranslation();
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

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-10">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  if (!user) return null;

  const currentAddress = user.addresses && user.addresses.length > 0 
    ? user.addresses[user.addresses.length - 1] 
    : null;

  if (!currentAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[15%] left-[10%] w-[250px] h-[250px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <PageNavigation className="absolute top-4 start-4 z-10" />
        <div className="absolute top-4 end-4 z-10">
          <LanguageSwitcher />
        </div>
        
        <p className="text-muted-foreground">{t('success.noAddressFound')}</p>
        <Link href="/add-address"><Button className="mt-4">{t('address.addAddress')}</Button></Link>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const qrCodeUrl = `${baseUrl}/view/${currentAddress.digitalId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 flex items-center justify-center py-10 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[5%] w-[400px] h-[400px] bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[20%] left-[3%] text-primary/5 float-animation">
          <Truck className="w-14 h-14" />
        </div>
        <div className="absolute bottom-[25%] right-[3%] text-primary/5 float-animation" style={{ animationDelay: '2s' }}>
          <Package className="w-10 h-10" />
        </div>
      </div>
      
      <PageNavigation className="absolute top-4 start-4 z-10" />
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-lg shadow-xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm overflow-hidden relative z-10">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 text-center border-b border-green-100 dark:border-green-900/30">
          <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 text-white shadow-lg shadow-green-500/30 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('success.registrationComplete')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('success.locationSecured')}</p>
          
          <div className="mt-4 inline-block px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-border shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('success.yourDigitalId')}</p>
            <p className="text-xl font-mono font-bold text-green-600 dark:text-green-400 tracking-widest">{currentAddress.digitalId}</p>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="bg-background p-4 md:p-6">
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="details">{t('common.details')}</TabsTrigger>
                <TabsTrigger value="qr">{t('success.digitalIdCard')}</TabsTrigger>
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

                {user.addresses.length > 1 && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {t('success.addressesRegistered', { count: user.addresses.length })}
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('success.currentLocation')}</h3>
                  
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

                <div className="space-y-2">
                   <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('success.referencePhotos')}</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {[
                        { label: t('register.building'), src: currentAddress.photoBuilding },
                        { label: t('register.mainGate'), src: currentAddress.photoGate },
                        { label: t('register.flatDoor'), src: currentAddress.photoDoor }
                     ].map((img, i) => (
                       <div key={i} className="space-y-1">
                         <div className="aspect-square bg-muted rounded-md flex items-center justify-center border border-border overflow-hidden relative group">
                           {img.src ? (
                             <img 
                               src={img.src} 
                               alt={img.label}
                               className="w-full h-full object-cover"
                             />
                           ) : (
                             <span className="text-[10px] text-muted-foreground text-center p-1">{t('success.noPhoto')} {img.label}</span>
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
                  <h3 className="font-semibold">{t('viewAddress.digitalLocationId')}: {currentAddress.digitalId}</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {t('success.scanQrCode')}
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
                    <p>{t('success.scanOrShare')}</p>
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
                    <Download className="w-4 h-4 me-2" /> {t('success.saveId')}
                  </Button>
                  <Link href={`/view/${currentAddress.digitalId}`}>
                    <Button className="w-full">
                      <Share2 className="w-4 h-4 me-2" /> {t('success.viewPage')}
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="pt-6 mt-2 border-t border-border/40 flex justify-center">
              <Link href="/add-address">
                <Button variant="outline">
                  <Plus className="w-4 h-4 me-2" /> {t('success.addAnotherAddress')}
                </Button>
              </Link>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
