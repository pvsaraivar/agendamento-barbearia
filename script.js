document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('schedule-form');
    const submitButton = document.getElementById('submit-button');
    const responseMessage = document.getElementById('response-message');
    const dateInput = document.getElementById('date');
    const serviceInput = document.getElementById('service');
    const timeSelect = document.getElementById('time');
    const timeLoader = document.getElementById('time-loader');

    // !!! IMPORTANTE: Cole aqui a URL do seu App da Web do Google Apps Script !!!
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxomRkckPlPPbrLL9iT2qo-EySMax7d4GZyJ8TZOGP-ZEc0vXeR3bS9Pont72X5cxnxpA/exec';

    // --- CONFIGURAÇÕES DE HORÁRIO ---
    const workingHours = { start: 9, end: 18 }; // 9h às 18h
    const slotInterval = 30; // Intervalo de 30 minutos
    const serviceDurations = {
        "Corte de Cabelo": 30,
        "Barba": 30,
        "Cabelo + Barba": 60
    };
    // ---------------------------------

    // Define a data mínima para o agendamento como hoje
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    // Adiciona listeners para quando a data ou o serviço mudarem
    dateInput.addEventListener('change', fetchAvailableTimes);
    serviceInput.addEventListener('change', fetchAvailableTimes);

    async function fetchAvailableTimes() {
        const selectedDate = dateInput.value;
        const selectedService = serviceInput.value;

        // Se a data ou o serviço não estiverem selecionados, não faz nada.
        if (!selectedDate || !selectedService) {
            return;
        }

        // Limpa mensagens de erro/sucesso anteriores
        // Mostra o loader e desabilita o select
        timeLoader.style.display = 'block';
        timeSelect.innerHTML = '<option>Carregando horários...</option>';
        timeSelect.disabled = true;
        submitButton.disabled = true;

        try {
            // 1. Valida a URL antes de fazer a chamada
            if (!scriptURL || !scriptURL.startsWith('https://script.google.com/')) {
                throw new Error("URL do script inválida. Verifique a constante scriptURL.");
            }

            // 2. Busca os horários já agendados no Google Script
            const response = await fetch(`${scriptURL}?date=${selectedDate}`);
            const result = await response.json();

            if (result.result !== 'success') {
                throw new Error('Não foi possível buscar os horários.');
            }

            const bookedSlotsData = result.data; // Array de objetos, ex: [{time: "10:00", service: "Corte de Cabelo"}]

            // 3. Gera todos os slots possíveis para o dia
            const allSlots = generateAllSlots(workingHours.start, workingHours.end, slotInterval);

            // 4. Filtra os slots disponíveis
            const serviceDuration = serviceDurations[selectedService];
            if (typeof serviceDuration !== 'number') {
                throw new Error("Duração do serviço inválida ou não selecionada.");
            }

            const availableSlots = allSlots.filter(slot => {
                return isSlotAvailable(slot, serviceDuration, bookedSlotsData);
            });

            // 5. Popula o select com os horários disponíveis
            populateTimeSelect(availableSlots);

        } catch (error) {
            console.error('Erro ao buscar horários:', error);
            timeSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        } finally {
            // Esconde o loader e reabilita o select
            timeLoader.style.display = 'none';
            timeSelect.disabled = false;
            submitButton.disabled = timeSelect.length <= 1;
        }
    }

    function generateAllSlots(startHour, endHour, interval) {
        const slots = [];
        for (let hour = startHour; hour < endHour; hour++) {
            for (let min = 0; min < 60; min += interval) {
                const h = hour.toString().padStart(2, '0');
                const m = min.toString().padStart(2, '0');
                slots.push(`${h}:${m}`);
            }
        }
        return slots;
    }

    function isSlotAvailable(slot, duration, bookedSlotsData) {
        const proposedStart = new Date(`1970-01-01T${slot}:00`);
        const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);

        // Verifica se o slot termina depois do horário de funcionamento
        const endOfWork = new Date(`1970-01-01T${workingHours.end}:00:00`);
        if (proposedEnd > endOfWork) {
            return false;
        }

        // Verifica se o slot se sobrepõe a algum horário já agendado
        for (const bookedSlot of bookedSlotsData) {
            // Pula qualquer agendamento inválido que possa vir da planilha
            if (!bookedSlot.time) continue;

            const existingStart = new Date(`1970-01-01T${bookedSlot.time}:00`);
            const bookedDuration = (bookedSlot.service && serviceDurations[bookedSlot.service]) 
                                     ? serviceDurations[bookedSlot.service] 
                                     : slotInterval;
            const existingEnd = new Date(existingStart.getTime() + bookedDuration * 60000);

            // Condição de sobreposição: (StartA < EndB) and (EndA > StartB)
            if (proposedStart < existingEnd && proposedEnd > existingStart) {
                return false;
            }
        }

        return true;
    }

    function populateTimeSelect(slots) {
        timeSelect.innerHTML = ''; // Limpa opções anteriores
        if (slots.length === 0) {
            timeSelect.innerHTML = '<option value="" disabled selected>Nenhum horário disponível</option>';
            return;
        }
        timeSelect.innerHTML = '<option value="" disabled selected>Selecione um horário</option>';
        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            timeSelect.appendChild(option);
        });
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
        responseMessage.textContent = '';
        responseMessage.className = '';

        fetch(scriptURL, { method: 'POST', body: new FormData(form) })
            .then(response => response.json())
            .then(data => {
                if (data.result === 'success') {
                    responseMessage.textContent = 'Agendamento realizado com sucesso! ✅';
                    responseMessage.classList.add('success');
                    form.reset();
                    timeSelect.innerHTML = '<option value="" disabled selected>Escolha a data e o serviço primeiro</option>';
                    dateInput.setAttribute('min', today);
                } else {
                    throw new Error(data.message || 'Ocorreu um erro desconhecido.');
                }
            })
            .catch(error => {
                console.error('Erro!', error.message);
                responseMessage.textContent = error.message || 'Ops! Algo deu errado. Tente novamente mais tarde.';
                responseMessage.classList.add('error');
                fetchAvailableTimes(); // Re-busca horários, pois o que o usuário tentou pode ter sido pego
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Agendar';
            });
    });
});
