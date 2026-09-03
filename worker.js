self.onmessage = function(event) {
    const file = event.data;
    const reader = new FileReader();

    reader.onload = function(e) {
        const conteudo = e.target.result;
        const linhas = conteudo.split(/\r?\n/);
        
        const relatorio = {
            porData: {},
            porCPF: {},
            porOperacao: { 'Inclusão': 0, 'Alteração': 0, 'Exclusão': 0 }
        };

        for (const linha of linhas) {
            // Filtra apenas as linhas do Tipo 5 da Portaria 671
            if (linha.length >= 50 && linha.charAt(9) === '5') {
                try {
                    const nsr = linha.substring(0, 9);
                    const dataHora = linha.substring(10, 34); 
                    const dataStr = dataHora.substring(0, 10);
                    const codigoOp = linha.substring(34, 35);
                    const cpf = linha.substring(35, 46);
                    const nomeEPis = linha.substring(46).trim(); 

                    let operacao = 'Desconhecida';
                    if (codigoOp === 'I') operacao = 'Inclusão';
                    else if (codigoOp === 'A') operacao = 'Alteração';
                    else if (codigoOp === 'E') operacao = 'Exclusão';

                    const registro = { nsr, dataHora, operacao, cpf, detalhes: nomeEPis };

                    // Agrupamentos
                    if (!relatorio.porData[dataStr]) relatorio.porData[dataStr] = [];
                    relatorio.porData[dataStr].push(registro);

                    if (!relatorio.porCPF[cpf]) relatorio.porCPF[cpf] = [];
                    relatorio.porCPF[cpf].push(registro);

                    if (relatorio.porOperacao[operacao] !== undefined) {
                        relatorio.porOperacao[operacao]++;
                    }
                } catch (err) {
                    // Ignora silenciosamente erros de linha mal formatada
                }
            }
        }

        // Devolve o resultado pronto para o popup.js
        self.postMessage({ resultado: relatorio });
    };

    reader.onerror = function() {
        self.postMessage({ erro: "Falha ao ler o arquivo selecionado." });
    };

    // Lê o arquivo como texto
    reader.readAsText(file);
};