import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetCart, useGetProducts, useCreateCheckoutSession } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { ShoppingItem } from '../backend';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: cart, isLoading: cartLoading } = useGetCart();
  const { data: products } = useGetProducts(null);
  const createCheckoutSession = useCreateCheckoutSession();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
  });

  if (!isAuthenticated) {
    navigate({ to: '/' });
    return null;
  }

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid lg:grid-cols-2 gap-8">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const cartItems = cart || [];
  if (cartItems.length === 0) {
    navigate({ to: '/cart' });
    return null;
  }

  const getProductDetails = (productId: string) => {
    return products?.find((p) => p.id === productId);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const product = getProductDetails(item.productId);
      if (product) {
        return total + Number(product.price.amount) * Number(item.quantity);
      }
      return total;
    }, 0);
  };

  const totalAmount = calculateTotal() / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.postalCode || !formData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const shoppingItems: ShoppingItem[] = cartItems.map((item) => {
        const product = getProductDetails(item.productId);
        if (!product) throw new Error('Product not found');

        return {
          productName: product.name,
          productDescription: `${product.description} (Size: ${item.size}, Color: ${item.color})`,
          priceInCents: product.price.amount,
          quantity: item.quantity,
          currency: product.price.currency,
        };
      });

      const session = await createCheckoutSession.mutateAsync(shoppingItems);
      window.location.href = session.url;
    } catch (error) {
      toast.error('Failed to create checkout session');
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cartItems.map((item, index) => {
                    const product = getProductDetails(item.productId);
                    if (!product) return null;

                    const price = Number(product.price.amount) / 100;
                    const itemTotal = price * Number(item.quantity);

                    return (
                      <div key={`${item.productId}-${index}`} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.size} / {item.color} × {item.quantity.toString()}
                          </p>
                        </div>
                        <span className="font-medium">${itemTotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={createCheckoutSession.isPending}>
                  {createCheckoutSession.isPending ? 'Processing...' : 'Pay with Stripe'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
