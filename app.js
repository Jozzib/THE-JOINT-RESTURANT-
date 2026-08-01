const SUPABASE_URL = "https://vgznxqrcnofihvknkmfz.supabase.co";
const SUPABASE_ANON_KEY = "
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnem54cXJjbm9maWh2a25rbWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDAyODcsImV4cCI6MjEwMTExNjI4N30.xHB1roeWOuyH5L57C-hn-BDspr0X1I6HFsH_ulURWVo";

const database = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let menu = [];
let cart = JSON.parse(localStorage.getItem("joint-cart") || "[]");
let currentCategory = "All";
let categories = ["All"];

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

  grid.innerHTML = foods.length
    ? foods
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
        .join("")
    : `<p>No food is available at the moment. Please check back soon.</p>`;
}

async function loadMenu() {
  const { data, error } = await database
    .from("menu_items")
    .select("*")
    .eq("available", true)
    .order("id");

  if (error) {
    console.error("Could not load menu:", error.message);
    grid.innerHTML = `<p>We could not load the menu. Please refresh the page.</p>`;
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

  if (event.target.dataset.action === "increase") item.quantity += 1;
  if (event.target.dataset.action === "decrease") item.quantity -= 1;

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
  const originalButtonText = button.innerHTML;
  button.disabled = true;
  button.textContent = "Processing order...";

  const customer = Object.fromEntries(new FormData(event.target));
  const orderId = window.crypto.randomUUID();
  let paymentReference = null;
  let paymentStatus = "not_required";
  let total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  let paymentUrl = null;

  try {
    if (customer.payment === "Pay Online") {
      const paymentResponse = await fetch(
        "/.netlify/functions/initialize-payment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: customer.email,
            items: cart.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
          }),
        }
      );

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || "Could not start payment.");
      }

      paymentReference = paymentData.reference;
      paymentStatus = "pending";
      total = paymentData.total;
      paymentUrl = paymentData.authorizationUrl;
    }

    const { error: orderError } = await database.from("orders").insert({
      id: orderId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      delivery_address: customer.address,
      payment_method: customer.payment,
      payment_reference: paymentReference,
      payment_status: paymentStatus,
      total,
    });

    if (orderError) throw orderError;

    const { error: itemsError } = await database.from("order_items").insert(
      cart.map((item) => ({
        order_id: orderId,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }))
    );

    if (itemsError) throw itemsError;

    cart = [];
    renderCart();
    event.target.reset();

    if (paymentUrl) {
      window.location.href = paymentUrl;
      return;
    }

    document.querySelector("#checkoutModal").classList.remove("open");
    document.querySelector("#successMessage").textContent =
      `Your order has been received. You chose Pay on Delivery. ` +
      `We will contact you shortly on ${customer.phone}.`;
    document.querySelector("#successModal").classList.add("open");
  } catch (error) {
    console.error(error);
    alert(error.message || "We could not send your order. Please try again.");
  } finally {
    button.disabled = false;
    button.innerHTML = originalButtonText;
  }
});

document.querySelector("#finishOrder").onclick = () => {
  document.querySelector("#successModal").classList.remove("open");
  document.querySelector("#menu").scrollIntoView();
};

const search = new URLSearchParams(window.location.search);

if (search.get("payment") === "success") {
  setTimeout(() => {
    alert("Thank you. We are confirming your payment now.");
  }, 500);

  window.history.replaceState({}, document.title, window.location.pathname);
}

renderCart();
loadMenu();
