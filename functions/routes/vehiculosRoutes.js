// POR HACER
// - endpoint que devuelva los pasajeros en circulacion en tiempo real
// (toma todas las entradas y salidas del dia actual en todos los vehiculos y las resta. Devuelve conteo)
// - todo el tema de las fotos y firestorage

const {Router} = require("express");
const router = Router();
const admin = require("firebase-admin");

const db = admin.firestore();

// Funcion de ayuda que recibe un array con fechas UTC y devuelve
// un arreglo de objetos con la forma [{fecha: dd/mm, pasajeros: 0},...]
// para ser graficados facilmente
const getPasajerosPorFecha = (registros) => {
  const pasajeros = [];
  registros.forEach((entrada) => {
    const day = new Date(entrada * 1000).getDate();
    const month = new Date(entrada * 1000).getMonth() + 1;
    const dayMonth = `${day < 10 ? "0" + day : day}/${
      month < 10 ? "0" + month : month
    }`;
    let index = pasajeros.findIndex((el) => el.fecha === dayMonth);
    // if date doesn't exist, add it to the array'
    if (index === -1) {
      pasajeros.push({fecha: dayMonth, pasajeros: 0});
      index = pasajeros.length - 1;
    }
    // increment count
    pasajeros[index].pasajeros++;
  });
  return pasajeros;
};

// crear una buseta
router.post("/api/vehiculos", async (req, res) => {
  try {
    await db
      .collection("vehiculos")
      .doc("/" + req.body.id + "/")
      .create({
        id: req.body.id,
        adelante: {
          entradas: [],
          salidas: [],
        },
        atras: {
          entradas: [],
          fotos: [],
          salidas: [],
          fotos: [],
        },
      });
    return res.status(200).json(`Vehiculo con id ${req.body.id} creado.`);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

// obtener recuento de pasajeros (legitimos y fraude) por dia
// retorna un objeto con formato
// {name: dd/mm, pasajeros: 0}
router.get("/api/vehiculos/:id", async (req, res) => {
  try {
    // get full vehicule's data
    const doc = db.collection("vehiculos").doc(req.params.id);
    const item = await doc.get();
    const vehiculo = item.data();
    res.set("Access-Control-Allow-Origin", "*");

    // getting entering passengers from front and back doors
    console.log(vehiculo);
    const pasajerosAdelante = getPasajerosPorFecha(vehiculo.adelante.entradas);
    const pasajerosAtras = getPasajerosPorFecha(vehiculo.atras.entradas);
    const objeto = {pasajerosAdelante, pasajerosAtras};
    return res.status(200).json(objeto);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// obtener solo los id de las busetas registradas
router.get("/api/vehiculos", async (req, res) => {
  try {
    const query = db.collection("vehiculos");
    const querySnapshot = await query.get();

    const vehiculos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
    }));
    res.set("Access-Control-Allow-Origin", "*");
    return res.status(200).send(vehiculos);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// agregar entrada o salida (lo hace cada google dev board en cada puerta)
// Usar este formato como body:
// {
//   "sensor":"atras",
//   "tipoRegistro":"salidas",
//   "registro": "17 de enero de 2022, 00:00:00 UTC-5"
// }
router.put("/api/vehiculos/:id", async (req, res) => {
  try {
    const doc = db.collection("vehiculos").doc(req.params.id);
    const tipoDeRegistro = `${req.body.sensor}.${req.body.tipoRegistro}`;
    const unionRes = await doc.update({
      [tipoDeRegistro]: admin.firestore.FieldValue.arrayUnion(
        req.body.registro
      ),
    });
    console.log(unionRes);
    return res
      .status(200)
      .json(`${req.body.tipoRegistro.slice(0, -1)} agregada.`);
  } catch (error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
