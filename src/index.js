const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.get("/", (req, res) => {
  return res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/gallery", (req, res) => {
  return res.sendFile(path.join(__dirname, "../public/gallery.html"));
});

app.get("/reviews", (req, res) => {
  return res.sendFile(path.join(__dirname, "../public/reviews.html"));
});


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
      total_charge,
      delivery_charge,
      base_charge,
    } = req.body;

    if (
      !name ||
      !persons ||
      !number ||
      !mail ||
      !add ||
      !pincode ||
      !img ||
      !tid ||
      !base_charge ||
      !delivery_charge ||
      !total_charge
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const body = `
📦 Thank you for your order!

    👤 Your Order Details
    ----------------------
    Name: ${name}
    Email: ${mail}
    Phone: ${number}
    Address: ${add}
    Pincode: ${pincode}
    Persons: ${persons}
    Transaction ID: ${tid}
    Base Price: ${base_charge}
    Delivery Price: ${delivery_charge}
    Total Price: ${total_charge}

    We'll contact you soon to confirm your order!
    `;

    const base64Data = img.includes("base64,") ? img.split("base64,")[1] : img;

    await transporter.sendMail({
      from: process.env.MAIL_ID,
      to: [mail, process.env.MAIL_ID],
      subject: "🧾 Your Order Confirmation",
      text: body,
      attachments: [
        {
          filename: "order-image.jpg",
          content: base64Data,
          encoding: "base64",
        },
      ],
    });

    res
      .status(200)
      .json({ message: "Order received and email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3000, () => {
  console.log("Server started");
});
