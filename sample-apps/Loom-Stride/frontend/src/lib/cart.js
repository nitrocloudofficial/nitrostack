import { showToast } from '../components/toast.js';

class CartManager {
  constructor() {
    this.storageKey = 'shoefit_cart_v1';
  }

  getCart() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveCart(cart) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('shoefit_cart_updated', { detail: cart }));
    } catch {
      // Storage full
    }
  }

  addToCart(shoe, sizeUs = 9.5) {
    const cart = this.getCart();
    const existingIdx = cart.findIndex((item) => item.id === shoe.id);

    if (existingIdx >= 0) {
      cart[existingIdx].quantity = (cart[existingIdx].quantity || 1) + 1;
    } else {
      cart.push({
        id: shoe.id || `${shoe.brand}-${shoe.model}`.toLowerCase().replace(/\s+/g, '-'),
        brand: shoe.brand,
        model: shoe.model,
        price_inr: shoe.price_inr || 5999,
        size_us: sizeUs,
        image_url: shoe.image_url,
        url: shoe.url,
        quantity: 1,
        addedAt: new Date().toISOString(),
      });
    }

    this.saveCart(cart);
    showToast(`Added ${shoe.brand} ${shoe.model} (US ${sizeUs}) to Cart!`, 'success');
  }

  removeFromCart(id) {
    let cart = this.getCart();
    cart = cart.filter((item) => item.id !== id);
    this.saveCart(cart);
    showToast('Item removed from cart', 'info');
  }

  clearCart() {
    this.saveCart([]);
  }

  getTotalCount() {
    const cart = this.getCart();
    return cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }

  getTotalPriceInr() {
    const cart = this.getCart();
    return cart.reduce((acc, item) => acc + (item.price_inr || 5999) * (item.quantity || 1), 0);
  }
}

export const cartManager = new CartManager();
