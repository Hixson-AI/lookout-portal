import { login } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function Login() {
  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg p-4">
      <div className="w-full max-w-md fade-in">
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm card-elevated">
          <CardHeader className="text-center pb-2">
            <img
              src="/assets/logos/lukout_mark.svg"
              alt="lukout"
              className="mx-auto mb-4 w-16 h-16 rounded-2xl shadow-lg"
            />
            <CardTitle className="text-3xl font-bold text-gradient">
              lukout Portal
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2">
              Admin dashboard for the lukout platform
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <Button 
              onClick={handleLogin} 
              className="w-full h-12 text-base font-semibold btn-gradient shadow-lg hover:shadow-xl"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
        <p className="text-center text-white/70 text-sm mt-6">
          Secure authentication powered by Google OAuth
        </p>
      </div>
    </div>
  );
}
