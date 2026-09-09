self.onmessage = function (event) {
    const file = event.data;
    const reader = new FileReader();

    reader.onload = function (e) {
        const conteudo = e.target.result;
        const linhas = conteudo.split(/\r?\n/);

        const relatorio = {
            porData: {},
            porCPF: {}, // Funciona tanto para CPF (671) quanto PIS (1510/595)
            porOperacao: { 'Inclusão': 0, 'Alteração': 0, 'Exclusão': 0 },
            ajustesRelogio: [] // Armazena eventos de ajuste do relógio (Tipo 4)
        };

        for (const linha of linhas) {
            // Filtra apenas as linhas do Tipo 5 de qualquer portaria (Posição 10)[cite: 1, 2, 3]

            const tipoRegistro = linha.charAt(9);
            if (tipoRegistro === '4') {
                try {
                    let dataAntes, horaAntes, dataDepois, horaDepois, cpfResponsavel;
                    if (linha.length >= 50 && linha.charAt(10) === 'T') {
                        // Layout Portaria 671 (Formato ISO: AAAA-MM-DDThh:mm:ss...)
                        dataAntes = linha.substring(10, 20);
                        horaAntes = linha.substring(21, 29);
                        dataDepois = linha.substring(35, 45);
                        horaDepois = linha.substring(46, 54);
                        cpfResponsavel = "N/A";
                    } else {
                        // Layout Portarias 1510 / 595 (Formatos ddmmaaaa + hhmm)
                        const dAntes = linha.substring(10, 18);
                        const hAntes = linha.substring(18, 22);
                        const dDepois = linha.substring(22, 30);
                        const hDepois = linha.substring(30, 34);

                        dataAntes = `${dAntes.substring(4, 8)}-${dAntes.substring(2, 4)}-${dAntes.substring(0, 2)}`;
                        horaAntes = `${hAntes.substring(0, 2)}:${hAntes.substring(2, 4)}:00`;

                        dataDepois = `${dDepois.substring(4, 8)}-${dDepois.substring(2, 4)}-${dDepois.substring(0, 2)}`;
                        horaDepois = `${hDepois.substring(0, 2)}:${hDepois.substring(2, 4)}:00`;

                        cpfResponsavel = linha.length >= 45 ? linha.substring(34, 45).trim() : "N/A";
                    }

                    relatorio.ajustesRelogio.push({
                        dataAntes,
                        horaAntes,
                        dataDepois,
                        horaDepois,
                        cpfResponsavel
                    });
                } catch (err) {
                    // Ignora linha corrompida
                }
                continue;
            }


            if (linha.length >= 50 && tipoRegistro === '5') {
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

    reader.onerror = function () {
        self.postMessage({ erro: "Falha ao ler o arquivo selecionado." });
    };

    reader.readAsText(file);
};