import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, Clock, FileText, QrCode, Home, Building2, DoorOpen, Image, Truck, Package, AlertTriangle, Navigation } from "lucide-react";
import { AddressMap } from "@/components/address-map";
import { PageNavigation } from "@/components/page-navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PhotoGallery } from "@/components/photo-gallery";

interface ViewAddressProps {
  isInternalAccess?: boolean;
}

export default function ViewAddress({ isInternalAccess = false }: ViewAddressProps) {
  const { t } = useTranslation();
  const [, params] = useRoute("/view/:digitalId");
  const digitalId = params?.digitalId;

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/address/${digitalId}`],
    enabled: !!digitalId,
    retry: false,
  });

  const { data: pendingLookupData } = useQuery<any>({
    queryKey: [`/api/address/${digitalId}/pending-lookup`],
    enabled: !!digitalId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[5%] right-[10%] w-[350px] h-[350px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[15%] left-[5%] w-[250px] h-[250px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <PageNavigation className="absolute top-4 start-4 z-10" />
        <div className="absolute top-4 end-4 z-10">
          <LanguageSwitcher />
        </div>
        
        <Card className="w-full max-w-md p-8 text-center border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm relative z-10">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{t('viewAddress.addressNotFound')}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {t('viewAddress.digitalIdNotExist', { digitalId })}
          </p>
          <Link href="/">
            <Button>
              <Home className="w-4 h-4 me-2" /> {t('notFound.goHome')}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { address, user } = data;
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 flex items-center justify-center py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[5%] w-[400px] h-[400px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[15%] left-[5%] text-primary/5 float-animation">
          <Truck className="w-14 h-14" />
        </div>
        <div className="absolute bottom-[25%] right-[5%] text-primary/5 float-animation" style={{ animationDelay: '2s' }}>
          <Package className="w-10 h-10" />
        </div>
      </div>
      
      <PageNavigation className="absolute top-4 start-4 z-10" />
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-2xl shadow-xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm overflow-hidden relative z-10">
        <div className="bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/5 dark:to-blue-900/10 p-6 border-b border-border/40">
          <div className="flex items-center justify-between gap-4 flex-wrap">
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
            <div className="text-end">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('viewAddress.digitalLocationId')}</p>
              <p className="text-lg font-mono font-bold text-primary tracking-widest">{address.digitalId}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Location Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              {t('viewAddress.location')}
            </div>
            <div className="rounded-lg overflow-hidden border border-border h-48 md:h-56">
              <AddressMap 
                readOnly 
                initialLat={address.lat ?? undefined} 
                initialLng={address.lng ?? undefined} 
              />
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">{address.textAddress}</p>
                {address.lat && address.lng && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('viewAddress.coordinates')}: {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Photos Section */}
          <PhotoGallery 
            photos={{
              building: address.photoBuilding,
              gate: address.photoGate,
              door: address.photoDoor
            }}
          />

          <Separator />

          {/* Instructions Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              {t('viewAddress.instructions')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" /> {t('viewAddress.preferredTime')}
                </div>
                <p className="font-medium text-foreground text-sm capitalize">
                  {address.preferredTime || t('viewAddress.notSpecified')}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <Home className="w-3.5 h-3.5" /> {t('viewAddress.ifNotHome')}
                </div>
                <p className="font-medium text-foreground text-sm capitalize">
                  {address.fallbackOption === "door" ? t('viewAddress.leaveAtDoor') :
                   address.fallbackOption === "neighbor" ? t('viewAddress.leaveWithNeighbor') :
                   address.fallbackOption === "call" ? t('viewAddress.callReschedule') :
                   address.fallbackOption === "security" ? t('viewAddress.leaveWithSecurity') :
                   address.fallbackOption || t('viewAddress.notSpecified')}
                </p>
              </div>
            </div>
            
            {address.specialNote && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                <div className="flex items-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                  <FileText className="w-3.5 h-3.5" /> {t('viewAddress.specialNotes')}
                </div>
                <p className="text-foreground text-sm">{address.specialNote}</p>
              </div>
            )}
          </div>

          {/* Driver Actions Section - Shows only on static link access when there's a pending delivery */}
          {!isInternalAccess && pendingLookupData?.hasPendingLookup && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
                  <Truck className="w-4 h-4" />
                  {t('viewAddress.driverActions')}
                </div>
                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{t('viewAddress.deliveryIssue')}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t('viewAddress.deliveryIssueDesc')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/driver-feedback/${pendingLookupData.lookup.id}`}>
                          <Button data-testid="button-report-issue">
                            <AlertTriangle className="w-4 h-4 me-2" />
                            {t('viewAddress.reportDeliveryIssue')}
                          </Button>
                        </Link>
                        {pendingLookupData.hasAlternateLocations && (
                          <Link href={`/driver-feedback/${pendingLookupData.lookup.id}`}>
                            <Button variant="outline" data-testid="button-get-alternate">
                              <Navigation className="w-4 h-4 me-2" />
                              {t('viewAddress.getAlternateLocation')}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="p-4 md:p-6 bg-muted/30">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-lg shadow-sm border">
                <QRCode 
                  value={currentUrl} 
                  size={120}
                  level="M"
                />
              </div>
              <div className="text-center md:text-start flex-1">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">{t('viewAddress.scanToShare')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('viewAddress.shareQrCode')}
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
