document.addEventListener("DOMContentLoaded", function() {
    const formAccesibilidad = document.getElementById('formAccesibilidad');
    
    if (formAccesibilidad) {
        formAccesibilidad.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(formAccesibilidad);
            
            // Verifica los valores y aplícalos al body
            const textSize = formData.get('textSize');
            const themeColor = formData.get('themeColor');
            
            console.log('textSize:', textSize);
            console.log('themeColor:', themeColor);

            // Aplicar los cambios directamente al body
            document.body.style.fontSize = textSize;
            document.body.style.backgroundColor = themeColor;

            // Enviar los datos al servidor
            fetch('/ajustes-accesibilidad', {
                method: 'POST',
                body: formData,
            })
            .then(response => {
                if (response.ok) {
                    alert('Preferencias de accesibilidad guardadas.');
                } else {
                    alert('Error al guardar las preferencias de accesibilidad.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    } else {
        console.error("El formulario de accesibilidad no fue encontrado en el DOM.");
    }
});
