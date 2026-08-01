const defaultMenu = [
  {
    id: 1,
    name: "Jollof Rice & Chicken",
    category: "Rice",
    price: 4200,
    description: "Smoky jollof rice served with grilled chicken and plantain.",
    image:
      "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd8?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 2,
    name: "Pounded Yam & Egusi",
    category: "Swallow",
    price: 3800,
    description: "Smooth pounded yam with rich egusi soup and assorted meat.",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 3,
    name: "Ofada Rice Special",
    category: "Rice",
    price: 4500,
    description: "Local rice with our signature ayamase sauce and protein.",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 4,
    name: "Peppered Goat Meat",
    category: "Small Chops",
    price: 3500,
    description: "Tender goat meat tossed in a bold, spicy pepper sauce.",
    image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 5,
    name: "Fried Plantain & Eggs",
    category: "Breakfast",
    price: 2800,
    description: "Sweet fried plantain with fluffy scrambled eggs.",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 6,
    name: "Suya Chicken Wrap",
    category: "Quick Bites",
    price: 3200,
    description: "Spiced chicken, fresh vegetables and creamy sauce in a wrap.",
    image:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 7,
    name: "Zobo & Pineapple",
    category: "Drinks",
    price: 1200,
    description: "A chilled, refreshing house-made zobo blend.",
    image:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 8,
    name: "Meat Pie",
    category: "Quick Bites",
    price: 1000,
    description:
      "Flaky pastry filled with seasoned minced beef and vegetables.",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=80",
  },
];

let menu = JSON.parse(localStorage.getItem("joint-menu") || "null") || defaultMenu;
let cart = JSON.parse(localStorage.getItem("joint-cart") || "[]");
let currentCategory = "All";

const money = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const categories = ["All", ...new Set(menu.map((item) => item.category))];

const grid = document.querySelector("#foodGrid");
const filters = document.querySelector("#filters");

function renderMenu() {
  filters.innerHTML = categories
    .map(
      (category) => `
        <button
          class="filter ${category === currentCategory ? "active" : ""}"
          data-category="${category}"
        >
          ${category}
        </button>
      `
    )
    .join("");

  const foods =
    currentCategory === "All"
      ? menu
      : menu.filter((item) => item.category === currentCategory);

  grid.innerHTML = foods
    .map(
      (item) => `
        <article class="food-card">
          <img
            class="food-image"
            src="${item.image}"
            alt="${item.name}"
            loading="lazy"
          />
          <span class="food-category">${item.category}</span>
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <div class="card-bottom">
            <span class="price">${money(item.price)}</span>
            <button
              class="add-button"
              data-id="${item.id}"
              aria-label="Add ${item.name} to order"
            >
              +
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCart() {
  const cartItems = document.querySelector("#cartItems");

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  document.querySelector("#cartCount").textContent = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  document.querySelector("#cartTotal").textContent = money(total);

  document.querySelector("#cartFooter").style.display = cart.length
    ? "block"
    : "none";

  document.querySelector("#emptyCart").style.display = cart.length
    ? "none"
    : "block";

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <h3>${item.name}</h3>
            <p>${money(item.price)}</p>
            <div class="qty-control">
              <button data-action="decrease" data-id="${item.id}">−</button>
              <span>${item.quantity}</span>
              <button data-action="increase" data-id="${item.id}">+</button>
            </div>
          </div>
          <button class="remove" data-action="remove" data-id="${item.id}">
            Remove
          </button>
        </div>
      `
    )
    .join("");

  localStorage.setItem("joint-cart", JSON.stringify(cart));
}

function addToCart(id) {
  const product = menu.find((item) => item.id === id);
  const existing = cart.find((item) => item.id === id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  renderCart();
}

function openCart() {
  document.querySelector("#cartPanel").classList.add("open");
  document.querySelector("#overlay").classList.add("visible");
  document.querySelector("#cartPanel").setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.querySelector("#cartPanel").classList.remove("open");
  document.querySelector("#overlay").classList.remove("visible");
  document.querySelector("#cartPanel").setAttribute("aria-hidden", "true");
}

filters.addEventListener("click", (event) => {
  if (event.target.dataset.category) {
    currentCategory = event.target.dataset.category;
    renderMenu();
  }
});

grid.addEventListener("click", (event) => {
  if (event.target.dataset.id) {
    addToCart(Number(event.target.dataset.id));
  }
});

document.querySelector("#cartItems").addEventListener("click", (event) => {
  const id = Number(event.target.dataset.id);

  if (!id) return;

  const item = cart.find((cartItem) => cartItem.id === id);

  if (event.target.dataset.action === "increase") {
    item.quantity += 1;
  }

  if (event.target.dataset.action === "decrease") {
    item.quantity -= 1;
  }

  if (event.target.dataset.action === "remove" || item.quantity < 1) {
    cart = cart.filter((cartItem) => cartItem.id !== id);
  }

  renderCart();
});

document.querySelector("#openCart").onclick = openCart;
document.querySelector("#closeCart").onclick = closeCart;
document.querySelector("#overlay").onclick = closeCart;
document.querySelector("#browseMenu").onclick = closeCart;

document.querySelector("#checkout").onclick = () => {
  closeCart();

  document.querySelector("#checkoutModal").classList.add("open");
  document
    .querySelector("#checkoutModal")
    .setAttribute("aria-hidden", "false");
};

document.querySelector(".close-checkout").onclick = () => {
  document.querySelector("#checkoutModal").classList.remove("open");
};

document.querySelector("#orderForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = new FormData(event.target);

  const order = {
    id: `TJR-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleString("en-NG"),
    customer: Object.fromEntries(form),
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };

  const orders = JSON.parse(localStorage.getItem("joint-orders") || "[]");
  orders.unshift(order);

  localStorage.setItem("joint-orders", JSON.stringify(orders));

  document.querySelector("#checkoutModal").classList.remove("open");

  document.querySelector("#successMessage").textContent =
    `Your order ${order.id} has been received. ` +
    `You chose ${order.customer.payment}. We’ll contact you shortly.`;

  document.querySelector("#successModal").classList.add("open");

  cart = [];
  renderCart();
  event.target.reset();
});

document.querySelector("#finishOrder").onclick = () => {
  document.querySelector("#successModal").classList.remove("open");
  document.querySelector("#menu").scrollIntoView();
};

renderMenu();
renderCart();
