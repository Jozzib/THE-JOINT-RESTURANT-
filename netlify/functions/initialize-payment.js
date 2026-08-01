exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { email, items } = JSON.parse(event.body || "{}");

    if (!email || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email and order items are required." }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !paystackSecretKey) {
      throw new Error("Payment service is not configured.");
    }

    const itemIds = items.map((item) => Number(item.id)).filter(Boolean);

    // FIX: Removed &available=eq.true because the column does not exist in Supabase
    if (!menuResponse.ok) {
      const errorDetails = await menuResponse.text();
      console.error("Supabase Error:", errorDetails);
      throw new Error(`Supabase Error (${menuResponse.status}): ${errorDetails}`);
    }
        },
      }
    );

    if (!menuResponse.ok) {
      const errorDetails = await menuResponse.text();
      console.error("Supabase Error:", errorDetails);
      throw new Error("Could not check the menu prices.");
    }

    const menuItems = await menuResponse.json();
    const prices = new Map(menuItems.map((item) => [item.id, item.price]));

    let total = 0;

    for (const item of items) {
      const id = Number(item.id);
      const quantity = Number(item.quantity);

      if (!prices.has(id) || !Number.isInteger(quantity) || quantity < 1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "One or more items are no longer available.",
          }),
        };
      }

      total += prices.get(id) * quantity;
    }

    const reference = `TJR-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const websiteUrl =
      event.headers.origin || `https://${event.headers.host}`;

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: total * 100,
          currency: "NGN",
          reference,
          callback_url: `${websiteUrl}/?payment=success&reference=${reference}`,
        }),
      }
    );

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackResult.status) {
      throw new Error(
        paystackResult.message || "Could not start the payment."
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authorizationUrl: paystackResult.data.authorization_url,
        reference,
        total,
      }),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Could not start payment.",
      }),
    };
  }
};
