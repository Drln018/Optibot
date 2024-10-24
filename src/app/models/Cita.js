const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir el esquema para las citas
const CitaSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: false
  },
  start: {
    type: Date,
    required: true
  }
});

// Crear el modelo basado en el esquema de citas
const Cita = mongoose.model('Cita', CitaSchema);

module.exports = Cita;
