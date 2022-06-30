let cors = require("cors");
const express = require("express");

// const fileupload = require("express-fileupload");
// const bodyParser = require("body-parser");
// const morgan = require("morgan");

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const app = express();
admin.initializeApp({
  credential: admin.credential.cert("./credentials.json"),
  storageBucket: "gs://cipasajeros.appspot.com",
});

app.options("*", cors());
app.use(require("./routes/counterRoutes"));
app.options("*", cors());
app.use(require("./routes/vehiculosRoutes"));

// Para manejar el endpoint que recibe fotos (middleware):
// app.use(fileupload());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: true}));
// app.use(express.json());
// app.use(express.urlencoded({extended: true}));
// app.use(morgan("dev"));
// enable files upload
// fileUpload({
//   createParentPath: true,
// })

exports.app = functions.https.onRequest(app);
