document.addEventListener('DOMContentLoaded', () => {
    // A PORTA FOI REMOVIDA DESSES ARQUIVOS, POIS O NAVEGADOR USARÁ O HOST/PORT QUE SERVIU O HTML.
    const listaEventos = document.getElementById('lista-eventos');

    if (!listaEventos) {
        console.error("Elemento com ID 'lista-eventos' não encontrado no index.html.");
        return;
    }

    // FUNÇÃO DE AJUDA: FORMATAÇÃO DE DATA (YYYY-MM-DD para DD/MM/YYYY)
    const formatarData = (dataStr) => {
        if (!dataStr) return 'Não definida';
        const datePart = dataStr.substring(0, 10);
        const parts = datePart.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return datePart;
    }

    // FUNÇÃO PRINCIPAL: CARREGAR E EXIBIR OS EVENTOS/ATRAÇÕES
    async function carregarEventos() {
        try {
            // CORRIGIDO: Usando caminho relativo ('/api/eventos')
            const response = await fetch('/api/eventos');

            if (!response.ok) {
                throw new Error(`Erro ao carregar dados: ${response.status}`);
            }

            const eventos = await response.json();

            listaEventos.innerHTML = '';

            if (eventos.length === 0) {
                listaEventos.innerHTML = '<p>Nenhum evento/atração cadastrado(a) no momento.</p>';
                return;
            }

            eventos.forEach(evento => {
                const eventoDiv = document.createElement('div');
                eventoDiv.classList.add('card-atracao');

                let dataHoraHtml = '';

                if (evento.tipo === 'Evento') {
                    dataHoraHtml = `
                        <p class="card-details">
                            📅 Data: ${formatarData(evento.data_evento)} 
                            🕒 Hora: ${evento.hora_evento || 'Não definida'}
                        </p>
                    `;
                } else if (evento.tipo !== 'Evento' && evento.data_evento) {
                     dataHoraHtml = `
                        <p class="card-details-small">
                            📅 Data: ${formatarData(evento.data_evento)}
                        </p>
                    `;
                }

                eventoDiv.innerHTML = `
                    <h3>${evento.nome}</h3>
                    <p><strong>Tipo:</strong> ${evento.tipo || 'Não especificado'}</p>

                    ${dataHoraHtml}

                    <p><strong>Descrição:</strong> ${evento.descricao}</p>
                `;

                listaEventos.appendChild(eventoDiv);
            });

        } catch (error) {
            console.error('Falha ao carregar itens:', error);
            listaEventos.innerHTML = `<p style="color: red;">Erro de conexão com o servidor: ${error.message}</p>`;
        }
    }

    carregarEventos();
});