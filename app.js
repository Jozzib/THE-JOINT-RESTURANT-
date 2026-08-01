const SUPABASE_URL = "https://vgznxqrcnofihvknkmfz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnem54cXJjbm9maWh2a25rbWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDAyODcsImV4cCI6MjEwMTExNjI4N30.xHB1roeWOuyH5L57C-hn-BDspr0X1I6HFsH_ulURWVo";

const database = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

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
];

let menu = defaultMenu;
let cart = JSON.parse(localStorage.getItem("joint-cart") || "[]");
let currentCategory = "All";
let categories = ["All", ...new Set(menu.map((item) => item.category))];

const money = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const grid = document.querySelector("#foodGrid");
const filters = document.querySelector("#filters");

function renderMenu() {
  filters.innerHTML = categories
    .map(
      (category) => `
        <button class="filter ${category === currentCategory ? "active" : ""}"
          data-category="${category}">
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
          <img class="food-image" src="${item.image}" alt="${item.name}" loading="lazy" />
          <span class="food-category">${item.category}</span>
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <div class="card-bottom">
            <span class="price">${money(item.price)}</span>
            <button class="add-button" data-id="${item.id}"
              aria-label="Add ${item.name} to order">+</button>
          </div>
        </article>
      `
    )
    .join("");
}

async function loadMenu() {
  const { data, error } = await database
    .from("menu_items")
    .select("*")
    .eq("available", true)
    .order("id");

  if (error) {
    console.error("Could not load menu:", error.message);
    return;
  }

  menu = data.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description,
    image: item.image,
  }));

  categories = ["All", ...new Set(menu.map((item) => item.category))];
  currentCategory = "All";
  renderMenu();
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
  if (!product) return;

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
}

function closeCart() {
  document.querySelector("#cartPanel").classList.remove("open");
  document.querySelector("#overlay").classList.remove("visible");
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
  if (!item) return;

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
};

document.querySelector(".close-checkout").onclick = () => {
  document.querySelector("#checkoutModal").classList.remove("open");
};

document.querySelector("#orderForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!cart.length) return;

  const button = event.target.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Sending order...";

  const form = new FormData(event.target);
  const customer = Object.fromEntries(form);

  const orderId =
    window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, "0")}`;

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  try {
    const { error: orderError } = await database.from("orders").insert({
      id: orderId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      delivery_address: customer.address,
      payment_method: customer.payment,
      total: total,
    });

    if (orderError) throw orderError;

    const orderItems = cart.map((item) => ({
      order_id: orderId,
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: itemsError } = await database
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    document.querySelector("#checkoutModal").classList.remove("open");

    document.querySelector("#successMessage").textContent =
      `Your order has been received. You chose ${customer.payment}. ` +
      `We will contact you shortly on ${customer.phone}.`;

    document.querySelector("#successModal").classList.add("open");

    cart = [];
    renderCart();
    event.target.reset();
  } catch (error) {
    alert(
      "We could not send your order. Please check your internet connection and try again."
    );
    console.error(error);
  } finally {
    button.disabled = false;
    button.innerHTML = "Place my order <span>→</span>";
  }
});

document.querySelector("#finishOrder").onclick = () => {
  document.querySelector("#successModal").classList.remove("open");
  document.querySelector("#menu").scrollIntoView();
};

renderMenu();
renderCart();
loadMenu();
