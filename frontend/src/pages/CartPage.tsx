import { useNavigate } from '@tanstack/react-router';
import { useGetCart, useRemoveFromCart, useGetProducts } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export default function CartPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: cart, isLoading: cartLoading } = useGetCart();
  const { data: products } = useGetProducts(null);
  const removeFromCart = useRemoveFromCart();

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-4">Please login to view your cart</h2>
        <Button onClick={() => navigate({ to: '/' })}>Go to Home</Button>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const cartItems = cart || [];
  const isEmpty = cartItems.length === 0;

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

  const handleRemove = async (productId: string, size: string, color: string) => {
    try {
      await removeFromCart.mutateAsync({ productId, size, color });
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
      console.error(error);
    }
  };

  if (isEmpty) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <img
          src="/assets/generated/empty-cart.dim_300x300.png"
          alt="Empty cart"
          className="w-64 h-64 mx-auto mb-6 opacity-50"
        />
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some items to get started!</p>
        <Button onClick={() => navigate({ to: '/' })}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item, index) => {
            const product = getProductDetails(item.productId);
            if (!product) return null;

            const price = Number(product.price.amount) / 100;
            const itemTotal = price * Number(item.quantity);
            const imageUrl = product.images[0]?.getDirectURL() || '/assets/generated/product-placeholder.dim_400x400.jpg';

            return (
              <Card key={`${item.productId}-${item.size}-${item.color}-${index}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Size: {item.size}</p>
                        <p>Color: {item.color}</p>
                        <p>Quantity: {item.quantity.toString()}</p>
                      </div>
                      <p className="font-semibold mt-2">
                        {product.price.currency} {itemTotal.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.productId, item.size, item.color)}
                      disabled={removeFromCart.isPending}
                    >
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">USD {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>USD {totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={() => navigate({ to: '/checkout' })}>
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
