const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method not allowed",
    };
  }

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecretKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Webhook is not configured.");
    }

    const signature = event.headers["x-paystack-signature"];

    const expectedSignature = crypto
      .createHmac("sha512", paystackSecretKey)
      .update(event.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return {
        statusCode: 401,
        body: "Invalid signature",
      };
    }

    const webhook = JSON.parse(event.body);

    if (webhook.event !== "charge.success") {
      return {
        statusCode: 200,
        body: "Event received",
      };
    }

    const reference = webhook.data.reference;

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const verifiedPayment = await verifyResponse.json();

    if (
      !verifyResponse.ok ||
      !verifiedPayment.status ||
      verifiedPayment.data.status !== "success"
    ) {
      throw new Error("Payment could not be verified.");
    }

    const paidAmount = Math.round(verifiedPayment.data.amount / 100);

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?payment_reference=eq.${encodeURIComponent(reference)}&payment_status=eq.pending&total=eq.${paidAmount}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          payment_status: "paid",
          status: "Paid",
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error("Could not update the order payment status.");
    }

    return {
      statusCode: 200,
      body: "Payment confirmed",
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: "Webhook error",
    };
  }
};
