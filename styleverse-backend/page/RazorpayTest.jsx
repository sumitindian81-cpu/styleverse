import api from "../utils/api"; // tumhara axios instance (baseURL backend)
import { useState } from "react";

export default function RazorpayTest() {
  const [addressId, setAddressId] = useState("6a6f51eb4456f545d89ec7a7");

  const startPayment = async () => {
    // 1) create-order
    const res = await api.post("/payments/razorpay/create-order", { addressId });
    const { razorpayKeyId, razorpayOrderId, amountInPaise, currency } = res.data.data;

    // 2) open checkout
    const options = {
      key: razorpayKeyId,
      amount: amountInPaise,
      currency,
      name: "Styleverse",
      description: "Test Payment",
      order_id: razorpayOrderId,
      handler: async function (response) {
        // 3) verify
        const verifyRes = await api.post("/payments/razorpay/verify", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          addressId,
        });

        alert("Payment Verified. Order Created: " + verifyRes.data.data.order._id);
      },
      theme: { color: "#111827" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Razorpay Test</h2>
      <input
        value={addressId}
        onChange={(e) => setAddressId(e.target.value)}
        style={{ width: "420px" }}
      />
      <br /><br />
      <button onClick={startPayment}>Pay Now</button>
    </div>
  );
}