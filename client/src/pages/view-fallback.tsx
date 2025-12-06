import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, MapPin, User, Clock, FileText, Home, Building2, DoorOpen, 
  Image, Users, Navigation, Calendar, AlertCircle, DollarSign, ArrowLeft
} from "lucide-react";
import { AddressMap } from "@/components/address-map";
import { PageNavigation } from "@/components/page-navigation";
import type { FallbackContact } from "@shared/schema";

export default function ViewFallback() {
  const { t } = useTranslation();
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
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 relative">
        <PageNavigation className="absolute top-4 left-4" />
        
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{t('fallback.contactNotFound')}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {t('fallback.contactNotFoundDesc')}
          </p>
          <Link href="/">
            <Button>
              <Home className="w-4 h-4 mr-2" /> {t('common.goHome')}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center py-8 relative">
      <PageNavigation className="absolute top-4 left-4" />
      
      <Card className="w-full max-w-2xl shadow-xl border-border/60 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/10 p-6 border-b border-border/40">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-2xl shrink-0 border-2 border-purple-300 dark:border-purple-700">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
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
            <div className="text-end space-y-1">
              {contact.distanceKm !== null && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                  <Navigation className="w-4 h-4" />
                  <span className="font-medium">{contact.distanceKm.toFixed(1)} km</span>
                </div>
              )}
              {contact.requiresExtraFee && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1">
                  <DollarSign className="w-3 h-3" /> {t('fallback.extraFeeRequired')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Location Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              {t('viewAddress.location')}
            </div>
            {contact.lat && contact.lng ? (
              <>
                <div className="rounded-lg overflow-hidden border border-border h-48 md:h-56">
                  <AddressMap 
                    readOnly 
                    initialLat={contact.lat} 
                    initialLng={contact.lng} 
                  />
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                  <MapPin className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{contact.textAddress}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('viewAddress.coordinates')}: {contact.lat.toFixed(6)}, {contact.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-border/50">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t('viewAddress.noLocation')}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Photos Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 uppercase tracking-wider">
              <Image className="w-4 h-4" />
              {t('viewAddress.photos')}
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { label: t('viewAddress.buildingView'), icon: Building2, src: contact.photoBuilding },
                { label: t('viewAddress.mainGate'), icon: DoorOpen, src: contact.photoGate },
                { label: t('viewAddress.flatDoor'), icon: Home, src: contact.photoDoor }
              ].map((img, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1 truncate">
                    <img.icon className="w-3 h-3 shrink-0" /> 
                    <span className="truncate">{img.label}</span>
                  </p>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden">
                    {img.src ? (
                      <img 
                        src={img.src} 
                        alt={img.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground p-2">
                        <Image className="w-6 h-6 mx-auto opacity-30" />
                        <p className="text-[8px] md:text-[10px] mt-1">{t('viewAddress.noPhoto')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              {t('viewAddress.details')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <User className="w-3.5 h-3.5" /> {t('fallback.relationship')}
                </div>
                <p className="font-medium text-foreground text-sm capitalize">
                  {contact.relationship || t('common.notSpecified')}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <Navigation className="w-3.5 h-3.5" /> {t('fallback.distance')}
                </div>
                <p className="font-medium text-foreground text-sm">
                  {contact.distanceKm !== null 
                    ? t('fallback.distanceFromPrimary', { distance: contact.distanceKm.toFixed(2) })
                    : t('fallback.notCalculated')}
                </p>
              </div>
            </div>

            {/* Scheduling Info for 3km+ contacts */}
            {contact.requiresExtraFee && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-900/30">
                <div className="flex items-center gap-2 text-xs font-medium text-orange-700 dark:text-orange-400 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" /> {t('fallback.extendedDistanceDelivery')}
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-muted-foreground text-xs">{t('fallback.scheduledDate')}:</span>
                    <span className="font-medium text-foreground text-xs">{contact.scheduledDate || t('fallback.notSet')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-muted-foreground text-xs">{t('fallback.timeSlot')}:</span>
                    <span className="font-medium text-foreground text-xs">{contact.scheduledTimeSlot || t('fallback.notSet')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-muted-foreground text-xs">{t('fallback.extraFee')}:</span>
                    <span className="font-medium text-foreground text-xs">
                      {contact.extraFeeAcknowledged ? t('fallback.acknowledged') : t('fallback.pending')}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {contact.specialNote && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                <div className="flex items-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                  <FileText className="w-3.5 h-3.5" /> {t('fallback.specialNotes')}
                </div>
                <p className="text-foreground text-sm">{contact.specialNote}</p>
              </div>
            )}
          </div>
        </CardContent>

        <Separator />

        {/* Footer */}
        <div className="p-4 md:p-6 bg-muted/30 flex justify-between items-center gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">
            <Users className="w-4 h-4 inline mr-1" />
            {t('fallback.fallbackContact')}
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> {t('common.backToDashboard')}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
