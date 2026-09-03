self.onmessage = function(event) {
    const file = event.data;
    const reader = new FileReader();

    reader.onload = function(e) {
        const conteudo = e.target.result;
        const linhas = conteudo.split(/\r?\n/);
        
        const relatorio = {
            porData: {},
            porCPF: {}, // Funciona tanto para CPF (671) quanto PIS (1510/595)
            porOperacao: { 'Inclusão': 0, 'Alteração': 0, 'Exclusão': 0 }
        };

        for (const linha of linhas) {
            // Filtra apenas as linhas do Tipo 5 de qualquer portaria (Posição 10)[cite: 1, 2, 3]
            if (linha.length >= 50 && linha.charAt(9) === '5') {
                try {
                    let dataStr, horaStr, codigoOp, identificador, nome;

                    // Detecta o Layout verificando onde o código da operação (I, A, E) está posicionado.
                    // Na 671 fica no índice 34 (posição 35)[cite: 1].
                    // Na 1510/595 fica no índice 22 (posição 23)[cite: 2, 3].
                    if (linha.charAt(34) === 'I' || linha.charAt(34) === 'A' || linha.charAt(34) === 'E') {
                        
                        // --- LAYOUT PORTARIA 671 ---
                        const dataHora = linha.substring(10, 34); // Formato: AAAA-MM-ddThh:mm...[cite: 1]
                        dataStr = dataHora.substring(0, 10);
                        horaStr = dataHora.substring(11, 19);
                        codigoOp = linha.substring(34, 35); // Posição 35[cite: 1]
                        identificador = linha.substring(35, 47).trim(); // CPF na posição 36 a 47[cite: 1]
                        nome = linha.substring(47, 99).trim(); // Nome na posição 48 a 99[cite: 1]
                        
                    } 
                    else if (linha.charAt(22) === 'I' || linha.charAt(22) === 'A' || linha.charAt(22) === 'E') {
                        
                        // --- LAYOUT PORTARIAS 1510 e 595 ---
                        const dataBruta = linha.substring(10, 18); // Formato: ddmmaaaa[cite: 2, 3]
                        const horaBruta = linha.substring(18, 22); // Formato: hhmm[cite: 2, 3]
                        
                        // Normaliza para o padrão AAAA-MM-DD para facilitar o agrupamento
                        dataStr = `${dataBruta.substring(4, 8)}-${dataBruta.substring(2, 4)}-${dataBruta.substring(0, 2)}`;
                        
                        // Normaliza para HH:MM:00
                        horaStr = `${horaBruta.substring(0, 2)}:${horaBruta.substring(2, 4)}:00`;

                        codigoOp = linha.substring(22, 23); // Posição 23[cite: 2, 3]
                        identificador = linha.substring(23, 35).trim(); // PIS na posição 24 a 35[cite: 2, 3]
                        nome = linha.substring(35, 87).trim(); // Nome na posição 36 a 87[cite: 2, 3]
                        
                    } else {
                        // Linha mal formatada ou operação desconhecida
                        continue; 
                    }

                    let operacao = 'Desconhecida';
                    if (codigoOp === 'I') operacao = 'Inclusão';
                    else if (codigoOp === 'A') operacao = 'Alteração';
                    else if (codigoOp === 'E') operacao = 'Exclusão';

                    const registro = { 
                        dataHora: dataStr, 
                        horaFormatada: horaStr,
                        operacao, 
                        cpfPis: identificador, 
                        detalhes: nome 
                    };

                    // Agrupamentos
                    if (!relatorio.porData[dataStr]) relatorio.porData[dataStr] = [];
                    relatorio.porData[dataStr].push(registro);

                    // Agrupamento centralizado (Serve tanto para busca por CPF quanto PIS)
                    if (!relatorio.porCPF[identificador]) relatorio.porCPF[identificador] = [];
                    relatorio.porCPF[identificador].push(registro);

                    if (relatorio.porOperacao[operacao] !== undefined) {
                        relatorio.porOperacao[operacao]++;
                    }
                } catch (err) {
                    // Ignora silenciosamente erros de linha corrompida
                }
            }
        }

        self.postMessage({ resultado: relatorio });
    };

    reader.onerror = function() {
        self.postMessage({ erro: "Falha ao ler o arquivo selecionado." });
    };

    reader.readAsText(file);
};