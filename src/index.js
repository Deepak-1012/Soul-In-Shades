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
  service: "gmail",
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log("Email Error:", error);
  } else {
    console.log("Gmail connection successful");
  }
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
      total_charge,
      delivery_charge,
      base_charge
    } = req.body;


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


    const base64Data = img.includes("base64,")
      ? img.split("base64,")[1]
      : img;


const info = await transporter.sendMail({
  from: "soulinshades1@gmail.com",
  to: [
    mail,
    "soulinshades1@gmail.com"
  ],
  subject: "🧾 Soul In Shades Order Confirmation",
  text: message,
  attachments: [
    {
      filename: "customer-photo.jpg",
      content: base64Data,
      encoding: "base64"
    }
  ]
});

console.log("Mail sent:", info.response);


    res.json({
      success:true,
      message:"Order email sent"
    });


  } catch(error){

    console.log(error);

    res.status(500).json({
      success:false,
      error:"Email failed"
    });

  }

});


module.exports = app;