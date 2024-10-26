const express = require('express');
const app = express();

const passport = require('passport');  
const path = require('path');
const mongoose = require('mongoose');  
const flash = require('connect-flash'); 
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('./app/models/user');
const bcrypt = require('bcrypt');
const rutasCitas = require('./app/routes');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const cors = require('cors');
app.use(cors());

const avatarRoutes = require('./app/routes.js');
// Importar los modelos de Cita y Evaluación
const Cita = require('./app/models/Cita');
//const Evaluacion = require('./app/models/evaluation');  // Nuevo modelo para la autoevaluación

// Cargar la URL de la base de datos desde config/database.js
const { url } = require('./config/database.js');

// Conexión a MongoDB Atlas
mongoose.connect('mongodb+srv://dcisnerosr:k9y53KlbTAyS6Bsz@cluster0.8xupq.mongodb.net/test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000  // 30 segundos de tiempo de espera
    })
    .then(() => console.log('Conexión exitosa a MongoDB Atlas'))
    .catch(err => console.error('Error al conectarse a MongoDB:', err));
    
// Configuraciones de Passport
require('./config/passport')(passport);

// Configuraciones
app.set('port', process.env.PORT || 4001);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'mysecret', 
    resave: false, 
    saveUninitialized: false 
}));

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Seguridad con Helmet
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'",  
                "'unsafe-eval'",  
                "https://cdn.tailwindcss.com",  
                "https://code.jquery.com",  
                "https://stackpath.bootstrapcdn.com",  
                "https://cdn.jsdelivr.net",
                "https://cdn.voiceflow.com",  // Voiceflow
                "https://www.youtube.com", // YouTube
                "https://cdn.emailjs.com"  // Permitir scripts de EmailJS
            ],
            imgSrc: [
                "'self'",  
                "data:",  
                "https://gstatic.com",  
                "https://i.ytimg.com",  // YouTube imágenes
                "https://api.dicebear.com",  // Dicebear
                "https://cdn.voiceflow.com",  // Voiceflow
                "https://cm4-production-assets.s3.amazonaws.com"  // Amazon S3
            ],
            styleSrc: [
                "'self'",  
                "'unsafe-inline'",  
                "https://stackpath.bootstrapcdn.com",  
                "https://cdn.jsdelivr.net",  
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com",
                "https://cdn.emailjs.com"  // Permitir estilos de EmailJS
            ],
            fontSrc: [
                "'self'",  
                "https://cdnjs.cloudflare.com",  
                "https://stackpath.bootstrapcdn.com",  
                "https://cdn.jsdelivr.net",  
                "https://fonts.gstatic.com",  
                "data:"
            ],
            frameSrc: [
                "'self'",  
                "https://www.youtube.com"  // Permitir iframes de YouTube
            ],
            mediaSrc: [
                "'self'",  
                "https://www.youtube.com"
            ],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
            connectSrc: [
                "'self'", 
                "https://api.dicebear.com",  // Dicebear
                "https://api.emailjs.com",  // Permitir conexiones a EmailJS
                "https://general-runtime.voiceflow.com",  // Voiceflow
                "https://cdn.voiceflow.com"
            ]
        }
    })
);



app.use(express.json());

// Middleware para cargar preferencias del usuario en cada vista
app.use(async (req, res, next) => {
    if (req.user) {
        try {
            // Recuperar las preferencias del usuario desde la base de datos
            const user = await User.findById(req.user._id);
            if (user) {
                res.locals.themeColor = user.themeColor || '#87CEFA';
                res.locals.textSize = user.textSize || '16px';
            } else {
                res.locals.themeColor = '#87CEFA';
                res.locals.textSize = '16px';
            }
        } catch (error) {
            console.error('Error al cargar preferencias del usuario:', error);
            res.status(500).send('Error al cargar las preferencias del usuario');
        }
    } else {
        // Si el usuario no está autenticado, usa valores predeterminados
        res.locals.themeColor = '#87CEFA';
        res.locals.textSize = '16px';
    }
    next();
});

// Rutas
app.use('/', rutasCitas); // Rutas generales
app.use('/', avatarRoutes); // Rutas para el avatar

// Ruta para guardar citas en MongoDB
app.post('/add-cita', async (req, res) => {
    console.log("Datos recibidos en el servidor:", req.body);  
    const { title, location, start } = req.body;

    if (!title || !start) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
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

// Obtener las citas de la base de datos
app.get('/citas', async (req, res) => {
    try {
        const citas = await Cita.find();
        res.status(200).json(citas);
    } catch (error) {
        console.error('Error al obtener las citas:', error);
        res.status(500).json({ error: 'Error al obtener las citas' });
    }
});

// Ruta para generar el reporte PDF de doctores
app.get('/generate-doctor-report', (req, res) => {
    const doc = new PDFDocument();
    
    // Nombre del archivo PDF para descargar
    const fileName = 'reporte_doctores.pdf';
    res.setHeader('Content-disposition', 'attachment; filename="' + fileName + '"');
    res.setHeader('Content-type', 'application/pdf');

    // Crear el PDF en la respuesta directamente
    doc.pipe(res);

    // Agregar logotipo de la empresa al lado derecho
    const logoPath = path.join(__dirname, 'public/img/logo.png');  
    const logoSize = 100;  
    const pageWidth = doc.page.width;  
    const margin = 50;  

    try {
        // Posicionar el logotipo en la esquina superior derecha
        doc.image(logoPath, pageWidth - logoSize - margin, margin, { width: logoSize });
    } catch (error) {
        console.log('No se pudo cargar el logotipo:', error);
    }

    // Título del reporte
    doc.fontSize(25).text('Reporte de Doctores', {
        align: 'center',
        underline: true
    });
    doc.moveDown(1);

    // Resumen de doctores
    doc.fontSize(12).text('Este reporte incluye información sobre los oftalmólogos.', {
        align: 'left'
    });
    doc.text(`Total de doctores: 3`, { align: 'left' });
    doc.moveDown(1.5);

    // Información de doctores
    const doctores = [
        {
            nombre: 'Dr. Juan Pérez',
            especialidad: 'Cataratas y glaucoma',
            clinica: 'Clínica Oftalmológica Central',
            ubicacion: 'Calle 123, Ciudad de Guatemala',
            experiencia: 'Más de 15 años en cirugía oftalmológica'
        },
        {
            nombre: 'Dra. María López',
            especialidad: 'Cirugía refractiva y láser',
            clinica: 'Clínica VisualCare',
            ubicacion: 'Avenida Reforma 456, Ciudad de Guatemala',
            experiencia: 'Más de 10 años en tratamientos oftalmológicos avanzados'
        },
        {
            nombre: 'Dr. Carlos Gómez',
            especialidad: 'Retina y vítreo',
            clinica: 'Centro de Retina y Vítreo',
            ubicacion: 'Zona 10, Ciudad de Guatemala',
            experiencia: 'Pionero en tratamientos avanzados de retina en la región'
        }
    ];

    // Escribir la información de cada doctor en el PDF
    doctores.forEach((doctor, index) => {
        doc.fontSize(14).text(`${index + 1}. ${doctor.nombre}`, { underline: true });
        doc.fontSize(12).text(`Especialidad: ${doctor.especialidad}`);
        doc.text(`Experiencia: ${doctor.experiencia}`);
        doc.text(`Clínica: ${doctor.clinica}`);
        doc.text(`Ubicación: ${doctor.ubicacion}`);
        doc.moveDown(2); 
    });

    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    doc.fontSize(12).text(`Reporte generado el: ${fecha}`, {
        align: 'right'
    });

    // Finalizar el documento PDF
    doc.end();
});

// Ruta para actualizar información oftalmológica
app.post('/ajustes-oftalmologicos', async (req, res) => {
    const { historial, medicacion } = req.body;
    try {
        await User.findByIdAndUpdate(req.user._id, { historial, medicacion });
        res.status(200).json({ message: 'Información oftalmológica actualizada' });
    } catch (error) {
        console.error('Error al guardar los datos oftalmológicos:', error);
        res.status(500).json({ error: 'Error al actualizar la información' });
    }
});

// Ruta para guardar preferencias de accesibilidad
app.post('/ajustes', async (req, res) => {
    try {
        const { themeColor, textSize } = req.body;
        const userId = req.user._id;

        // Actualiza el documento del usuario con las nuevas preferencias
        await User.findByIdAndUpdate(userId, {
            themeColor: themeColor,
            textSize: textSize
        });

        res.redirect('/ajustes');  // Redirige a la página de ajustes o a cualquier otra página
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al guardar preferencias de accesibilidad');
    }
});

app.use(async (req, res, next) => {
    console.log('Usuario autenticado:', req.user);  // Verifica si req.user está definido
    if (req.user) {
        try {
            const user = await User.findById(req.user._id);
            if (user) {
                res.locals.themeColor = user.themeColor || '#87CEFA';
                res.locals.textSize = user.textSize || '16px';
            }
        } catch (error) {
            console.error('Error al cargar preferencias del usuario:', error);
            res.status(500).send('Error al cargar las preferencias del usuario');
        }
    } else {
        // Valores predeterminados
        res.locals.themeColor = '#87CEFA';
        res.locals.textSize = '16px';
    }
    next();
});


// Ruta para renderizar el index
app.get('/index', (req, res) => {
    const user = req.user || {};  // Usamos un objeto vacío si no hay usuario
    console.log('Usuario cargado:', user);  // Imprimir el objeto user
    res.render('index', {
        themeColor: user.themeColor || '#87CEFA',  // Color predeterminado si no está definido
        textSize: user.textSize || '16px'          // Tamaño predeterminado si no está definido
    });
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar el servidor
app.listen(app.get('port'), () => {
    console.log(`Servidor ejecutándose en el puerto ${app.get('port')}`);
});
