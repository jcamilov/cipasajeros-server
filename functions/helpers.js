const getPasajerosPorFecha = (registros) => {
  const pasajeros = [];
  registros.forEach((entrada) => {
    const day = new Date(entrada * 1000).getDate();
    const month = new Date(entrada * 1000).getMonth() + 1;
    const dayMonth = `${day < 10 ? "0" + day : day}/${
      month < 10 ? "0" + month : month
    }`;
    let index = pasajeros.findIndex((el) => el.date === dayMonth);
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
