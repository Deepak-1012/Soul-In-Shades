require("dotenv").config();
console.log("MAIL_ID:", process.env.MAIL_ID);
console.log("PASSWORD EXISTS:", !!process.env.EMAIL_PASSWORD);
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");

const app = express();

const PINCODE_API = "https://api.pincodeapi.in/api/v1/pincode";
const ORIGIN_PINCODE = "530052";

const haversine = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
};

const getFirstPincodeRecord = async (pincode) => {
  const response = await fetch(`${PINCODE_API}/${pincode}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Pincode API error", {
      pincode,
      status: response.status,
      body: body.slice(0, 300),
    });
    throw new Error(`Pincode lookup failed with status ${response.status}`);
  }

  const result = await response.json();
  const record =
    result?.status === "success"
      ? result.data?.find(
          (item) =>
            item.latitude !== null &&
            item.longitude !== null &&
            item.latitude !== "" &&
            item.longitude !== "" &&
            Number.isFinite(Number(item.latitude)) &&
            Number.isFinite(Number(item.longitude)),
        )
      : null;
  if (
    !record ||
    !Number.isFinite(record.latitude) ||
    !Number.isFinite(record.longitude)
  ) {
    throw new Error("No coordinates found for this pincode");
  }

  return {
    ...record,
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
  };
};

const getDeliveryCharge = (distanceKm) => {
  if (distanceKm <= 20) return 35;
  if (distanceKm < 100) return 50;
  if (distanceKm < 200) return 70;
  if (distanceKm < 1000) return 100;
  if (distanceKm < 2000) return 200;
  return null;
};

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Your old simple website files
app.use(express.static(path.join(__dirname, "../public")));

// Gmail setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Gallery
app.get("/gallery", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/gallery.html"));
});

// Reviews
app.get("/reviews", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/reviews.html"));
});

// Order email
app.post("/", async (req, res) => {
  try {
    const {
      name,
      persons,
      number,
      mail,
      add,
      pincode,
      img,
      tid,
      total_charge: _clientTotalCharge,
      delivery_charge: _clientDeliveryCharge,
      base_charge: _clientBaseCharge,
    } = req.body;

    if (!/^\d{6}$/.test(String(pincode || ""))) {
      return res.status(400).json({ success: false, error: "Invalid pincode" });
    }

    const personCount = Number(persons);
    if (![1, 2].includes(personCount)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid person count" });
    }

    const [origin, destination] = await Promise.all([
      getFirstPincodeRecord(ORIGIN_PINCODE),
      getFirstPincodeRecord(String(pincode)),
    ]);
    const distanceKm =
      haversine(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
      ) * 0.25;
    const calculatedDeliveryCharge = getDeliveryCharge(distanceKm);

    if (calculatedDeliveryCharge === null) {
      return res.status(400).json({
        success: false,
        error: "Delivery is unavailable beyond 2000 km",
      });
    }

    const calculatedBaseCharge = personCount * 100;
    const calculatedTotalCharge =
      calculatedBaseCharge + calculatedDeliveryCharge;
    const total_charge = calculatedTotalCharge;
    const delivery_charge = calculatedDeliveryCharge;
    const base_charge = calculatedBaseCharge;

    const message = `
📦 New Soul In Shades Order

Name: ${name}
Email: ${mail}
Phone: ${number}

Address:
${add}

Pincode:
${pincode}

Persons:
${persons}

Transaction ID:
${tid}

Distance:
${distanceKm.toFixed(1)} km

Base Price:
₹${base_charge}

Delivery:
₹${delivery_charge}

Total:
₹${total_charge}
`;

    const base64Data = img.includes("base64,") ? img.split("base64,")[1] : img;

    const info = await transporter.sendMail({
      from: process.env.MAIL_ID,
      to: [mail, process.env.MAIL_ID],
      subject: "🧾 Soul In Shades Order Confirmation",
      text: message,
      attachments: [
        {
          filename: "customer-photo.jpg",
          content: base64Data,
          encoding: "base64",
        },
      ],
    });

    console.log("Mail sent:", info.response);

    res.json({
      success: true,
      message: "Order email sent",
      distanceKm: Number(distanceKm.toFixed(1)),
      deliveryCharge: calculatedDeliveryCharge,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      error: "Email failed",
    });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
