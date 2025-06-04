import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { registerSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Eye, EyeOff, Check } from "lucide-react";
import type { RegisterUser } from "@shared/schema";

export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, isRegistering } = useAuth();
  const { toast } = useToast();

  const form = useForm<RegisterUser>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");

  // Password strength validation
  const passwordRequirements = [
    { label: "Minimaal 8 karakters", met: password.length >= 8 },
    { label: "Bevat een hoofdletter", met: /[A-Z]/.test(password) },
    { label: "Bevat een kleine letter", met: /[a-z]/.test(password) },
    { label: "Bevat een cijfer", met: /\d/.test(password) },
  ];

  const onSubmit = async (data: RegisterUser) => {
    try {
      setError(null);
      await register(data);
      toast({
        title: "Account aangemaakt!",
        description: "Je account is succesvol aangemaakt. Welkom bij FitBuddy!",
      });
      setLocation("/profile-setup");
    } catch (error: any) {
      const errorMessage = error.message || "Registratie mislukt. Probeer opnieuw.";
      setError(errorMessage);
      toast({
        title: "Registratie mislukt",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-fitness-light flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-fitness-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-fitness-dark">FitBuddy</h1>
          <p className="text-gray-600">Vind je perfecte trainingspartner</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Account aanmaken</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volledige naam</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Je volledige naam"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jouw@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wachtwoord</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Kies een sterk wachtwoord"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      
                      {/* Password requirements */}
                      {password && (
                        <div className="mt-2 space-y-1">
                          {passwordRequirements.map((req, index) => (
                            <div key={index} className="flex items-center text-xs">
                              <Check 
                                className={`w-3 h-3 mr-1 ${
                                  req.met ? 'text-green-500' : 'text-gray-400'
                                }`} 
                              />
                              <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bevestig wachtwoord</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Herhaal je wachtwoord"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      
                      {/* Password match indicator */}
                      {confirmPassword && (
                        <div className="flex items-center text-xs mt-1">
                          <Check 
                            className={`w-3 h-3 mr-1 ${
                              password === confirmPassword ? 'text-green-500' : 'text-gray-400'
                            }`} 
                          />
                          <span className={password === confirmPassword ? 'text-green-600' : 'text-gray-500'}>
                            Wachtwoorden komen overeen
                          </span>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-fitness-blue hover:bg-blue-600"
                  disabled={isRegistering}
                >
                  {isRegistering ? "Account aanmaken..." : "Account aanmaken"}
                </Button>
              </form>
            </Form>

            <Separator className="my-6" />

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Heb je al een account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-fitness-blue"
                  onClick={() => setLocation("/login")}
                >
                  Inloggen
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Terms and privacy */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Door een account aan te maken ga je akkoord met onze{" "}
            <span className="text-fitness-blue">Algemene Voorwaarden</span> en{" "}
            <span className="text-fitness-blue">Privacyverklaring</span>
          </p>
        </div>
      </div>
    </div>
  );
}