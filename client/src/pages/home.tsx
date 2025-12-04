import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ShieldCheck, Truck, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Secure Delivery
          </h1>
          <p className="text-muted-foreground text-lg">
            Register your profile and location for fast, accurate, and secure deliveries.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 text-left">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Optimized Logistics</h3>
                <p className="text-xs text-muted-foreground">Precise location mapping</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 text-left">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Visual Verification</h3>
                <p className="text-xs text-muted-foreground">Photo-based address confirmation</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <Link href="/register">
            <Button size="lg" className="w-full text-lg h-12 shadow-lg hover:shadow-xl transition-all duration-300 group">
              Start Registration
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
      
      <footer className="absolute bottom-6 text-center text-xs text-muted-foreground">
        &copy; 2025 Secure Logistics System. All rights reserved.
      </footer>
    </div>
  );
}
