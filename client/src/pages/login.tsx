import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { loginSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import type { LoginUser } from "@shared/schema";

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginUser) => {
    try {
      setError(null);
      await login(data);
      toast({
        title: "Welkom terug!",
        description: "Je bent succesvol ingelogd.",
      });
      setLocation("/");
    } catch (error: any) {
      const errorMessage = error.message || "Inloggen mislukt. Probeer opnieuw.";
      setError(errorMessage);
      toast({
        title: "Inloggen mislukt",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-fitness-light flex items-center justify-center px-4">
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
            <CardTitle className="text-center">Inloggen</CardTitle>
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
                            placeholder="Je wachtwoord"
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
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-fitness-blue hover:bg-blue-600"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "Inloggen..." : "Inloggen"}
                </Button>
              </form>
            </Form>

            <Separator className="my-6" />

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Nog geen account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-fitness-blue"
                  onClick={() => setLocation("/register")}
                >
                  Registreren
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials voor testing */}
        <Card className="mt-4 bg-gray-50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Demo Account</h3>
            <p className="text-xs text-gray-600">
              Email: demo@fitbuddy.com<br />
              Wachtwoord: demo123456
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}