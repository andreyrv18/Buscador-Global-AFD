document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.sidebar .menu-item');
    const abasConteudo = document.querySelectorAll('.aba-conteudo');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const abaAlvo = item.getAttribute('data-aba');

            menuItems.forEach(m => m.classList.remove('ativo'));
            abasConteudo.forEach(a => a.classList.remove('ativa'));

            item.classList.add('ativo');
            const elementoAba = document.getElementById(abaAlvo);
            if (elementoAba) {
                elementoAba.classList.add('ativa');
            }
        });
    });

    const fileInput = document.getElementById('arquivoAfd');
    const statusDiv = document.getElementById('status');
    const sessaoResultados = document.getElementById('sessaoResultados');
    const resumoValores = document.getElementById('resumoValores');
    const tabelaCorpo = document.getElementById('tabelaCorpo');
    const btnDownload = document.getElementById('btnDownload');

    const filtroNome = document.getElementById('filtroNome');
    const filtroCpf = document.getElementById('filtroCpf');
    const filtroData = document.getElementById('filtroData');
    const ordemData = document.getElementById('ordemData');

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
    let operacaoSelecionada = 'Todas';


    const controlesPaginacaoEventos = document.getElementById('controlesPaginacaoEventos');
    const btnAnteriorEventos = document.getElementById('btnAnteriorEventos');
    const btnProximoEventos = document.getElementById('btnProximoEventos');
    const infoPaginaEventos = document.getElementById('infoPaginaEventos');
    const selectTamanhoPaginaEventos = document.getElementById('tamanhoPaginaEventos');
    const qtdEventos = document.getElementById('qtdEventos');

    let todosEventos = [];
    let paginaAtualEventos = 1;
    let registrosPorPaginaEventos = 10;


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
        controlesPaginacaoEventos.style.display = 'none';
        statusDiv.innerHTML = "Processando arquivo, aguarde.";

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

            aplicarFiltrosEOrdenacao();
            renderizarAjustesRelogio(relatorioFinal.ajustesRelogio || []);
            todosEventos = relatorioFinal.eventosRep || [];
            paginaAtualEventos = 1;
            renderizarPaginaEventos();
            if (todosRegistros.length > 0) {
                controlesPaginacao.style.display = 'flex';
            }

            worker.terminate();
        };
    });

    function aplicarFiltrosEOrdenacao() {
        const valNome = filtroNome.value.toLowerCase().trim();
        const valCpf = filtroCpf.value.toLowerCase().replace(/\D/g, '');
        const valData = filtroData.value;
        const direcaoOrdem = ordemData.value;

        registrosFiltrados = todosRegistros.filter(reg => {
            const bateNome = !valNome || reg.detalhes.toLowerCase().includes(valNome);
            const cpfLimpo = reg.cpfPis.replace(/\D/g, '');
            const bateCpf = !valCpf || cpfLimpo.includes(valCpf);
            const bateData = !valData || reg.dataHora === valData;
            const bateOperacao = operacaoSelecionada === 'Todas' || reg.operacao === operacaoSelecionada;

            return bateNome && bateCpf && bateData && bateOperacao;
        });

        registrosFiltrados.sort((a, b) => {
            const dateTimeA = a.dataHora + a.horaFormatada;
            const dateTimeB = b.dataHora + b.horaFormatada;
            return direcaoOrdem === 'asc'
                ? dateTimeA.localeCompare(dateTimeB)
                : dateTimeB.localeCompare(dateTimeA);
        });

        paginaAtual = 1;
        renderizarResumo();
        renderizarPagina();
    }

    filtroNome.addEventListener('input', aplicarFiltrosEOrdenacao);
    filtroCpf.addEventListener('input', aplicarFiltrosEOrdenacao);
    filtroData.addEventListener('change', aplicarFiltrosEOrdenacao);
    ordemData.addEventListener('change', aplicarFiltrosEOrdenacao);

    function renderizarResumo() {
        if (!relatorioFinal) return;

        const totalFiltrado = registrosFiltrados.length;
        const incFiltrado = registrosFiltrados.filter(r => r.operacao === 'Inclusão').length;
        const altFiltrado = registrosFiltrados.filter(r => r.operacao === 'Alteração').length;
        const excFiltrado = registrosFiltrados.filter(r => r.operacao === 'Exclusão').length;

        resumoValores.innerHTML = `
            <div style="width: 100%; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                Total do Arquivo: <strong>${todosRegistros.length}</strong> registros
                <span style="color: #bbb; margin: 0 6px;">|</span>
                <span style="color: #28a745;">Inclusões: ${relatorioFinal.porOperacao['Inclusão'] || 0}</span>
                <span style="color: #bbb; margin: 0 6px;">|</span>
                <span style="color: #fd7e14;">Alterações: ${relatorioFinal.porOperacao['Alteração'] || 0}</span>
                <span style="color: #bbb; margin: 0 6px;">|</span>
                <span style="color: #dc3545;">Exclusões: ${relatorioFinal.porOperacao['Exclusão'] || 0}</span>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; width: 100%;">
                <div class="card-filtro-op todos ${operacaoSelecionada === 'Todas' ? 'ativo' : ''}" data-op="Todas">
                    Encontrados na Busca: <strong>${totalFiltrado}</strong>
                </div>
                <div class="card-filtro-op inclusao ${operacaoSelecionada === 'Inclusão' ? 'ativo' : ''}" data-op="Inclusão" style="color: #28a745;">
                    Inclusões: <strong>${incFiltrado}</strong>
                </div>
                <div class="card-filtro-op alteracao ${operacaoSelecionada === 'Alteração' ? 'ativo' : ''}" data-op="Alteração" style="color: #fd7e14;">
                    Alterações: <strong>${altFiltrado}</strong>
                </div>
                <div class="card-filtro-op exclusao ${operacaoSelecionada === 'Exclusão' ? 'ativo' : ''}" data-op="Exclusão" style="color: #dc3545;">
                    Exclusões: <strong>${excFiltrado}</strong>
                </div>
            </div>
        `;

        resumoValores.querySelectorAll('.card-filtro-op').forEach(btn => {
            btn.addEventListener('click', () => {
                operacaoSelecionada = btn.getAttribute('data-op');
                aplicarFiltrosEOrdenacao();
            });
        });
    }

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
            tabelaCorpo.innerHTML = `<tr><td colspan="5" style="text-align: center;">Nenhum registro encontrado.</td></tr>`;
        } else {
            const datasUnicas = [...new Set(registrosFiltrados.map(r => r.dataHora))];

            if (registrosPagina.length === 0) {
                tabelaCorpo.innerHTML = `<tr><td colspan="5" style="text-align: center;">Nenhum registro encontrado.</td></tr>`;
            } else {
                registrosPagina.forEach(reg => {
                    const tr = document.createElement('tr');

                    // Aplica a regra de zebra baseada no agrupamento da data
                    const isZebra = datasUnicas.indexOf(reg.dataHora) % 2 !== 0;
                    if (isZebra) {
                        tr.classList.add('linha-zebra');
                    }

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

    function renderizarAjustesRelogio(ajustes) {
        const tabelaAjustes = document.getElementById('tabelaCorpoAjustes');
        const qtdAjustes = document.getElementById('qtdAjustes');
        tabelaAjustes.innerHTML = '';

        if (qtdAjustes) qtdAjustes.textContent = ajustes.length;

        if (ajustes.length === 0) {
            tabelaAjustes.innerHTML = `<tr><td colspan="3" style="text-align: center;">Sem eventos de ajuste.</td></tr>`;
            return;
        }

        ajustes.forEach(a => {
            const tr = document.createElement('tr');
            const formatarData = (dStr) => {
                if (!dStr || !dStr.includes('-')) return dStr;
                const p = dStr.split('-');
                return `${p[2]}/${p[1]}/${p[0]}`;
            };

            tr.innerHTML = `
                <td style="color: #dc3545; font-weight: 600;">${formatarData(a.dataAntes)} ${a.horaAntes}</td>
                <td style="color: #28a745; font-weight: 600;">${formatarData(a.dataDepois)} ${a.horaDepois}</td>
                <td>${a.cpfResponsavel}</td>
            `;
            tabelaAjustes.appendChild(tr);
        });
    }


    selectTamanhoPaginaEventos.addEventListener('change', (event) => {
        registrosPorPaginaEventos = parseInt(event.target.value);
        paginaAtualEventos = 1;
        renderizarPaginaEventos();
    });

    btnAnteriorEventos.addEventListener('click', () => {
        if (paginaAtualEventos > 1) {
            paginaAtualEventos--;
            renderizarPaginaEventos();
        }
    });

    btnProximoEventos.addEventListener('click', () => {
        const totalPaginas = Math.ceil(todosEventos.length / registrosPorPaginaEventos);
        if (paginaAtualEventos < totalPaginas) {
            paginaAtualEventos++;
            renderizarPaginaEventos();
        }
    });

    function renderizarPaginaEventos() {
        const tabelaEventos = document.getElementById('tabelaCorpoEventos');
        if (!tabelaEventos) return;
        tabelaEventos.innerHTML = '';

        if (qtdEventos) qtdEventos.textContent = todosEventos.length;

        if (todosEventos.length === 0) {
            tabelaEventos.innerHTML = `<tr><td colspan="3" style="text-align: center;">Sem eventos registrados.</td></tr>`;
            controlesPaginacaoEventos.style.display = 'none';
            return;
        }

        controlesPaginacaoEventos.style.display = 'flex';

        const totalPaginas = Math.ceil(todosEventos.length / registrosPorPaginaEventos);
        const inicio = (paginaAtualEventos - 1) * registrosPorPaginaEventos;
        const fim = inicio + registrosPorPaginaEventos;
        const eventosPagina = todosEventos.slice(inicio, fim);

        // Mapeia todas as datas únicas para garantir que a cor (Zebra) seja consistente entre as páginas
        const datasUnicas = [...new Set(todosEventos.map(e => e.dataHora.split(' ')[0]))];

        eventosPagina.forEach(e => {
            const tr = document.createElement('tr');

            // Pega apenas a data e verifica se o índice dela é par ou ímpar
            const dataSomente = e.dataHora.split(' ')[0];
            const isZebra = datasUnicas.indexOf(dataSomente) % 2 !== 0;

            if (isZebra) {
                tr.classList.add('linha-zebra');
            }

            tr.innerHTML = `
                <td>${e.dataHora}</td>
                <td style="font-weight: bold; color: var(--color-primary-base);">Tipo ${e.codigo}</td>
                <td>${e.descricao}</td>
            `;
            tabelaEventos.appendChild(tr);
        });

        infoPaginaEventos.innerText = `Página ${paginaAtualEventos} de ${totalPaginas || 1}`;
        btnAnteriorEventos.disabled = paginaAtualEventos === 1;
        btnProximoEventos.disabled = paginaAtualEventos >= totalPaginas || totalPaginas === 0;
    }


    btnDownload.addEventListener('click', () => {
        if (!relatorioFinal) return;
        const blob = new Blob([JSON.stringify(relatorioFinal, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_afd_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});