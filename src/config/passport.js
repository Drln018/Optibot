const LocalStrategy = require('passport-local').Strategy;
const User = require('../app/models/user');

module.exports = function(passport) {
    
    // Serializar el usuario
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // Deserializar el usuario
    passport.deserializeUser(async function(id, done) {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // Estrategia de registro (Signup)
    passport.use('local-signup', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async function(req, email, password, done) {
        try {
            // Verifica si el usuario ya existe
            const user = await User.findOne({ 'local.email': email });
            if (user) {
                return done(null, false, req.flash('signupMessage', 'El correo ya está registrado'));
            } else {
                // Crear un nuevo usuario
                const newUser = new User();
                newUser.local.email = email;
                newUser.local.password = password;  // La contraseña será encriptada en el middleware de Mongoose
                await newUser.save();
                return done(null, newUser);
            }
        } catch (err) {
            return done(err);
        }
    }));

    // Estrategia de inicio de sesión (Login)
    passport.use('local-login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async function(req, email, password, done) {
        try {
            // Busca al usuario por el email
            const user = await User.findOne({ 'local.email': email });
            if (!user) {
                return done(null, false, req.flash('loginMessage', 'El usuario no existe'));
            }
            // Compara la contraseña introducida con la guardada en la base de datos
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return done(null, false, req.flash('loginMessage', 'Contraseña incorrecta'));
            }
            return done(null, user);  // Autenticación exitosa
        } catch (err) {
            return done(err);
        }
    }));
};
