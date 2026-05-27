/**
 * Zwiggy Express - Core Application State Manager
 */
class CartManager {
    constructor() {
        this.cart = [];
        this.DOM = {
            dishGrid: document.querySelector('.dish-grid'),
            cartList: document.getElementById('cart-list'),
            cartBadge: document.getElementById('cart-badge'),
            totalPrice: document.getElementById('total-price'),
            addressInput: document.getElementById('address'),
            paymentSelect: document.getElementById('payment-method'),
            orderForm: document.getElementById('order-form')
        };

        this.init();
    }

    init() {
        // Event Delegation: One listener handles all "Add to Cart" actions smoothly
        if (this.DOM.dishGrid) {
            this.DOM.dishGrid.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.add-to-cart-btn');
                if (targetBtn) this.handleAddItem(targetBtn);
            });
        }

        // Event Delegation: Avoids inline execution by catching removal clicks natively
        if (this.DOM.cartList) {
            this.DOM.cartList.addEventListener('click', (e) => {
                const targetRemoveBtn = e.target.closest('.remove-btn');
                if (targetRemoveBtn) {
                    const index = parseInt(targetRemoveBtn.getAttribute('data-index'), 10);
                    this.handleRemoveItem(index);
                }
            });
        }

        // Exposing modern hook wrapper onto window namespace exclusively for backward layout compatibility
        window.placeOrder = () => this.executeCheckoutPipeline();
        
        this.render();
    }

    handleAddItem(button) {
        const name = button.getAttribute('data-item');
        const price = parseInt(button.getAttribute('data-price'), 10);
        const existingItem = this.cart.find(item => item.name === name);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({ name, price, quantity: 1 });
        }

        this.render();
        this.showToast(`Added ${name} to your basket`);
    }

    handleRemoveItem(index) {
        if (isNaN(index) || index < 0 || index >= this.cart.length) return;

        const item = this.cart[index];
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            this.cart.splice(index, 1);
        }

        this.render();
    }

    render() {
        if (!this.DOM.cartList) return;

        // Reset state container layout
        this.DOM.cartList.innerHTML = '';
        let aggregateTotal = 0;
        let runningItemCount = 0;

        if (this.cart.length === 0) {
            this.DOM.cartList.innerHTML = `<li class="empty-cart-placeholder">Your cart is empty</li>`;
            this.DOM.totalPrice.textContent = '₹0';
            this.DOM.cartBadge.textContent = '0 items';
            return;
        }

        this.cart.forEach((item, idx) => {
            aggregateTotal += item.price * item.quantity;
            runningItemCount += item.quantity;

            const listItem = document.createElement('li');
            listItem.className = 'dynamic-cart-item';
            listItem.innerHTML = `
                <div class="item-info">
                    <strong>${this.escapeHTML(item.name)}</strong>
                    <span class="item-multiplier">x${item.quantity}</span>
                    <br>
                    <small class="item-subtotal">₹${item.price * item.quantity}</small>
                </div>
                <button type="button" class="btn btn-secondary remove-btn" data-index="${idx}" aria-label="Remove ${this.escapeHTML(item.name)}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            this.DOM.cartList.appendChild(listItem);
        });

        this.DOM.totalPrice.textContent = `₹${aggregateTotal}`;
        this.DOM.cartBadge.textContent = `${runningItemCount} item${runningItemCount > 1 ? 's' : ''}`;
    }

    async executeCheckoutPipeline() {
        const address = this.DOM.addressInput.value.trim();
        const paymentMethod = this.DOM.paymentSelect.value;

        // Defense Assertions
        if (this.cart.length === 0) {
            this.showToast('Please add items to your cart first.', 'error');
            return;
        }

        if (!address) {
            this.showToast('Please enter a delivery address.', 'error');
            this.DOM.addressInput.focus();
            return;
        }

        const payload = {
            cart: this.cart,
            address: address,
            payment_method: paymentMethod
        };

        try {
            const response = await fetch('/place_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Array('Network connectivity issue caught.');
            const data = await response.json();

            if (data.message) {
                this.showToast('Order confirmed! Tracking info generated.', 'success');
                this.cart = [];
                this.render();
                if (this.DOM.orderForm) this.DOM.orderForm.reset();
            } else {
                this.showToast(data.error || 'Checkout initialization failed.', 'error');
            }
        } catch (error) {
            console.error('[Checkout Fail Handled]:', error);
            this.showToast('Failed to secure connection with processing servers.', 'error');
        }
    }

    /**
     * Helper Utilities for Application Hardening
     */
    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            // Elegant styling directly appended safely or captured via style sheets
            Object.assign(container.style, {
                position: 'fixed', bottom: '24px', right: '24px', 
                zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '8px'
            });
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-banner toast-${type}`;
        toast.textContent = message;
        
        // Premium default ambient toast properties
        Object.assign(toast.style, {
            background: type === 'success' ? '#1C1C24' : '#C62828',
            color: '#FFFFFF', padding: '12px 20px', borderRadius: '8px',
            fontSize: '0.9rem', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateY(20px)', opacity: '0', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
        });

        container.appendChild(toast);
        
        // Force Reflow & Animate entry
        setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 10);
        // Fade exit handling lifecycle
        setTimeout(() => {
            toast.style.transform = 'translateY(-20px)'; toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// Instantiate App Layer once DOM lifecycle ready
document.addEventListener('DOMContentLoaded', () => new CartManager());

// static/script.js

/* ==========================================================================
   1. GLOBAL ENGINE CONFIGURATION & THEME CONSTANTS
   ========================================================================== */
const THEME = {
    orangeMain: '#ff5200',
    orangeMuted: 'rgba(255, 82, 0, 0.85)',
    gradientEnd: 'rgba(255, 82, 0, 0.02)',
    textMain: '#1a1a1a',
    textMuted: '#64748b',
    borderColor: '#f1e9e3',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    palette: ['#ff5200', '#ff7332', '#ff9466', '#ffb599', '#ffd6cc']
};

// Apply structural baseline overrides to all Chart instances
Chart.defaults.font.family = THEME.fontFamily;
Chart.defaults.font.color = THEME.textMuted;
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false; // Tilted toward clean layout headers instead of repetitive legends
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false; // Core mechanic for fixed viewport containment

// Shared reusable grid scale config for standard layouts
const sharedScales = {
    x: {
        grid: { display: false },
        ticks: { color: THEME.textMuted, font: { weight: 500 } }
    },
    y: {
        grid: { color: THEME.borderColor, drawTicks: false },
        ticks: { color: THEME.textMuted, padding: 8 },
        border: { dash: [4, 4], color: THEME.borderColor }
    }
};

/* ==========================================================================
   2. CHART INITIALIZATION MATRIX
   ========================================================================== */

// --- USER REVENUE BAR CHART ---
new Chart(document.getElementById("userRevenueChart"), {
    type: "bar",
    data: {
        labels: ["Karthik", "Vikram", "Arjun", "Meera", "Rahul", "Divya", "Anjali", "Priya"],
        datasets: [{
            data: [620, 510, 450, 430, 390, 340, 290, 220],
            backgroundColor: THEME.orangeMain,
            hoverBackgroundColor: THEME.orangeMuted,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 16
        }]
    },
    options: {
        scales: sharedScales
    }
});

// --- DATE REVENUE LINE CHART ---
new Chart(document.getElementById("dateChart"), {
    type: "line",
    data: {
        labels: ["20 May", "21 May", "22 May", "23 May", "24 May"],
        datasets: [{
            data: [670, 530, 910, 850, 610],
            borderColor: THEME.orangeMain,
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: THEME.orangeMain,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
            // Creates premium fading glow structural element beneath data curve
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                gradient.addColorStop(0, 'rgba(255, 82, 0, 0.2)');
                gradient.addColorStop(1, THEME.gradientEnd);
                return gradient;
            }
        }]
    },
    options: {
        scales: sharedScales
    }
});

// --- PAYMENT METRICS DONUT CHART ---
new Chart(document.getElementById("paymentChart"), {
    type: "doughnut",
    data: {
        labels: ["UPI", "Card", "Cash"],
        datasets: [{
            data: [1540, 1340, 690],
            backgroundColor: [THEME.palette[0], THEME.palette[1], THEME.palette[2]],
            borderWidth: 4,
            borderColor: '#ffffff',
            hoverOffset: 4
        }]
    },
    options: {
        cutout: '75%', // Sleeker, more premium metric frame width
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 16,
                    font: { weight: 600 }
                }
            }
        }
    }
});

// --- RESTAURANT HORIZONTAL BAR CHART ---
new Chart(document.getElementById("restaurantChart"), {
    type: "bar",
    data: {
        labels: ["Dominos", "Hotel Saravana", "A2B", "Barbeque Nation", "SS Hyderabad"],
        datasets: [{
            data: [820, 500, 430, 390, 360],
            backgroundColor: THEME.orangeMain,
            hoverBackgroundColor: THEME.orangeMuted,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 14
        }]
    },
    options: {
        indexAxis: 'y',
        scales: {
            x: {
                grid: { color: THEME.borderColor },
                border: { dash: [4, 4], color: THEME.borderColor },
                ticks: { color: THEME.textMuted }
            },
            y: {
                grid: { display: false },
                ticks: { color: THEME.textMuted, font: { weight: 600 } }
            }
        }
    }
});

// --- ITEMS RANKING BAR CHART ---
new Chart(document.getElementById("itemChart"), {
    type: "bar",
    data: {
        labels: ["Chicken", "Pizza", "Burger", "Biryani", "Dosa", "Fries"],
        datasets: [{
            data: [500, 420, 380, 310, 220, 150],
            backgroundColor: THEME.orangeMain,
            hoverBackgroundColor: THEME.orangeMuted,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 12
        }]
    },
    options: {
        scales: sharedScales
    }
});