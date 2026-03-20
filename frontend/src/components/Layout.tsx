import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCart, useGetCallerUserProfile } from '../hooks/useQueries';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useQueryClient } from '@tanstack/react-query';

export default function Layout() {
  const navigate = useNavigate();
  const { identity, login, clear, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const { data: cart } = useGetCart();
  const { data: userProfile } = useGetCallerUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const cartItemCount = cart?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      navigate({ to: '/' });
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Admin', path: '/admin', adminOnly: true },
  ];

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => {
        if (item.adminOnly && !isAuthenticated) return null;
        return (
          <button
            key={item.path}
            onClick={() => {
              navigate({ to: item.path });
              if (mobile) setMobileMenuOpen(false);
            }}
            className={`${
              mobile ? 'block w-full text-left px-4 py-3' : 'px-4 py-2'
            } text-sm font-medium transition-colors hover:text-primary ${
              currentPath === item.path ? 'text-primary' : 'text-foreground/80'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <img src="/assets/generated/yunazz-logo-transparent.dim_200x200.png" alt="Yunazz Logo" className="h-10 w-10" />
              <span className="text-xl font-bold tracking-tight">Yunazz Clothe Hub</span>
            </button>

            <nav className="hidden md:flex items-center space-x-1">
              <NavLinks />
            </nav>

            <div className="flex items-center space-x-2">
              {isAuthenticated && userProfile && (
                <div className="hidden md:flex items-center space-x-2 mr-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{userProfile.name}</span>
                </div>
              )}

              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: '/cart' })}
                  className="relative"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              )}

              <Button
                onClick={handleAuth}
                disabled={loginStatus === 'logging-in'}
                variant={isAuthenticated ? 'outline' : 'default'}
                size="sm"
                className="hidden md:flex"
              >
                {loginStatus === 'logging-in' ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login'}
              </Button>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <div className="flex flex-col space-y-4 mt-8">
                    {isAuthenticated && userProfile && (
                      <div className="flex items-center space-x-2 px-4 py-2 bg-muted rounded-lg">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">{userProfile.name}</span>
                      </div>
                    )}
                    <nav className="flex flex-col">
                      <NavLinks mobile />
                    </nav>
                    <Button
                      onClick={() => {
                        handleAuth();
                        setMobileMenuOpen(false);
                      }}
                      disabled={loginStatus === 'logging-in'}
                      variant={isAuthenticated ? 'outline' : 'default'}
                      className="w-full"
                    >
                      {loginStatus === 'logging-in' ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login'}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <img src="/assets/generated/yunazz-logo-transparent.dim_200x200.png" alt="Yunazz Logo" className="h-8 w-8" />
              <span className="text-sm font-medium">Yunazz Clothe Hub</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2025. Built with ❤️ using{' '}
              <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline">
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
