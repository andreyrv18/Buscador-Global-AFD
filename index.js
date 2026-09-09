document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('arquivoAfd');
    const statusDiv = document.getElementById('status');
    const sessaoResultados = document.getElementById('sessaoResultados');
    const resumoValores = document.getElementById('resumoValores');
    const tabelaCorpo = document.getElementById('tabelaCorpo');
    const btnDownload = document.getElementById('btnDownload');

    // Filtros e Ordenação
    const filtroNome = document.getElementById('filtroNome');
    const filtroCpf = document.getElementById('filtroCpf');
    const filtroData = document.getElementById('filtroData');
    const ordemData = document.getElementById('ordemData');

    // Paginação
    const controlesPaginacao = document.getElementById('controlesPaginacao');
    const btnAnterior = document.getElementById('btnAnterior');
    const btnProximo = document.getElementById('btnProximo');
    const infoPagina = document.getElementById('infoPagina');
    const selectTamanhoPagina = document.getElementById('tamanhoPagina');

    let relatorioFinal = null;
    let todosRegistros = [];
    let registrosFiltrados = [];
    let paginaAtual = 1;
    let registrosPorPagina = parseInt(selectTamanhoPagina.value);
    let operacaoSelecionada = 'Todas'; // Estado do filtro por tipo ('Todas', 'Inclusão', 'Alteração', 'Exclusão')

    // =========================================================
    // LÓGICA DE FILTRAGEM E ORDENAÇÃO
    // =========================================================
    function aplicarFiltrosEOrdenacao() {
        const valNome = filtroNome.value.toLowerCase().trim();
        const valCpf = filtroCpf.value.toLowerCase().replace(/\D/g, '');
        const valData = filtroData.value;
        const direcaoOrdem = ordemData.value;

        // 1. Filtra registros
        registrosFiltrados = todosRegistros.filter(reg => {
            const bateNome = !valNome || reg.detalhes.toLowerCase().includes(valNome);
            const cpfLimpo = reg.cpfPis.replace(/\D/g, '');
            const bateCpf = !valCpf || cpfLimpo.includes(valCpf);
            const bateData = !valData || reg.dataHora === valData;
            const bateOperacao = operacaoSelecionada === 'Todas' || reg.operacao === operacaoSelecionada;

            return bateNome && bateCpf && bateData && bateOperacao;
        });

        // 2. Ordena por Data + Hora (Crescente / Decrescente)
        registrosFiltrados.sort((a, b) => {
            const dateTimeA = a.dataHora + a.horaFormatada;
            const dateTimeB = b.dataHora + b.horaFormatada;
            
            return direcaoOrdem === 'asc' 
                ? dateTimeA.localeCompare(dateTimeB) 
                : dateTimeB.localeCompare(dateTimeA);
        });

        paginaAtual = 1;
        renderizarPagina();
    }

    // Escutadores dos inputs
    filtroNome.addEventListener('input', aplicarFiltrosEOrdenacao);
    filtroCpf.addEventListener('input', aplicarFiltrosEOrdenacao);
    filtroData.addEventListener('change', aplicarFiltrosEOrdenacao);
    ordemData.addEventListener('change', aplicarFiltrosEOrdenacao);

    // Renderiza a barra de resumo interativa com botões de operação
    function renderizarResumo() {
        if (!relatorioFinal) return;

        resumoValores.innerHTML = `
            <div class="card-filtro-op todos ${operacaoSelecionada === 'Todas' ? 'ativo' : ''}" data-op="Todas">
                Total: <strong>${todosRegistros.length}</strong>
            </div>
            <div class="card-filtro-op inclusao ${operacaoSelecionada === 'Inclusão' ? 'ativo' : ''}" data-op="Inclusão" style="color: #28a745;">
                Inclusões: <strong>${relatorioFinal.porOperacao['Inclusão'] || 0}</strong>
            </div>
            <div class="card-filtro-op alteracao ${operacaoSelecionada === 'Alteração' ? 'ativo' : ''}" data-op="Alteração" style="color: #fd7e14;">
                Alterações: <strong>${relatorioFinal.porOperacao['Alteração'] || 0}</strong>
            </div>
            <div class="card-filtro-op exclusao ${operacaoSelecionada === 'Exclusão' ? 'ativo' : ''}" data-op="Exclusão" style="color: #dc3545;">
                Exclusões: <strong>${relatorioFinal.porOperacao['Exclusão'] || 0}</strong>
            </div>
        `;

        // Atribui evento de clique para filtrar por tipo
        resumoValores.querySelectorAll('.card-filtro-op').forEach(btn => {
            btn.addEventListener('click', () => {
                operacaoSelecionada = btn.getAttribute('data-op');
                renderizarResumo(); // Atualiza estilo ativo
                aplicarFiltrosEOrdenacao(); // Refiltra tabela
            });
        });
    }

    // =========================================================
    // PAGINAÇÃO E RENDERIZAÇÃO
    // =========================================================
    selectTamanhoPagina.addEventListener('change', (event) => {
        registrosPorPagina = parseInt(event.target.value);
        paginaAtual = 1;
        if (registrosFiltrados.length > 0) renderizarPagina();
    });

    function renderizarPagina() {
        tabelaCorpo.innerHTML = '';

        const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
        const inicio = (paginaAtual - 1) * registrosPorPagina;
        const fim = inicio + registrosPorPagina;
        const registrosPagina = registrosFiltrados.slice(inicio, fim);

        if (registrosPagina.length === 0) {
            tabelaCorpo.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-label);">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;
        } else {
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
        }

        infoPagina.innerText = `Página ${paginaAtual} de ${totalPaginas || 1}`;
        btnAnterior.disabled = paginaAtual === 1;
        btnProximo.disabled = paginaAtual >= totalPaginas || totalPaginas === 0;
    }

    btnAnterior.addEventListener('click', () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            renderizarPagina();
        }
    });

    btnProximo.addEventListener('click', () => {
        const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            renderizarPagina();
        }
    });

    // =========================================================
    // LEITURA DO ARQUIVO
    // =========================================================
    fileInput.addEventListener('change', (event) => {
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        const file = event.target.files[0];

        if (!file) {
            fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
            return;
        }

        fileNameDisplay.textContent = file.name;
        sessaoResultados.style.display = 'none';
        controlesPaginacao.style.display = 'none';
        tabelaCorpo.innerHTML = '';

        todosRegistros = [];
        registrosFiltrados = [];
        operacaoSelecionada = 'Todas';
        filtroNome.value = '';
        filtroCpf.value = '';
        filtroData.value = '';
        ordemData.value = 'asc';
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

            for (const [data, registros] of Object.entries(relatorioFinal.porData)) {
                todosRegistros.push(...registros);
            }

            statusDiv.innerHTML = "";
            sessaoResultados.style.display = 'block';

            renderizarResumo();
            aplicarFiltrosEOrdenacao();

            if (todosRegistros.length > 0) {
                controlesPaginacao.style.display = 'flex';
            }

            worker.terminate();
        };
    });

    // Download JSON
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