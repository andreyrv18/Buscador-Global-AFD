document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('arquivoAfd');
    const statusDiv = document.getElementById('status');
    const sessaoResultados = document.getElementById('sessaoResultados');
    const resumoValores = document.getElementById('resumoValores');
    const tabelaCorpo = document.getElementById('tabelaCorpo');
    const btnDownload = document.getElementById('btnDownload');

    let relatorioFinal = null;

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Limpa a tela para um novo arquivo
        sessaoResultados.style.display = 'none';
        tabelaCorpo.innerHTML = '';
        statusDiv.innerHTML = "Processando arquivo... ⏳ Isso pode levar alguns segundos dependendo do tamanho.";

        const worker = new Worker('worker.js');
        worker.postMessage(file);

        worker.onmessage = (e) => {
            if (e.data.erro) {
                statusDiv.innerHTML = `<span style="color: red;">Erro: ${e.data.erro}</span>`;
                return;
            }

            relatorioFinal = e.data.resultado;

            // 1. Atualiza o painel de Resumo
            resumoValores.innerHTML = `
                <strong>Total Encontrado:</strong><br>
                <span style="color: #28a745;">Inclusões: ${relatorioFinal.porOperacao['Inclusão']}</span> | 
                <span style="color: #fd7e14;">Alterações: ${relatorioFinal.porOperacao['Alteração']}</span> | 
                <span style="color: #dc3545;">Exclusões: ${relatorioFinal.porOperacao['Exclusão']}</span>
            `;

            // 2. Preenche a tabela iterando pelas datas
            for (const [data, registros] of Object.entries(relatorioFinal.porData)) {
                registros.forEach(reg => {
                    const tr = document.createElement('tr');

                    // Define a classe CSS de cor baseado na operação
                    let classeOp = '';
                    if (reg.operacao === 'Inclusão') classeOp = 'op-inclusao';
                    if (reg.operacao === 'Alteração') classeOp = 'op-alteracao';
                    if (reg.operacao === 'Exclusão') classeOp = 'op-exclusao';

                    // Formata a exibição da hora (pega apenas a parte da hora da string ISO)
                    const horaFormatada = reg.dataHora.substring(11, 19);

                    // Formata a data (de YYYY-MM-DD para DD/MM/YYYY) para ficar mais amigável
                    const partesData = data.split('-');
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

            statusDiv.innerHTML = ""; // Limpa a mensagem de carregamento
            sessaoResultados.style.display = 'block'; // Mostra a tabela e botões
            worker.terminate();
        };
    });

    // Função para baixar o JSON
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