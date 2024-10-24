const express = require('express');
const router = express.Router();
const passport = require('passport');  // Requerir passport
const crypto = require('crypto');  // Para generar el token
const nodemailer = require('nodemailer');  // Para enviar correos
const User = require('../app/models/user');  // Importa el modelo de usuario
const bcrypt = require('bcrypt');  // Para encriptar contraseñas
const Cita = require('./models/cita'); // Usa exactamente el mismo nombre de archivo


// Ruta para renderizar el índice
router.get('/', (req, res) => {
    res.render('index');
});

// Ruta para renderizar la página de login
router.get('/login', (req, res) => {
    res.render('login', {
        message: req.flash('loginMessage')
    });
});

// Ruta de login con autenticación de Passport
router.post('/login', passport.authenticate('local-login', {
    successRedirect: '/index',  // Redirige al perfil si el login es exitoso
    failureRedirect: '/login',  // Redirige al login si falla
    failureFlash: true  // Muestra mensajes flash en caso de error
}));

// Ruta para renderizar la página de registro (signup)
router.get('/signup', (req, res) => {
    res.render('signup', {
        message: req.flash('signupMessage')
    });
});

// Ruta de registro con autenticación de Passport
router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/index',  // Redirige al perfil si el registro es exitoso
    failureRedirect: '/signup',  // Redirige al registro si falla
    failureFlash: true  // Muestra mensajes flash en caso de error
}));

// Ruta para renderizar el formulario de recuperación de contraseña
router.get('/restablecercontra', (req, res) => {
    res.render('restablecercontra');  // Asegúrate de que tienes el archivo restablecercontra.ejs en la carpeta views
});

// Ruta para procesar la solicitud de restablecimiento de contraseña
router.post('/password-reset', async (req, res) => {
    const { email } = req.body;

    // Busca al usuario por su email
    const user = await User.findOne({ 'local.email': email });
    if (!user) {
        req.flash('error', 'No existe una cuenta asociada a ese correo electrónico');
        return res.redirect('/restablecercontra');
    }

    // Genera un token único y establece una expiración para el enlace
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora para la expiración
    await user.save();

    // Configuración de nodemailer para enviar el correo
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Cambia a tu proveedor de correo o configura uno personalizado
        auth: {
            user: 'tuEmail@gmail.com', // Tu correo
            pass: 'tuPassword', // Tu contraseña o aplicación especial de correo
        },
    });

    const mailOptions = {
        to: user.local.email,
        from: 'noreply@tuapp.com',
        subject: 'Recuperación de contraseña',
        text: `Recibimos una solicitud para restablecer tu contraseña.
        Haz clic en el siguiente enlace o cópialo en tu navegador para completar el proceso:
        http://${req.headers.host}/reset/${token}\n\n
        Si no solicitaste este cambio, por favor ignora este mensaje.`,
    };

    // Envía el correo
    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.error('Error al enviar el correo:', err);
        }
        req.flash('info', 'Se ha enviado un enlace de recuperación a tu correo electrónico');
        res.redirect('/restablecercontra');
    });
});

// Ruta para mostrar el formulario de restablecimiento
router.get('/reset/:token', async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }, // Verifica que el token no ha expirado
    });

    if (!user) {
        req.flash('error', 'El token es inválido o ha expirado');
        return res.redirect('/restablecercontra');
    }

    // Renderiza la vista con el token
    res.render('restablecercontra', { token: req.params.token });  // Aquí estamos pasando el token a la vista
});



// Ruta para procesar la nueva contraseña
router.post('/reset/:token', async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }, // Verifica que el token no ha expirado
    });

    if (!user) {
        req.flash('error', 'El token es inválido o ha expirado');
        return res.redirect('/restablecercontra');  // Redirigir si el token no es válido o ha expirado
    }

    // Encripta la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    user.local.password = await bcrypt.hash(req.body.password, salt);

    // Limpia el token y la expiración después de restablecer la contraseña
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    req.flash('success', 'Tu contraseña ha sido actualizada correctamente');
    res.redirect('/login');
});

// Ruta para renderizar el perfil (solo si el usuario está autenticado)
router.get('/index', isLoggedIn, (req, res) => {
    res.render('index', {
        user: req.user  // Pasa la información del usuario a la vista
    });
});

// Ruta para cerrar sesión
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// Middleware para verificar si el usuario está autenticado
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

router.get('/mycalendar', (req, res) => {
    res.render('mycalendar');  
});

router.get('/doctor', (req, res) => {
    res.render('doctor');  
});

router.get('/education', (req, res) => {
    res.render('education');  
});

router.get('/perfil', (req, res) => {
    res.render('perfil');  // Asegúrate de que tienes el archivo `mycalendar.ejs` en la carpeta `views`
});

router.get('/autoevaluacion', (req, res) => {
    res.render('autoevaluacion');  
});

// Ruta para guardar citas en MongoDB
router.post('/add-cita', async (req, res) => {
    try {
        const { title, location, start } = req.body;

        if (!title || !start) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Guardar la cita con los datos correctos
        const nuevaCita = new Cita({
            title,
            location,
            start
        });

        await nuevaCita.save();
        res.status(200).json({ message: 'Cita guardada correctamente' });
    } catch (error) {
        console.error('Error al guardar la cita:', error);
        res.status(500).json({ error: 'Error al guardar la cita' });
    }
});


// Ruta para obtener todas las citas guardadas
router.get('/citas', async (req, res) => {
    try {
        const citas = await Cita.find();
        res.json(citas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las citas' });
    }
});

module.exports = router;
