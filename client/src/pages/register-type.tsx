import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Building2, ArrowLeft, ArrowRight } from "lucide-react";

export default function RegisterType() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Choose Account Type</h1>
          <p className="text-muted-foreground">
            Select the type of account you want to create
          </p>
        </div>

        <div className="grid gap-4">
          <Link href="/register">
            <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group" data-testid="card-individual-registration">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Individual Registration</CardTitle>
                    <CardDescription>
                      For personal delivery addresses
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pl-[72px]">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Register with your Iqama/National ID</li>
                  <li>• Add personal delivery addresses</li>
                  <li>• Set delivery preferences & fallback contacts</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/register/company">
            <Card className="cursor-pointer hover:shadow-lg hover:border-blue-500/50 transition-all group" data-testid="card-company-registration">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Company Registration</CardTitle>
                    <CardDescription>
                      For logistics & delivery companies
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pl-[72px]">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Register with your company unified number</li>
                  <li>• Access company dashboard</li>
                  <li>• Manage delivery operations</li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
