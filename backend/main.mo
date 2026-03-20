import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import Stripe "stripe/stripe";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OutCall "http-outcalls/outcall";

actor {
  include MixinStorage();

  type Price = {
    amount : Nat;
    currency : Text;
  };

  type PriceRange = {
    minAmount : Nat;
    maxAmount : Nat;
    currency : Text;
  };

  type FilterOptions = {
    category : ?Text;
    priceRange : ?PriceRange;
    searchQuery : ?Text;
    sortBy : ?Text;
  };

  type Product = {
    id : Text;
    name : Text;
    description : Text;
    price : Price;
    stockQuantity : Nat;
    category : Text;
    images : [Storage.ExternalBlob];
    sizes : [Text];
    colors : [Text];
  };

  type CartItem = {
    productId : Text;
    quantity : Nat;
    size : Text;
    color : Text;
  };

  type OrderItem = {
    productId : Text;
    quantity : Nat;
    size : Text;
    color : Text;
    price : Nat;
  };

  type CustomerInfo = {
    name : Text;
    email : Text;
    address : Text;
    city : Text;
    postalCode : Text;
    country : Text;
  };

  type Order = {
    id : Text;
    customerId : Principal;
    customerInfo : CustomerInfo;
    items : [OrderItem];
    totalAmount : Nat;
    status : Text;
    paymentStatus : Text;
    paymentMethod : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    phone : ?Text;
    address : ?Text;
  };

  let products = Map.empty<Text, Product>();
  let orders = Map.empty<Text, Order>();
  let carts = Map.empty<Principal, [CartItem]>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let accessControlState = AccessControl.initState();

  var stripeConfig : ?Stripe.StripeConfiguration = null;

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func addProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };
    products.add(product.id, product);
  };

  public shared ({ caller }) func updateProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update products");
    };
    products.add(product.id, product);
  };

  public shared ({ caller }) func deleteProduct(productId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete products");
    };
    products.remove(productId);
  };

  public shared ({ caller }) func uploadProductImage(productId : Text, image : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can upload product images");
    };
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        let newImages = product.images.concat([image]);
        let updatedProduct = {
          product with
          images = newImages
        };
        products.add(productId, updatedProduct);
      };
    };
  };

  public query ({ caller }) func getProducts(filterOptions : ?FilterOptions) : async [Product] {
    let filteredProducts = products.values().toArray();
    filteredProducts;
  };

  public query ({ caller }) func getProductById(productId : Text) : async ?Product {
    products.get(productId);
  };

  func getOrCreateCart(customerId : Principal) : [CartItem] {
    switch (carts.get(customerId)) {
      case (null) { [] };
      case (?cart) { cart };
    };
  };

  public shared ({ caller }) func addToCart(item : CartItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add items to cart");
    };
    let cart = getOrCreateCart(caller);
    let updatedCart = cart.concat([item]);
    carts.add(caller, updatedCart);
  };

  public shared ({ caller }) func removeFromCart(productId : Text, size : Text, color : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove items from cart");
    };
    let cart = getOrCreateCart(caller);
    let updatedCart = cart.filter(
      func(item) {
        not (item.productId == productId and item.size == size and item.color == color);
      }
    );
    carts.add(caller, updatedCart);
  };

  public shared ({ caller }) func clearCart() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear cart");
    };
    carts.add(caller, []);
  };

  public shared ({ caller }) func updateCartItemQuantity(productId : Text, size : Text, color : Text, quantity : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update cart items");
    };
    let cart = getOrCreateCart(caller);
    let updatedCart = cart;
    carts.add(caller, updatedCart);
  };

  public query ({ caller }) func getCart() : async [CartItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view cart");
    };
    getOrCreateCart(caller);
  };

  public shared ({ caller }) func checkout(customerInfo : CustomerInfo, cartItems : [CartItem], paymentMethod : ?Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can checkout");
    };

    if (cartItems.size() == 0) {
      Runtime.trap("Cart is empty. Cannot proceed to checkout.");
    };

    let orderId = "ORD-" # caller.toText() # "-" # Time.now().toText();

    let order = {
      id = orderId;
      customerId = caller;
      customerInfo;
      items = [];
      totalAmount = 0;
      status = "Pending";
      paymentStatus = "Pending";
      paymentMethod;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    orders.add(orderId, order);
    carts.remove(caller);

    orderId;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfig := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?value) { value };
    };
  };

  public query ({ caller }) func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Text, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update order status");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = {
          order with
          status;
          updatedAt = Time.now();
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func updatePaymentStatus(orderId : Text, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update payment status");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = {
          order with
          paymentStatus = status;
          updatedAt = Time.now();
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getUserOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    orders.values().toArray();
  };

  public query ({ caller }) func getAllOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all orders");
    };
    orders.values().toArray();
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
