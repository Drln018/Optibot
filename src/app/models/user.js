const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Esquema del usuario
const userSchema = new mongoose.Schema({
    local: {
        email: String,
        password: String
    },
    facebook: {
        email: String,
        password: String,
        id: String,
        token: String
    },
    google: {
        email: String,
        password: String,
        id: String,
        token: String
    },
    avatar: {                    // Campo para guardar la URL del avatar
        type: String,
        default: ''              // Valor predeterminado vacío si no tiene avatar
    },
    historial: String,           // Información oftalmológica del usuario (opcional)
    medicacion: String,          // Información sobre los medicamentos que el usuario toma (opcional)
    themeColor: {                // Preferencia de color de fondo del usuario
        type: String,
        default: '#87CEFA'  // Valor predeterminado del color de fondo
    },
    textSize: {                  // Preferencia de tamaño de texto del usuario
        type: String,
        default: '16px'          // Valor predeterminado del tamaño del texto
    }
});

// Middleware para encriptar la contraseña antes de guardarla
userSchema.pre('save', async function (next) {
    try {
        // Si la contraseña no ha sido modificada, no la vuelvas a encriptar
        if (!this.isModified('local.password')) {
            return next();
        }
        // Genera el 'salt' y encripta la contraseña del usuario
        const salt = await bcrypt.genSalt(10);
        this.local.password = await bcrypt.hash(this.local.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas durante el login
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.local.password);
};

// Exporta el modelo basado en el esquema del usuario
module.exports = mongoose.model('User', userSchema);
