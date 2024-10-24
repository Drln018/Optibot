const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const doctorSchema = new Schema({
    nombre: { type: String, required: true },
    especialidad: { type: String, required: true },
    clinica: { type: String, required: true }
});

module.exports = mongoose.model('Doctor', doctorSchema);
