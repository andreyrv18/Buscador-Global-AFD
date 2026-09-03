document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('arquivoAfd');
    const statusDiv = document.getElementById('status');
    const btnDownload = document.getElementById('btnDownload');

    let relatorioFinal = null;

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        statusDiv.innerHTML = "Processando arquivo... ⏳";
        btnDownload.style.display = 'none';

        // Inicia o Web Worker nativo do navegador
        const worker = new Worker('worker.js');

        // Envia o objeto File diretamente para o Worker
        worker.postMessage(file);

        // Recebe o resultado do Worker
        worker.onmessage = (e) => {
            if (e.data.erro) {
                statusDiv.innerHTML = `<span style="color: red;">Erro: ${e.data.erro}</span>`;
                return;
            }

            relatorioFinal = e.data.resultado;
            
            statusDiv.innerHTML = `
                <strong>Análise Concluída! ✅</strong><br><br>
                Inclusões: ${relatorioFinal.porOperacao['Inclusão']}<br>
                Alterações: ${relatorioFinal.porOperacao['Alteração']}<br>
                Exclusões: ${relatorioFinal.porOperacao['Exclusão']}
            `;
            
            btnDownload.style.display = 'block';
            worker.terminate(); // Encerra o worker para liberar memória
        };
    });

    // Função para gerar o download do JSON
    btnDownload.addEventListener('click', () => {
        if (!relatorioFinal) return;

        const blob = new Blob([JSON.stringify(relatorioFinal, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analise_AFD_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});