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

// Importar el modelo de Cita
const Cita = require('./app/models/cita');

// Cargar la URL de la base de datos desde config/database.js
const { url } = require('./config/database.js');

// Conectar a MongoDB usando Mongoose
mongoose.connect(url)
    .then(() => {
        console.log('Conectado a MongoDB');
    })
    .catch(err => {
        console.error('Error al conectar a MongoDB:', err);
    });

// Configuraciones de Passport
require('./config/passport')(passport);

// Configuraciones
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
    secret: 'mysecret', 
    resave: false, 
    saveUninitialized: false 
}));

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Seguridad
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
          "https://cdn.voiceflow.com",  
          "https://www.youtube.com",  
          "https://www.youtube.com/iframe_api",  
          "https://s.ytimg.com",  
          "https://fonts.googleapis.com"  
        ],
        connectSrc: [
          "'self'",  
          "https://general-runtime.voiceflow.com"  
        ],
        imgSrc: [
          "'self'",  
          "data:",  
          "https://gstatic.com",  
          "https://i.ytimg.com"  
        ],
        styleSrc: [
          "'self'",  
          "'unsafe-inline'",  
          "https://stackpath.bootstrapcdn.com",  
          "https://cdn.jsdelivr.net",  
          "https://cdn.tailwindcss.com",  
          "https://fonts.googleapis.com"  
        ],
        fontSrc: [
          "'self'",  
          "https://cdnjs.cloudflare.com",  
          "https://stackpath.bootstrapcdn.com",  
          "https://cdn.jsdelivr.net",  
          "data:"  
        ],
        frameSrc: [
          "'self'",  
          "https://www.youtube.com"  
        ],
        mediaSrc: [
          "'self'",  
          "https://www.youtube.com"  
        ],
        objectSrc: ["'none'"],  
        upgradeInsecureRequests: []  
      }
    })
  );

app.use(express.json());  

// Rutas
app.use('/', rutasCitas);

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
     const logoPath = path.join(__dirname, 'public/img/logo.png');  // Ajusta esta ruta
     const logoSize = 100;  // Tamaño del logotipo
     const pageWidth = doc.page.width;  // Ancho de la página
     const margin = 50;  // Margen
 
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

    // Aquí extraemos los datos de los doctores de la vista (hardcoded)
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
        // Título del doctor
        doc.fontSize(14).text(`${index + 1}. ${doctor.nombre}`, { underline: true });
        
        // Información detallada del doctor
        doc.fontSize(12).text(`Especialidad: ${doctor.especialidad}`);
        doc.text(`Experiencia: ${doctor.experiencia}`);
        doc.text(`Clínica: ${doctor.clinica}`);
        doc.text(`Ubicación: ${doctor.ubicacion}`);
        doc.moveDown(2); // Espacio entre doctores
    });

    // Definir la fecha actual
    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    // Pie de página con la fecha de generación del reporte
    doc.fontSize(12).text(`Reporte generado el: ${fecha}`, {
        align: 'right'
    });

    // Finalizar el documento PDF
    doc.end();
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar el servidor
app.listen(app.get('port'), () => {
    console.log(`Servidor ejecutándose en el puerto ${app.get('port')}`);
});
