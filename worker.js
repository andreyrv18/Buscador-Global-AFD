self.onmessage = function (event) {
    const file = event.data;
    const reader = new FileReader();

    reader.onload = function (e) {
        const conteudo = e.target.result;
        const linhas = conteudo.split(/\r?\n/);

        const cpfsNomes = {}; // Dicionário para salvar os nomes
        const relatorio = {
            porData: {},
            porCPF: {},
            porOperacao: { 'Inclusão': 0, 'Alteração': 0, 'Exclusão': 0 }, // do empregado no REP (Tipo 5)
            ajustesRelogio: [], // Ajuste do relógio (Tipo 4)
            eventosRep: [], //  Eventos sensíveis do REP (Tipo 6)
            marcacoes: [],  // Array das marcações (Tipo 3 e Tipo 7)
            porEmpregador: { 'Inclusão': 0, 'Alteração': 0 }, // da Empresa no REP (Tipo 2)

        };

        for (const linha of linhas) {
            if (linha.length < 20) continue;

            const tipoRegistro = linha.charAt(9);

            // if (tipoRegistro === '2') {
            //     let tipoIdentificadorEmpregador, identificadorEmpregador, cno, razaoSocialOuNomeEmpregador, dtInicialRegistrosArquivo, dtFinalRegistrosArquivo, dtHoraGeracaoArquivo, versaoLeiaute, identificadorFabricante, CnpjCpfFabricante, modeloRepC = '';

            //     if (linha.charAt(49) === '1' || linha.charAt(34) === '2') {

            //         const dtHoraGeracaoArquivo = linha.substring(11, 34);
            //     }

            //     let operacao = 'Desconhecida';
            //     if (tipoIdentificadorEmpregador === '1') operacao = "CNPJ";
            //     else if (tipoIdentificadorEmpregador === '2') operacao = "CPF";


            //     const id1 = tipoIdentificadorEmpregador.replace(/\D/g, '');
            //     if (id1) porEmpregador[id1] = nome;

            // }


            if (tipoRegistro === '3') {
                try {
                    const nsr = linha.substring(0, 9);
                    let dataStr, horaStr, identificador;

                    // Valida se possui o 'T' (Padrão Portaria 671 / REP-A)
                    if (linha.length >= 45 && linha.charAt(20) === 'T') {
                        dataStr = linha.substring(10, 20); // YYYY-MM-DD
                        horaStr = linha.substring(21, 29); // HH:mm:ss
                        identificador = linha.substring(34, 45).trim(); // CPF
                    } else {
                        // Fallback: Padrão antigo Portaria 1510
                        const dBruta = linha.substring(10, 18);
                        const hBruta = linha.substring(18, 22);
                        dataStr = `${dBruta.substring(4, 8)}-${dBruta.substring(2, 4)}-${dBruta.substring(0, 2)}`;
                        horaStr = `${hBruta.substring(0, 2)}:${hBruta.substring(2, 4)}:00`;
                        identificador = linha.substring(22, 34).trim(); // PIS
                    }

                    relatorio.marcacoes.push({ nsr, dataHora: dataStr, horaFormatada: horaStr, cpfPis: identificador });
                } catch (err) { }
                continue;
            }

            if (tipoRegistro === '4') {
                try {
                    let dataAntes, horaAntes, dataDepois, horaDepois, cpfResponsavel;
                    if (linha.length >= 50 && linha.charAt(10) === 'T') {
                        dataAntes = linha.substring(10, 20);
                        horaAntes = linha.substring(21, 29);
                        dataDepois = linha.substring(35, 45);
                        horaDepois = linha.substring(46, 54);
                        cpfResponsavel = "N/A";
                    } else {
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
                        dataAntes, horaAntes, dataDepois, horaDepois, cpfResponsavel
                    });
                } catch (err) { }
                continue;
            }

            if (linha.length >= 45 && tipoRegistro === '5') {
                try {
                    let dataStr, horaStr, codigoOp, identificador, nome, docAdicional = '';

                    if (linha.charAt(34) === 'I' || linha.charAt(34) === 'A' || linha.charAt(34) === 'E') {
                        // Layout Portaria 671 (REP-A / REP-C / REP-P)
                        const dataHora = linha.substring(10, 34);
                        dataStr = dataHora.substring(0, 10);
                        horaStr = dataHora.substring(11, 19);
                        codigoOp = linha.substring(34, 35);
                        identificador = linha.substring(35, 46).trim(); // CPF (11 dígitos)
                        nome = linha.substring(46, 98).trim();
                        docAdicional = linha.length >= 109 ? linha.substring(98, 109).trim() : ''; // PIS secundário
                    }
                    else if (linha.charAt(22) === 'I' || linha.charAt(22) === 'A' || linha.charAt(22) === 'E') {
                        // Layout Portaria 1510
                        const dataBruta = linha.substring(10, 18);
                        const horaBruta = linha.substring(18, 22);

                        dataStr = `${dataBruta.substring(4, 8)}-${dataBruta.substring(2, 4)}-${dataBruta.substring(0, 2)}`;
                        horaStr = `${horaBruta.substring(0, 2)}:${horaBruta.substring(2, 4)}:00`;
                        codigoOp = linha.substring(22, 23);
                        identificador = linha.substring(23, 35).trim(); // PIS (12 caracteres)
                        nome = linha.substring(35, 87).trim();
                        docAdicional = linha.length >= 98 ? linha.substring(87, 98).trim() : ''; // CPF secundário
                    } else {
                        continue;
                    }

                    let operacao = 'Desconhecida';
                    if (codigoOp === 'I') operacao = 'Inclusão';
                    else if (codigoOp === 'A') operacao = 'Alteração';
                    else if (codigoOp === 'E') operacao = 'Exclusão';

                    // Registra no dicionário tanto CPF quanto PIS apontando para o mesmo nome
                    const id1 = identificador.replace(/\D/g, '');
                    if (id1) cpfsNomes[id1] = nome;

                    if (docAdicional) {
                        const id2 = docAdicional.replace(/\D/g, '');
                        if (id2) cpfsNomes[id2] = nome;
                    }

                    const registro = {
                        dataHora: dataStr,
                        horaFormatada: horaStr,
                        operacao,
                        cpfPis: identificador,
                        detalhes: nome
                    };

                    if (!relatorio.porData[dataStr]) relatorio.porData[dataStr] = [];
                    relatorio.porData[dataStr].push(registro);

                    if (!relatorio.porCPF[identificador]) relatorio.porCPF[identificador] = [];
                    relatorio.porCPF[identificador].push(registro);

                    if (relatorio.porOperacao[operacao] !== undefined) {
                        relatorio.porOperacao[operacao]++;
                    }
                } catch (err) { }
            }

            if (tipoRegistro === '6') {
                try {
                    let dataStr, horaStr, tipoEvento;

                    // O 'T' na data ISO da Portaria 671 fica no índice 20 (ex: 2024-03-26T15:30:00)
                    if (linha.length >= 36 && linha.charAt(20) === 'T') {
                        dataStr = linha.substring(10, 20); // Captura YYYY-MM-DD
                        horaStr = linha.substring(21, 29); // Captura HH:mm:ss
                        tipoEvento = linha.substring(34, 36).trim(); // Posições 35 e 36 do layout
                    } else {
                        // Fallback para leitura de layout antigo (se houver)
                        const dBruta = linha.substring(10, 18);
                        const hBruta = linha.substring(18, 22);
                        dataStr = `${dBruta.substring(4, 8)}-${dBruta.substring(2, 4)}-${dBruta.substring(0, 2)}`;
                        horaStr = `${hBruta.substring(0, 2)}:${hBruta.substring(2, 4)}:00`;
                        tipoEvento = linha.substring(22, 24).trim();
                    }

                    const descricoesEventos = {
                        "01": "Abertura do REP por manutenção ou violação (somente REP-C)",
                        "02": "Retorno de energia (REP-C ou REP-P)",
                        "03": "Introdução de dispositivo externo de memória na Porta Fiscal (somente REP-C)",
                        "04": "Retirada de dispositivo externo de memória na Porta Fiscal (somente REP-C)",
                        "05": "Emissão da Relação Instantânea de Marcações (somente REP-C)",
                        "06": "Erro de impressão (somente REP-C)"
                    };

                    const descricaoMapeada = descricoesEventos[tipoEvento] || "Evento não mapeado/desconhecido";

                    relatorio.eventosRep.push({
                        dataHora: `${dataStr} ${horaStr}`,
                        codigo: tipoEvento,
                        descricao: descricaoMapeada
                    });
                } catch (err) { }
                continue;
            }

            if (tipoRegistro === '7') {
                try {
                    const nsr = linha.substring(0, 9);
                    let dataStr, horaStr, cpf;
                    if (linha.length >= 45 && linha.charAt(20) === 'T') {
                        dataStr = linha.substring(10, 20);
                        horaStr = linha.substring(21, 29);
                        cpf = linha.substring(34, 45).trim();
                    } else {
                        const dBruta = linha.substring(10, 18);
                        const hBruta = linha.substring(18, 22);
                        dataStr = `${dBruta.substring(4, 8)}-${dBruta.substring(2, 4)}-${dBruta.substring(0, 2)}`;
                        horaStr = `${hBruta.substring(0, 2)}:${hBruta.substring(2, 4)}:00`;
                        cpf = linha.substring(22, 33).trim();
                    }
                    relatorio.marcacoes.push({ nsr, dataHora: dataStr, horaFormatada: horaStr, cpfPis: cpf });
                } catch (err) { }
                continue;
            }
        }

        relatorio.marcacoes.forEach(m => {
            const limpoId = m.cpfPis.replace(/\D/g, '');
            let foundName = "Desconhecido (Não consta no Tipo 5)";

            if (cpfsNomes[limpoId]) {
                foundName = cpfsNomes[limpoId];
            } else {
                const strippedId = limpoId.replace(/^0+/, '');
                for (const key in cpfsNomes) {
                    if (key.replace(/^0+/, '') === strippedId) {
                        foundName = cpfsNomes[key];
                        break;
                    }
                }
            }
            m.nome = foundName;
        });

        self.postMessage({ resultado: relatorio });
    };

    reader.onerror = function () {
        self.postMessage({ erro: "Falha de I/O na leitura do arquivo." });
    };

    reader.readAsText(file);
};
