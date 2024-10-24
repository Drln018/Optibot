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
});

// Middleware para encriptar la contraseña antes de guardarla
userSchema.pre('save', async function (next) {
    try {
        // Si la contraseña no ha sido modificada, pasa al siguiente middleware
        if (!this.isModified('local.password')) {
            return next();
        }

        // Si fue modificada, encripta la contraseña
        console.log('Encriptando la contraseña antes de guardar...');
        const salt = await bcrypt.genSalt(10);  // Genera el salt
        this.local.password = await bcrypt.hash(this.local.password, salt);  // Encripta la contraseña usando bcrypt
        console.log('Contraseña encriptada:', this.local.password);  // Muestra la contraseña encriptada en la consola
        next();
    } catch (error) {
        next(error);  // Si ocurre un error, pasa el control a la siguiente función de middleware con el error
    }
});

// Método para comparar contraseñas ingresadas con la almacenada en la base de datos
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        console.log('Comparando contraseñas: ', candidatePassword, this.local.password);  // Muestra ambas contraseñas para depuración
        return await bcrypt.compare(candidatePassword, this.local.password);  // Retorna true si coinciden, false si no
    } catch (error) {
        console.error('Error comparando las contraseñas:', error);  // Muestra el error si ocurre
        throw new Error('Error al comparar contraseñas');
    }
};

// Método para generar un nuevo hash de contraseña para el restablecimiento de contraseñas
userSchema.methods.resetPassword = async function(newPassword) {
    try {
        const salt = await bcrypt.genSalt(10);  // Genera un nuevo salt para la nueva contraseña
        this.local.password = await bcrypt.hash(newPassword, salt);  // Encripta la nueva contraseña
        console.log('Contraseña restablecida:', this.local.password);  // Muestra la nueva contraseña encriptada para depuración
        await this.save();  // Guarda el usuario actualizado en la base de datos
    } catch (error) {
        console.error('Error restableciendo la contraseña:', error);  // Muestra el error si ocurre
        throw new Error('Error al restablecer la contraseña');
    }
};

// Modelo de usuario basado en el esquema definido
const User = mongoose.model('User', userSchema);

module.exports = User;
