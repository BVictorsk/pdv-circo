document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const resumoContent = document.getElementById('resumo-content');
    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (!loggedInUser) {
        resumoContent.innerHTML = '<p style="color: var(--red-error);">Erro: Usuário não logado. Por favor, faça o login novamente.</p>';
        return;
    }

    userDisplay.textContent = loggedInUser;

    if (typeof db === 'undefined' || !db) {
        resumoContent.innerHTML = '<p style="color: var(--red-error);">Erro de conexão com o banco de dados.</p>';
        return;
    }

    // Função para formatar o input de moeda
    const formatCurrencyInput = (input) => {
        let value = input.value.replace(/\D/g, ''); // CORREÇÃO: Removido um nível de escape de \D
        value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',');
        if (value === 'NaN') value = '0,00';
        input.value = value;
    };

    // Função para converter string de moeda para float
    const parseCurrency = (value) => {
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    };

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today;

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfDay = tomorrow;

        const vendasSnapshot = await db.collection('vendas')
            .where('operador', '==', loggedInUser)
            .where('timestamp', '>=', startOfDay)
            .where('timestamp', '<', endOfDay)
            .get();

        if (vendasSnapshot.empty) {
            resumoContent.innerHTML = '<p>Nenhuma venda encontrada para hoje.</p>';
            document.getElementById('conferencia-container').style.display = 'none';
            return;
        }

        let totalVendas = 0;
        let totalItens = 0;
        const totaisPorPagamento = { pix: 0, credito: 0, debito: 0, dinheiro: 0, brinde: 0 };
        const produtosVendidos = {};

        vendasSnapshot.forEach(doc => {
            const venda = doc.data();

            if (venda.tipo !== 'BRINDE') {
                totalVendas += venda.valorTotal || 0;
            }

            if (venda.itens && Array.isArray(venda.itens)) {
                venda.itens.forEach(item => {
                    const quantidade = item.quantidade || 0;
                    totalItens += quantidade;
                    
                    const nome = item.nome;
                    const preco = item.preco || 0;

                    if (produtosVendidos[nome]) {
                        produtosVendidos[nome].quantidade += quantidade;
                        produtosVendidos[nome].valorTotal += preco * quantidade;
                    } else {
                        produtosVendidos[nome] = {
                            quantidade: quantidade,
                            valorTotal: preco * quantidade
                        };
                    }
                });
            }

            if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
                venda.pagamentos.forEach(pagamento => {
                    const tipo = pagamento.tipo.toLowerCase();
                    const valor = pagamento.valor || 0;
                    if (tipo.includes('pix')) totaisPorPagamento.pix += valor;
                    else if (tipo.includes('credito')) totaisPorPagamento.credito += valor;
                    else if (tipo.includes('debito')) totaisPorPagamento.debito += valor;
                    else if (tipo.includes('dinheiro')) totaisPorPagamento.dinheiro += valor;
                    else if (tipo.includes('brinde')) totaisPorPagamento.brinde += valor;
                });
            }
        });

        const trocoInicial = parseFloat(sessionStorage.getItem('trocoInicial') || '0');
        const totalDinheiroComTroco = totaisPorPagamento.dinheiro + trocoInicial;
        const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        resumoContent.innerHTML = `
            <div class="fechamento-info" style="margin-bottom: 20px; text-align: center; font-size: 0.9em; color: var(--text-muted);">
                <p><strong>UNIDADE SP</strong></p>
                <p>FECHAMENTO CAIXA</p>
                <p>Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                <p>Operador: <strong>${loggedInUser.toUpperCase()}</strong></p>
            </div>
            <div class="carrinho-total" style="border-top: 1px dashed var(--border-color); padding-top: 15px; margin-bottom: 15px;">
                <span>TOTAL DE ITENS:</span>
                <span class="valor">${totalItens}</span>
            </div>
            <div class="carrinho-total" style="font-size: 1.4em;">
                <span>TOTAL DE VENDAS:</span>
                <span class="valor">${formatarPreco(totalVendas)}</span>
            </div>
            <div class="fechamento-detalhes" style="margin-top: 25px; border-top: 1px dashed var(--border-color); padding-top: 15px;">
                <h3 style="text-align: center; margin-bottom: 20px;">DETALHES POR PAGAMENTO</h3>
                <div class="carrinho-total"><span>PIX:</span><span class="valor">${formatarPreco(totaisPorPagamento.pix)}</span></div>
                <div class="carrinho-total"><span>CRÉDITO:</span><span class="valor">${formatarPreco(totaisPorPagamento.credito)}</span></div>
                <div class="carrinho-total"><span>DÉBITO:</span><span class="valor">${formatarPreco(totaisPorPagamento.debito)}</span></div>
                <div class="carrinho-total"><span>DINHEIRO (Vendas):</span><span class="valor">${formatarPreco(totaisPorPagamento.dinheiro)}</span></div>
                ${totaisPorPagamento.brinde > 0 ? `<div class="carrinho-total" style="color: var(--blue-info);"><span>CORTESIAS (Brindes):</span><span class="valor">${formatarPreco(totaisPorPagamento.brinde)}</span></div>` : ''}
            </div>
            <div style="border-top: 1px solid var(--border-color); margin: 15px 0; padding-top: 15px;">
                <div class="carrinho-total" style="font-size: 1.1em;"><span>Troco Inicial:</span><span class="valor">${formatarPreco(trocoInicial)}</span></div>
                <div class="carrinho-total" style="font-size: 1.2em; font-weight: bold;"><span>DINHEIRO EM CAIXA:</span><span class="valor">${formatarPreco(totalDinheiroComTroco)}</span></div>
            </div>
        `;

        // Lógica de Conferência
        const sistemaPix = document.getElementById('sistema-pix');
        const sistemaCredito = document.getElementById('sistema-credito');
        const sistemaDebito = document.getElementById('sistema-debito');
        const sistemaDinheiro = document.getElementById('sistema-dinheiro');

        sistemaPix.textContent = formatarPreco(totaisPorPagamento.pix);
        sistemaCredito.textContent = formatarPreco(totaisPorPagamento.credito);
        sistemaDebito.textContent = formatarPreco(totaisPorPagamento.debito);
        sistemaDinheiro.textContent = formatarPreco(totaisPorPagamento.dinheiro);

        const inputsApurados = {
            pix: document.getElementById('apurado-pix'),
            credito: document.getElementById('apurado-credito'),
            debito: document.getElementById('apurado-debito'),
            dinheiro: document.getElementById('apurado-dinheiro')
        };

        const diferencaSpans = {
            pix: document.getElementById('diferenca-pix'),
            credito: document.getElementById('diferenca-credito'),
            debito: document.getElementById('diferenca-debito'),
            dinheiro: document.getElementById('diferenca-dinheiro')
        };

        function calcularDiferenca(tipo) {
            const valorApurado = parseCurrency(inputsApurados[tipo].value);
            const valorSistema = totaisPorPagamento[tipo];
            const diferenca = valorApurado - valorSistema;

            const spanDiferenca = diferencaSpans[tipo];
            spanDiferenca.textContent = formatarPreco(diferenca);
            spanDiferenca.classList.remove('positiva', 'negativa');

            if (diferenca > 0) {
                spanDiferenca.classList.add('positiva');
            } else if (diferenca < 0) {
                spanDiferenca.classList.add('negativa');
            }
        }

        Object.keys(inputsApurados).forEach(tipo => {
            inputsApurados[tipo].addEventListener('input', (e) => {
                formatCurrencyInput(e.target);
                calcularDiferenca(tipo);
            });
        });

        // Lógica de Impressão
        const btnImprimir = document.getElementById('btn-imprimir');
        btnImprimir.addEventListener('click', () => {
            if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
                imprimirFechamentoTermica(); 
            } else {
                console.warn("Interface AndroidPrint não encontrada. Usando método de impressão web.");
                imprimirFechamentoViaNavegador();
            }
        });

        function imprimirFechamentoTermica() {
            console.log("Iniciando impressão do fechamento na impressora térmica...");

            const dataHora = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
            const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;
            const linhaSeparadora = '--------------------------------\\n';
            const linhaSeparadoraDupla = '================================\\n';

            const alinharTexto = (esquerda, direita) => {
                const larguraLinha = 32;
                const espacos = larguraLinha - esquerda.length - direita.length;
                return esquerda + ' '.repeat(Math.max(0, espacos)) + direita + '\\n';
            };
            
            let textoParaImpressao = '';
            textoParaImpressao += '         UNIDADE SP\\n';
            textoParaImpressao += '      FECHAMENTO DE CAIXA\\n';
            textoParaImpressao += linhaSeparadora;
            textoParaImpressao += `Data: ${dataHora}\\n`;
            textoParaImpressao += `Operador: ${loggedInUser.toUpperCase()}\\n`;
            textoParaImpressao += linhaSeparadora;

            textoParaImpressao += alinharTexto('TOTAL DE ITENS:', totalItens.toString());
            textoParaImpressao += alinharTexto('TOTAL DE VENDAS:', formatarPreco(totalVendas));

            const sortedProdutos = Object.keys(produtosVendidos).sort();
            if (sortedProdutos.length > 0) {
                textoParaImpressao += linhaSeparadora;
                textoParaImpressao += '       PRODUTOS VENDIDOS\\n';
                textoParaImpressao += linhaSeparadora;
                sortedProdutos.forEach(nome => {
                    const produto = produtosVendidos[nome];
                    const nomeProd = `${produto.quantidade}x ${nome}`;
                    textoParaImpressao += alinharTexto(nomeProd, formatarPreco(produto.valorTotal));
                });
            }

            textoParaImpressao += linhaSeparadora;
            textoParaImpressao += '      PAGAMENTOS (SISTEMA)\\n';
            textoParaImpressao += linhaSeparadora;
            textoParaImpressao += alinharTexto('PIX:', formatarPreco(totaisPorPagamento.pix));
            textoParaImpressao += alinharTexto('CREDITO:', formatarPreco(totaisPorPagamento.credito));
            textoParaImpressao += alinharTexto('DEBITO:', formatarPreco(totaisPorPagamento.debito));
            textoParaImpressao += alinharTexto('DINHEIRO (Vendas):', formatarPreco(totaisPorPagamento.dinheiro));
            if (totaisPorPagamento.brinde > 0) {
                textoParaImpressao += alinharTexto('CORTESIAS:', formatarPreco(totaisPorPagamento.brinde));
            }

            textoParaImpressao += linhaSeparadora;
            textoParaImpressao += alinharTexto('Troco Inicial:', formatarPreco(trocoInicial));
            textoParaImpressao += alinharTexto('DINHEIRO EM CAIXA:', formatarPreco(totalDinheiroComTroco));
            
            const apuradoPix = parseCurrency(inputsApurados.pix.value);
            const apuradoCredito = parseCurrency(inputsApurados.credito.value);
            const apuradoDebito = parseCurrency(inputsApurados.debito.value);
            const apuradoDinheiro = parseCurrency(inputsApurados.dinheiro.value);

            textoParaImpressao += linhaSeparadoraDupla;
            textoParaImpressao += '     CONFERENCIA DE VALORES\\n';
            textoParaImpressao += linhaSeparadoraDupla;

            // Conferência PIX
            textoParaImpressao += 'PIX\\n';
            textoParaImpressao += alinharTexto('  Sistema:', formatarPreco(totaisPorPagamento.pix));
            textoParaImpressao += alinharTexto('  Apurado:', formatarPreco(apuradoPix));
            textoParaImpressao += alinharTexto('  Diferenca:', diferencaSpans.pix.textContent);
            textoParaImpressao += '\\n';

            // Conferência CRÉDITO
            textoParaImpressao += 'CREDITO\\n';
            textoParaImpressao += alinharTexto('  Sistema:', formatarPreco(totaisPorPagamento.credito));
            textoParaImpressao += alinharTexto('  Apurado:', formatarPreco(apuradoCredito));
            textoParaImpressao += alinharTexto('  Diferenca:', diferencaSpans.credito.textContent);
            textoParaImpressao += '\\n';

            // Conferência DÉBITO
            textoParaImpressao += 'DEBITO\\n';
            textoParaImpressao += alinharTexto('  Sistema:', formatarPreco(totaisPorPagamento.debito));
            textoParaImpressao += alinharTexto('  Apurado:', formatarPreco(apuradoDebito));
            textoParaImpressao += alinharTexto('  Diferenca:', diferencaSpans.debito.textContent);
            textoParaImpressao += '\\n';

            // Conferência DINHEIRO
            textoParaImpressao += 'DINHEIRO\\n';
            textoParaImpressao += alinharTexto('  Sistema:', formatarPreco(totaisPorPagamento.dinheiro));
            textoParaImpressao += alinharTexto('  Apurado:', formatarPreco(apuradoDinheiro));
            textoParaImpressao += alinharTexto('  Diferenca:', diferencaSpans.dinheiro.textContent);
            textoParaImpressao += '\\n\\n\\n'; 

            window.AndroidPrint.print(textoParaImpressao);
        }

        function imprimirFechamentoViaNavegador() {
            window.print();
        }

    } catch (error) {
        console.error('Erro ao buscar ou processar vendas:', error);
        resumoContent.innerHTML = `<p style='color: var(--red-error);'>Ocorreu um erro ao gerar o resumo. Verifique o console para mais detalhes.</p>`;
        document.getElementById('conferencia-container').style.display = 'none';
    }
});
