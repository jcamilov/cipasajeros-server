var cors = require("cors");
const functions = require("firebase-functions");
const express = require("express");
const admin = require("firebase-admin");

const app = express();
admin.initializeApp({
  credential: admin.credential.cert("./credentials.json"),
});

app.get("/hello", (req, res) => {
  return res.status(200).json({message: "Hola mi gente"});
});

app.options("*", cors());
app.use(require("./routes/counterRoutes"));
app.options("*", cors());
app.use(require("./routes/vehiculosRoutes"));

exports.app = functions.https.onRequest(app);
