const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const evaluationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    vision: { type: String, required: true },
    discomfort: { type: Number, required: true },
    side_effects: { type: String }
});

const Evaluation = mongoose.model('Evaluation', evaluationSchema);
module.exports = Evaluation;
