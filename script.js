// Mostrar el chatbot cuando se haga clic en el botón "Empezar"
document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById('startButton');
    const chatbotContainer = document.getElementById('chatbotContainer');
    
    startButton.addEventListener('click', function() {
        // Mostrar el contenedor del chatbot
        chatbotContainer.style.display = 'block';
    });
});
