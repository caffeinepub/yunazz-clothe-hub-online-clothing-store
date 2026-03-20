import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserProfile {
    name: string;
    email: string;
    address?: string;
    phone?: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface OrderItem {
    color: string;
    size: string;
    productId: string;
    quantity: bigint;
    price: bigint;
}
export interface Order {
    id: string;
    customerInfo: CustomerInfo;
    status: string;
    paymentStatus: string;
    paymentMethod?: string;
    createdAt: Time;
    updatedAt: Time;
    totalAmount: bigint;
    customerId: Principal;
    items: Array<OrderItem>;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Price {
    currency: string;
    amount: bigint;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface PriceRange {
    maxAmount: bigint;
    minAmount: bigint;
    currency: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface FilterOptions {
    sortBy?: string;
    priceRange?: PriceRange;
    category?: string;
    searchQuery?: string;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface CustomerInfo {
    country: string;
    city: string;
    postalCode: string;
    name: string;
    email: string;
    address: string;
}
export interface CartItem {
    color: string;
    size: string;
    productId: string;
    quantity: bigint;
}
export interface Product {
    id: string;
    stockQuantity: bigint;
    name: string;
    description: string;
    sizes: Array<string>;
    category: string;
    colors: Array<string>;
    price: Price;
    images: Array<ExternalBlob>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addProduct(product: Product): Promise<void>;
    addToCart(item: CartItem): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkout(customerInfo: CustomerInfo, cartItems: Array<CartItem>, paymentMethod: string | null): Promise<string>;
    clearCart(): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteProduct(productId: string): Promise<void>;
    getAllOrders(): Promise<Array<Order>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCart(): Promise<Array<CartItem>>;
    getProductById(productId: string): Promise<Product | null>;
    getProducts(filterOptions: FilterOptions | null): Promise<Array<Product>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserOrders(): Promise<Array<Order>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    removeFromCart(productId: string, size: string, color: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCartItemQuantity(productId: string, size: string, color: string, quantity: bigint): Promise<void>;
    updateOrderStatus(orderId: string, status: string): Promise<void>;
    updatePaymentStatus(orderId: string, status: string): Promise<void>;
    updateProduct(product: Product): Promise<void>;
    uploadProductImage(productId: string, image: ExternalBlob): Promise<void>;
}
