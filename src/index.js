require("dotenv").config();
console.log("MAIL_ID:", process.env.MAIL_ID);
console.log("PASSWORD EXISTS:", !!process.env.EMAIL_PASSWORD);
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");

const app = express();

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

    let calculatedDeliveryCharge;
    if (String(pincode).startsWith("530") || String(pincode).startsWith("531")) {
      calculatedDeliveryCharge = 35;
    } else if (
      String(pincode).startsWith("51") ||
      String(pincode).startsWith("52") ||
      String(pincode).startsWith("53")
    ) {
      calculatedDeliveryCharge = 45;
    } else {
      calculatedDeliveryCharge = 65;
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
