document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('arquivoAfd');
    const statusDiv = document.getElementById('status');
    const sessaoResultados = document.getElementById('sessaoResultados');
    const resumoValores = document.getElementById('resumoValores');
    const tabelaCorpo = document.getElementById('tabelaCorpo');
    const btnDownload = document.getElementById('btnDownload');
    
    // Elementos da Paginação
    const controlesPaginacao = document.getElementById('controlesPaginacao');
    const btnAnterior = document.getElementById('btnAnterior');
    const btnProximo = document.getElementById('btnProximo');
    const infoPagina = document.getElementById('infoPagina');
    const selectTamanhoPagina = document.getElementById('tamanhoPagina');

    let relatorioFinal = null;

    // Variáveis de controle de página
    let todosRegistros = [];
    let paginaAtual = 1;
    let registrosPorPagina = parseInt(selectTamanhoPagina.value);

    // =========================================================
    // CORREÇÃO: Evento que escuta a mudança no Select de páginas
    // =========================================================
    selectTamanhoPagina.addEventListener('change', (event) => {
        registrosPorPagina = parseInt(event.target.value);
        paginaAtual = 1; // Força a voltar para a página 1 ao mudar o limite
        
        // Só tenta redesenhar se já houver registros carregados
        if (todosRegistros.length > 0) {
            renderizarPagina();
        }
    });

    // Função que desenha apenas a página solicitada
    function renderizarPagina() {
        tabelaCorpo.innerHTML = ''; // Limpa as linhas antigas

        const totalPaginas = Math.ceil(todosRegistros.length / registrosPorPagina);
        const inicio = (paginaAtual - 1) * registrosPorPagina;
        const fim = inicio + registrosPorPagina;

        // Pega apenas a "fatia" dos registros atuais
        const registrosPagina = todosRegistros.slice(inicio, fim);

        registrosPagina.forEach(reg => {
            const tr = document.createElement('tr');

            let classeOp = '';
            if (reg.operacao === 'Inclusão') classeOp = 'op-inclusao';
            if (reg.operacao === 'Alteração') classeOp = 'op-alteracao';
            if (reg.operacao === 'Exclusão') classeOp = 'op-exclusao';

            const partesData = reg.dataHora.split('-');
            const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${reg.horaFormatada}</td>
                <td class="${classeOp}">${reg.operacao}</td>
                <td>${reg.cpfPis}</td>
                <td>${reg.detalhes}</td>
            `;
            tabelaCorpo.appendChild(tr);
        });

        // Atualiza os textos e estado dos botões
        infoPagina.innerText = `Página ${paginaAtual} de ${totalPaginas || 1} (Total: ${todosRegistros.length} registros)`;
        btnAnterior.disabled = paginaAtual === 1;
        btnProximo.disabled = paginaAtual >= totalPaginas;

        // Rola a tela de volta para o topo da tabela
        document.querySelector('.header-resultados').scrollIntoView({ behavior: 'smooth' });
    }

    // Controles de clique da paginação
    btnAnterior.addEventListener('click', () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            renderizarPagina();
        }
    });

    btnProximo.addEventListener('click', () => {
        const totalPaginas = Math.ceil(todosRegistros.length / registrosPorPagina);
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            renderizarPagina();
        }
    });

    // Evento de Leitura do Arquivo
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        sessaoResultados.style.display = 'none';
        controlesPaginacao.style.display = 'none';
        tabelaCorpo.innerHTML = '';
        todosRegistros = [];
        paginaAtual = 1;

        statusDiv.innerHTML = "Processando arquivo... ⏳ Isso pode levar alguns segundos.";

        const worker = new Worker('worker.js');
        worker.postMessage(file);

        worker.onmessage = (e) => {
            if (e.data.erro) {
                statusDiv.innerHTML = `<span style="color: red;">Erro: ${e.data.erro}</span>`;
                return;
            }

            relatorioFinal = e.data.resultado;

            // Converte os dados agrupados por data em uma única lista plana (Array) para facilitar a paginação
            for (const [data, registros] of Object.entries(relatorioFinal.porData)) {
                todosRegistros.push(...registros);
            }

            // Opcional: Garante que a lista geral está em ordem cronológica exata
            todosRegistros.sort((a, b) => {
                const dateTimeA = a.dataHora + a.horaFormatada;
                const dateTimeB = b.dataHora + b.horaFormatada;
                return dateTimeA.localeCompare(dateTimeB);
            });

            resumoValores.innerHTML = `
                <strong>Total Encontrado:</strong><br>
                <span style="color: #28a745;">Inclusões: ${relatorioFinal.porOperacao['Inclusão']}</span> | 
                <span style="color: #fd7e14;">Alterações: ${relatorioFinal.porOperacao['Alteração']}</span> | 
                <span style="color: #dc3545;">Exclusões: ${relatorioFinal.porOperacao['Exclusão']}</span>
            `;

            statusDiv.innerHTML = "";
            sessaoResultados.style.display = 'block';

            // Só mostra a barra de paginação se houver algum registro
            if (todosRegistros.length > 0) {
                controlesPaginacao.style.display = 'flex';
                renderizarPagina(); // Aciona a função que desenha os primeiros X registros
            }

            worker.terminate();
        };
    });

    // Função de Download
    btnDownload.addEventListener('click', () => {
        if (!relatorioFinal) return;
        const blob = new Blob([JSON.stringify(relatorioFinal, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Auditoria_AFD_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});