import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useGetProducts,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
  useIsCallerAdmin,
  useIsStripeConfigured,
  useSetStripeConfiguration,
} from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob, type Product } from '../backend';

export default function AdminPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: products, isLoading: productsLoading } = useGetProducts(null);
  const { data: stripeConfigured, isLoading: stripeLoading } = useIsStripeConfigured();

  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const setStripeConfig = useSetStripeConfiguration();

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    stockQuantity: '',
    category: '',
    sizes: '',
    colors: '',
  });

  const [stripeForm, setStripeForm] = useState({
    secretKey: '',
    allowedCountries: 'US,CA,GB',
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Please login to access admin panel</h2>
        <Button onClick={() => navigate({ to: '/' })}>Go to Home</Button>
      </div>
    );
  }

  if (adminLoading || stripeLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You don't have permission to access this page</p>
        <Button onClick={() => navigate({ to: '/' })}>Go to Home</Button>
      </div>
    );
  }

  const resetProductForm = () => {
    setProductForm({
      id: '',
      name: '',
      description: '',
      price: '',
      currency: 'USD',
      stockQuantity: '',
      category: '',
      sizes: '',
      colors: '',
    });
    setImageFiles([]);
    setEditingProduct(null);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description,
      price: (Number(product.price.amount) / 100).toString(),
      currency: product.price.currency,
      stockQuantity: product.stockQuantity.toString(),
      category: product.category,
      sizes: product.sizes.join(', '),
      colors: product.colors.join(', '),
    });
    setProductDialogOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles([...imageFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productForm.name || !productForm.price || !productForm.stockQuantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const images: ExternalBlob[] = [];
      for (const file of imageFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        images.push(ExternalBlob.fromBytes(uint8Array));
      }

      const productData: Product = {
        id: editingProduct ? editingProduct.id : `PROD-${Date.now()}`,
        name: productForm.name,
        description: productForm.description,
        price: {
          amount: BigInt(Math.round(parseFloat(productForm.price) * 100)),
          currency: productForm.currency,
        },
        stockQuantity: BigInt(productForm.stockQuantity),
        category: productForm.category,
        sizes: productForm.sizes.split(',').map((s) => s.trim()).filter(Boolean),
        colors: productForm.colors.split(',').map((c) => c.trim()).filter(Boolean),
        images: editingProduct ? [...editingProduct.images, ...images] : images,
      };

      if (editingProduct) {
        await updateProduct.mutateAsync(productData);
        toast.success('Product updated successfully');
      } else {
        await addProduct.mutateAsync(productData);
        toast.success('Product added successfully');
      }

      setProductDialogOpen(false);
      resetProductForm();
    } catch (error) {
      toast.error('Failed to save product');
      console.error(error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteProduct.mutateAsync(productId);
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
      console.error(error);
    }
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripeForm.secretKey || !stripeForm.allowedCountries) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await setStripeConfig.mutateAsync({
        secretKey: stripeForm.secretKey,
        allowedCountries: stripeForm.allowedCountries.split(',').map((c) => c.trim()),
      });
      toast.success('Stripe configuration saved');
      setStripeDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save Stripe configuration');
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => navigate({ to: '/' })} variant="outline">
          Back to Store
        </Button>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Product Management</CardTitle>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetProductForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Input
                          id="category"
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={productForm.currency}
                          onChange={(e) => setProductForm({ ...productForm, currency: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stock">Stock *</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={productForm.stockQuantity}
                          onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sizes">Sizes (comma-separated)</Label>
                        <Input
                          id="sizes"
                          value={productForm.sizes}
                          onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                          placeholder="S, M, L, XL"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="colors">Colors (comma-separated)</Label>
                        <Input
                          id="colors"
                          value={productForm.colors}
                          onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })}
                          placeholder="Black, White, Blue"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="images">Product Images</Label>
                      <Input id="images" type="file" accept="image/*" multiple onChange={handleImageUpload} />
                      {imageFiles.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {imageFiles.map((file, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={addProduct.isPending || updateProduct.isPending}>
                        {addProduct.isPending || updateProduct.isPending ? 'Saving...' : 'Save Product'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setProductDialogOpen(false);
                          resetProductForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : products && products.length > 0 ? (
                <div className="space-y-4">
                  {products.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={product.images[0]?.getDirectURL() || '/assets/generated/product-placeholder.dim_400x400.jpg'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{product.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">{product.category}</Badge>
                                  <span className="text-sm font-medium">
                                    {product.price.currency} {(Number(product.price.amount) / 100).toFixed(2)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">Stock: {product.stockQuantity.toString()}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  disabled={deleteProduct.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No products yet. Add your first product!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Payment Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {stripeConfigured ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Configured</Badge>
                    <p className="text-sm text-muted-foreground">Stripe payment is configured and ready to use</p>
                  </div>
                  <Dialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Update Configuration</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Stripe Configuration</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleStripeSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="secretKey">Stripe Secret Key *</Label>
                          <Input
                            id="secretKey"
                            type="password"
                            value={stripeForm.secretKey}
                            onChange={(e) => setStripeForm({ ...stripeForm, secretKey: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="countries">Allowed Countries (comma-separated) *</Label>
                          <Input
                            id="countries"
                            value={stripeForm.allowedCountries}
                            onChange={(e) => setStripeForm({ ...stripeForm, allowedCountries: e.target.value })}
                            placeholder="US, CA, GB"
                            required
                          />
                        </div>
                        <Button type="submit" disabled={setStripeConfig.isPending}>
                          {setStripeConfig.isPending ? 'Saving...' : 'Save Configuration'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Stripe payment is not configured. Please set up your Stripe credentials to enable payments.
                  </p>
                  <Dialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>Configure Stripe</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configure Stripe Payment</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleStripeSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="secretKey">Stripe Secret Key *</Label>
                          <Input
                            id="secretKey"
                            type="password"
                            value={stripeForm.secretKey}
                            onChange={(e) => setStripeForm({ ...stripeForm, secretKey: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="countries">Allowed Countries (comma-separated) *</Label>
                          <Input
                            id="countries"
                            value={stripeForm.allowedCountries}
                            onChange={(e) => setStripeForm({ ...stripeForm, allowedCountries: e.target.value })}
                            placeholder="US, CA, GB"
                            required
                          />
                        </div>
                        <Button type="submit" disabled={setStripeConfig.isPending}>
                          {setStripeConfig.isPending ? 'Saving...' : 'Save Configuration'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
