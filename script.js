// c:\Users\Paulo Victor Saraiva\Desktop\Estudos\Barbearia - Agendamento\script.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('schedule-form');
    const submitButton = document.getElementById('submit-button');
    const responseMessage = document.getElementById('response-message');

    // !!! IMPORTANTE: Cole aqui a URL do seu App da Web do Google Apps Script !!!
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxomRkckPlPPbrLL9iT2qo-EySMax7d4GZyJ8TZOGP-ZEc0vXeR3bS9Pont72X5cxnxpA/exec';

    // Define a data mínima para o agendamento como hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').setAttribute('min', today);

    form.addEventListener('submit', e => {
        e.preventDefault(); // Impede o envio padrão do formulário

        // Desabilita o botão para evitar múltiplos envios
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
        responseMessage.textContent = '';
        responseMessage.className = '';

        const formData = new FormData(form);

        fetch(scriptURL, { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.result === 'success') {
                    responseMessage.textContent = 'Agendamento realizado com sucesso! ✅';
                    responseMessage.classList.add('success');
                    form.reset(); // Limpa o formulário
                    // Define a data mínima para o agendamento como hoje novamente após o reset
                    document.getElementById('date').setAttribute('min', today);
                } else {
                    // Se o resultado for 'error', joga um erro com a mensagem vinda do script
                    throw new Error(data.message || 'Ocorreu um erro desconhecido.');
                }
            })
            .catch(error => {
                console.error('Erro!', error.message);
                // Exibe a mensagem de erro específica retornada pelo script ou uma mensagem padrão
                responseMessage.textContent = error.message || 'Ops! Algo deu errado. Tente novamente mais tarde.';
                responseMessage.classList.add('error');
            })
            .finally(() => {
                // Reabilita o botão após o término da requisição
                submitButton.disabled = false;
                submitButton.textContent = 'Agendar';
            });
    });
});
