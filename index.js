const { Worker, isMainThread, parentPort } = require('worker_threads');
const fs = require('fs');
const readline = require('readline');
const os = require('os');
const path = require('path');

// --- THREAD PRINCIPAL ---
if (isMainThread) {
    const arquivoAfd = process.argv[2];

    if (!arquivoAfd) {
        console.error('Uso incorreto. Execute: leitor_afd.exe <caminho_do_arquivo.txt>');
        process.exit(1);
    }

    const numWorkers = Math.max(1, os.cpus().length - 1); // Deixa 1 núcleo livre
    const workers = [];
    let trabalhadoresAtivos = 0;
    
    // Armazena os dados consolidados
    const relatorioFinal = {
        porData: {},
        porCPF: {},
        porOperacao: { 'Inclusão': 0, 'Alteração': 0, 'Exclusão': 0 }
    };

    console.log(`Iniciando leitura do AFD usando ${numWorkers} workers...`);

    // Inicializa os workers
    for (let i = 0; i < numWorkers; i++) {
        const worker = new Worker(__filename);
        worker.on('message', (resultadoParcial) => {
            mesclarResultados(resultadoParcial);
        });
        worker.on('error', (erro) => console.error('Erro no worker:', erro));
        worker.on('exit', () => {
            trabalhadoresAtivos--;
            if (trabalhadoresAtivos === 0) {
                gerarSaidaParaSuporte();
            }
        });
        workers.push(worker);
        trabalhadoresAtivos++;
    }

    // Leitura do arquivo e envio em lotes
    const rl = readline.createInterface({
        input: fs.createReadStream(arquivoAfd),
        crlfDelay: Infinity
    });

    let lote = [];
    let workerIndex = 0;
    const TAMANHO_LOTE = 20000;

    rl.on('line', (linha) => {
        // Envia apenas as linhas do Tipo 5 para economizar memória e tráfego
        if (linha.length >= 50 && linha.charAt(9) === '5') {
            lote.push(linha);
        }

        if (lote.length >= TAMANHO_LOTE) {
            workers[workerIndex].postMessage(lote);
            lote = [];
            workerIndex = (workerIndex + 1) % numWorkers;
        }
    });

    rl.on('close', () => {
        if (lote.length > 0) {
            workers[workerIndex].postMessage(lote);
        }
        // Avisa os workers que o arquivo acabou
        workers.forEach(w => w.postMessage('FIM'));
    });

    function mesclarResultados(parcial) {
        // Mescla datas
        for (const [data, registros] of Object.entries(parcial.porData)) {
            if (!relatorioFinal.porData[data]) relatorioFinal.porData[data] = [];
            relatorioFinal.porData[data].push(...registros);
        }
        // Mescla CPFs
        for (const [cpf, registros] of Object.entries(parcial.porCPF)) {
            if (!relatorioFinal.porCPF[cpf]) relatorioFinal.porCPF[cpf] = [];
            relatorioFinal.porCPF[cpf].push(...registros);
        }
        // Mescla Contadores de Operação
        for (const [op, qtd] of Object.entries(parcial.porOperacao)) {
            if (relatorioFinal.porOperacao[op] !== undefined) {
                relatorioFinal.porOperacao[op] += qtd;
            }
        }
    }

    function gerarSaidaParaSuporte() {
        const nomeArquivoSaida = `Analise_AFD_${Date.now()}.json`;
        
        fs.writeFileSync(nomeArquivoSaida, JSON.stringify(relatorioFinal, null, 2), 'utf8');
        
        console.log('\n--- RESUMO DA ANÁLISE ---');
        console.log(`Total de Inclusões: ${relatorioFinal.porOperacao['Inclusão']}`);
        console.log(`Total de Alterações: ${relatorioFinal.porOperacao['Alteração']}`);
        console.log(`Total de Exclusões:  ${relatorioFinal.porOperacao['Exclusão']}`);
        console.log('\nAnálise concluída com sucesso!');
        console.log(`Os dados agrupados foram salvos no arquivo: ${nomeArquivoSaida}`);
        console.log('Esse arquivo contém os detalhes agrupados por Data e por CPF para facilitar as auditorias.');
        process.exit(0);
    }
} 
// --- WORKER THREAD ---
else {
    let processando = false;

    parentPort.on('message', (mensagem) => {
        if (mensagem === 'FIM') {
            process.exit(0);
        }

        const linhas = mensagem;
        const resultadoLocal = {
            porData: {},
            porCPF: {},
            porOperacao: { 'Inclusão': 0, 'Alteração': 0, 'Exclusão': 0 }
        };

        for (const linha of linhas) {
            try {
                // Layout baseado na Portaria 671 (Slide)
                const nsr = linha.substring(0, 9);
                // tipo = linha.substring(9, 10); // Já filtrado no main (sempre '5')
                const dataHora = linha.substring(10, 34); // ex: 2025-01-06T16:16:00-0300
                const dataStr = dataHora.substring(0, 10);
                const codigoOp = linha.substring(34, 35);
                const cpf = linha.substring(35, 46);
                const nomeEPis = linha.substring(46).trim(); 

                let operacao = 'Desconhecida';
                if (codigoOp === 'I') operacao = 'Inclusão';
                else if (codigoOp === 'A') operacao = 'Alteração';
                else if (codigoOp === 'E') operacao = 'Exclusão';

                const registro = {
                    nsr,
                    dataHora,
                    operacao,
                    cpf,
                    detalhes: nomeEPis
                };

                // Agrupamentos
                if (!resultadoLocal.porData[dataStr]) resultadoLocal.porData[dataStr] = [];
                resultadoLocal.porData[dataStr].push(registro);

                if (!resultadoLocal.porCPF[cpf]) resultadoLocal.porCPF[cpf] = [];
                resultadoLocal.porCPF[cpf].push(registro);

                if (resultadoLocal.porOperacao[operacao] !== undefined) {
                    resultadoLocal.porOperacao[operacao]++;
                }
            } catch (err) {
                // Ignora linhas mal formatadas silenciosamente para não poluir o log do suporte
            }
        }

        // Devolve os resultados agregados para a thread principal
        parentPort.postMessage(resultadoLocal);
    });
}