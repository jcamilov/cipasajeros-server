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

// Obtener conteo de pasajeros que ingresaron (legitimos adelante y fraude atras)
// Si se llama como /api/vehiculos/wtn000, retorna los datos de la buseta con id wtn000
// Si se llama como /api/vehiculos/todos, retorna la suma de los pasajeros en TODOS los vehiculos
// Retorna un objeto con formato
// {name: dd/mm, pasajerosAdelante: 0, pasajerosAtras: 0}
router.get("/api/vehiculos/:id", async (req, res) => {
  try {
    let pasajerosAdelante = "";
    let pasajerosAtras = "";
    res.set("Access-Control-Allow-Origin", "*");

    if (req.params.id === "todos") {
      console.log("getting passenger count in all vehicules");
      // get all vehicules' data
      const query = db.collection("vehiculos");
      const querySnapshot = await query.get();
      const entradasAdelante = [];
      const entradasAtras = [];
      querySnapshot.docs.forEach((vehiculo) => {
        entradasAdelante.push(...vehiculo.data().adelante.entradas);
        entradasAtras.push(...vehiculo.data().atras.entradas);
      });
      // getting entering passengers from front and back doors
      pasajerosAdelante = getPasajerosPorFecha(entradasAdelante);
      pasajerosAtras = getPasajerosPorFecha(entradasAtras);
    } else {
      // get one vehicule's data
      console.log(
        "getting passenger count for the vehicule with id: " +
          req.params.id +
          "..."
      );
      const doc = db.collection("vehiculos").doc(req.params.id);
      const item = await doc.get();
      const vehiculo = item.data();

      // getting entering passengers from front and back doors
      pasajerosAdelante = getPasajerosPorFecha(vehiculo.adelante.entradas);
      pasajerosAtras = getPasajerosPorFecha(vehiculo.atras.entradas);
    }
    const objeto = {pasajerosAdelante, pasajerosAtras};
    return res.status(200).json(objeto);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Obtener una lista de los id de las busetas registradas (para dropdown y reportes)
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

// Obtener número de pasajeros que en circulación en este momento
// Si se llama como /api/live/wtn000, retorna los pasajeros en la buseta con id wtn000
// Si se llama como /api/live/todos, retorna la suma de los pasajeros en TODOS los vehiculos en este momento
// Retorna un entero
// En el body debe contener la fecha UTC con hora 00:00 { 'fecha' : 3272382837 }
router.get("/api/live/:id", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  try {
    const lowerLimit = req.body.fecha;
    const upperLimit = req.body.fecha + 86400; // 86400 seconds = 1 day
    const entradasAdelante = [];
    let counter = 0;

    if (req.params.id === "todos") {
      console.log("passengers of a specific date, entrance from front door");
      // get all vehicules' data
      const query = db.collection("vehiculos");
      const querySnapshot = await query.get();
      querySnapshot.docs.forEach((vehiculo) => {
        vehiculo.data().adelante.entradas.forEach((entrada) => {
          console.log(parseInt(entrada));
          if (
            parseInt(entrada) >= lowerLimit &&
            parseInt(entrada) <= upperLimit
          ) {
            counter++;
            entradasAdelante.push(entrada);
          }
        });
      });
    } else {
      // get one vehicule's data
      console.log(
        "getting passenger count for the vehicule with id: " +
          req.params.id +
          "..."
      );
      const doc = db.collection("vehiculos").doc(req.params.id);
      const vehiculo = await doc.get();
      vehiculo.data().adelante.entradas.forEach((entrada) => {
        if (
          parseInt(entrada) >= lowerLimit &&
          parseInt(entrada) <= upperLimit
        ) {
          counter++;
          entradasAdelante.push(...vehiculo.data().adelante.entradas);
        }
      });
    }
    const objeto = {counter, entradasAdelante};
    return res.status(200).json(objeto);
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
//   "urlFoto": "https://storage.googleapis.com/cipasajeros.appspot.com/puertaatras02.png"   <--- solo se lee cuando sensor=atras y tipoRegistro=entradas
// }
router.put("/api/vehiculos/:id", async (req, res) => {
  try {
    const doc = db.collection("vehiculos").doc(req.params.id);
    const tipoDeRegistro = `${req.body.sensor}.${req.body.tipoRegistro}`;
    let unionRes = "";

    if (tipoDeRegistro === "atras.entradas") {
      console.log("es entrada atras");
      unionRes = await doc.update({
        [tipoDeRegistro]: admin.firestore.FieldValue.arrayUnion(
          req.body.registro
        ),
        ["atras.fotos"]: admin.firestore.FieldValue.arrayUnion(
          req.body.urlFoto
        ),
      });
    } else {
      console.log("no es entrada atras");
      unionRes = await doc.update({
        [tipoDeRegistro]: admin.firestore.FieldValue.arrayUnion(
          req.body.registro
        ),
      });
    }

    console.log(unionRes);
    return res
      .status(200)
      .json(`${req.body.tipoRegistro.slice(0, -1)} agregada.`);
  } catch (error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
